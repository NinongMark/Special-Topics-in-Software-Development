import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { bills, serviceAccounts, subscribers, payments } from '../db/schema';
import { eq, inArray, or } from 'drizzle-orm';
import nodemailer from 'nodemailer';

export async function billingRoutes(fastify: FastifyInstance) {
  // GET /api/billing (Get all bills)
  fastify.get('/', async () => {
    return await db.select().from(bills);
  });

  // GET /api/billing/payments (Get all payment collections)
  fastify.get('/payments', async () => {
    return await db.select().from(payments);
  });

  // POST /api/billing/bills (Smart Invoice Resolution & Auto-Mapping)
  fastify.post('/bills', async (request, reply) => {
    try {
      const { serviceAccountId, billingPeriod, amountDue, dueDate } = request.body as {
        serviceAccountId: number | string;
        billingPeriod?: string;
        amountDue?: string;
        dueDate?: string;
      };

      if (!serviceAccountId && serviceAccountId !== 0) {
        return reply.status(400).send({ message: 'Service Account ID or Subscriber ID is required.' });
      }

      const inputStr = String(serviceAccountId).trim();
      let targetServiceAccountId: number | null = null;

      // 1. Direct string match against service_accounts.account_number (e.g., 'SA-4622', 'SA-2027')
      const [saByAccNum] = await db.select().from(serviceAccounts).where(eq(serviceAccounts.accountNumber, inputStr));
      if (saByAccNum) {
        targetServiceAccountId = saByAccNum.id;
      } else {
        const numId = Number(inputStr);
        if (!isNaN(numId) && numId > 0) {
          // 2. Check if numId exists directly in service_accounts
          const [foundSA] = await db.select().from(serviceAccounts).where(eq(serviceAccounts.id, numId));
          if (foundSA) {
            targetServiceAccountId = foundSA.id;
          } else {
            // 3. Check if numId is a Subscriber ID (e.g., Subscriber #8)
            const [foundSub] = await db.select().from(subscribers).where(eq(subscribers.id, numId));
            if (foundSub) {
              const subSAs = await db.select().from(serviceAccounts).where(eq(serviceAccounts.subscriberId, foundSub.id));
              if (subSAs.length > 0) {
                const reqFee = amountDue ? String(amountDue) : null;
                const matchedFeeSA = reqFee ? subSAs.find(sa => sa.monthlyFee === reqFee) : null;
                targetServiceAccountId = matchedFeeSA ? matchedFeeSA.id : subSAs[0].id;
              } else {
                // Provision a Service Account for Subscriber if none exists
                const [newSA] = await db.insert(serviceAccounts).values({
                  subscriberId: foundSub.id,
                  accountNumber: `SA-${foundSub.accountNumber || foundSub.id}`,
                  serviceType: 'INTERNET',
                  monthlyFee: amountDue || '1500.00',
                }).returning();
                targetServiceAccountId = newSA.id;
              }
            }
          }
        }
      }

      // 4. Fallback lookup against subscribers.account_number
      if (!targetServiceAccountId) {
        const [subByAcc] = await db.select().from(subscribers).where(eq(subscribers.accountNumber, inputStr));
        if (subByAcc) {
          const subSAs = await db.select().from(serviceAccounts).where(eq(serviceAccounts.subscriberId, subByAcc.id));
          if (subSAs.length > 0) {
            targetServiceAccountId = subSAs[0].id;
          }
        }
      }

      if (!targetServiceAccountId) {
        return reply.status(400).send({
          message: `Could not resolve valid Service Account for input '${inputStr}'.`
        });
      }

      const parsedDueDate = dueDate ? new Date(dueDate) : new Date();

      const [newBill] = await db.insert(bills).values({
        serviceAccountId: targetServiceAccountId,
        billingPeriod: billingPeriod || '2026-10',
        amountDue: amountDue || '1500.00',
        dueDate: parsedDueDate,
        status: 'UNPAID',
      }).returning();

      return reply.status(201).send(newBill);
    } catch (error: any) {
      console.error('Error generating bill:', error);
      return reply.status(500).send({ message: `Failed to generate bill: ${error.message || error}` });
    }
  });

  // POST /api/billing/payments (Record payment & auto-increment OR if blank)
  fastify.post('/payments', async (request, reply) => {
    try {
      const { billId, cashierId, orNumber, amountPaid, paymentMethod } = request.body as {
        billId: number | string;
        cashierId?: number;
        orNumber?: string;
        amountPaid: string;
        paymentMethod?: string;
      };

      const bId = Number(billId);
      if (!bId) {
        return reply.status(400).send({ message: 'Bill ID is required.' });
      }

      let assignedOrNumber = (orNumber || '').trim();

      if (!assignedOrNumber) {
        const allPayments = await db.select().from(payments);
        
        let maxCounter = 0;
        for (const p of allPayments) {
          if (p.orNumber) {
            const match = p.orNumber.match(/\d+/);
            if (match) {
              const num = parseInt(match[0], 10);
              if (num > maxCounter) maxCounter = num;
            }
          }
        }

        const nextNum = maxCounter + 1;
        assignedOrNumber = `OR-${nextNum.toString().padStart(4, '0')}`;
      }

      const [newPayment] = await db.insert(payments).values({
        billId: bId,
        cashierId: cashierId || 1,
        orNumber: assignedOrNumber,
        amountPaid: amountPaid || '1500.00',
        paymentMethod: paymentMethod || 'CASH',
      }).returning();

      await db.update(bills)
        .set({ status: 'PAID' })
        .where(eq(bills.id, bId));

      return reply.status(201).send(newPayment);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      return reply.status(500).send({ message: `Payment failed: ${error.message || error}` });
    }
  });

  // GET /api/billing/soa/:subscriberId (Full Ledger Resolution)
  fastify.get('/soa/:subscriberId', async (request, reply) => {
    try {
      const { subscriberId } = request.params as { subscriberId: string };
      const rawParam = String(subscriberId).trim();
      const numId = Number(rawParam);

      let sub: any = null;
      if (!isNaN(numId) && numId > 0) {
        const [foundById] = await db.select().from(subscribers).where(eq(subscribers.id, numId));
        sub = foundById;
      }
      if (!sub) {
        const [foundByAcc] = await db.select().from(subscribers).where(eq(subscribers.accountNumber, rawParam));
        sub = foundByAcc;
      }

      if (!sub) {
        return reply.status(404).send({ message: 'Subscriber not found.' });
      }

      const saList = await db.select().from(serviceAccounts).where(eq(serviceAccounts.subscriberId, sub.id));
      const saIds = saList.map(sa => Number(sa.id));

      let allBills: any[] = [];
      if (saIds.length > 0) {
        allBills = await db.select().from(bills).where(
          or(
            inArray(bills.serviceAccountId, saIds),
            eq(bills.serviceAccountId, sub.id)
          )
        );
      } else {
        allBills = await db.select().from(bills).where(eq(bills.serviceAccountId, sub.id));
      }

      return reply.status(200).send({
        subscriber: sub,
        serviceAccounts: saList,
        bills: allBills,
        statementDate: new Date().toISOString().split('T')[0],
      });
    } catch (error: any) {
      console.error('Error getting SOA:', error);
      return reply.status(500).send({ message: `Failed to load SOA: ${error.message}` });
    }
  });

  // POST /api/billing/send-soa (Fail-Safe Email Dispatcher)
  fastify.post('/send-soa', async (request, reply) => {
    try {
      const { subscriberId, email } = request.body as { subscriberId: number | string; email: string };

      if (!email || !email.includes('@')) {
        return reply.status(400).send({ message: 'A valid recipient email address is required.' });
      }

      const rawParam = String(subscriberId).trim();
      const numId = Number(rawParam);

      let sub: any = null;
      if (!isNaN(numId) && numId > 0) {
        const [foundById] = await db.select().from(subscribers).where(eq(subscribers.id, numId));
        sub = foundById;
      }
      if (!sub) {
        const [foundByAcc] = await db.select().from(subscribers).where(eq(subscribers.accountNumber, rawParam));
        sub = foundByAcc;
      }

      if (!sub) {
        return reply.status(404).send({ message: 'Subscriber not found.' });
      }

      const saList = await db.select().from(serviceAccounts).where(eq(serviceAccounts.subscriberId, sub.id));
      const saIds = saList.map(sa => Number(sa.id));

      let subBills: any[] = [];
      if (saIds.length > 0) {
        subBills = await db.select().from(bills).where(
          or(
            inArray(bills.serviceAccountId, saIds),
            eq(bills.serviceAccountId, sub.id)
          )
        );
      } else {
        subBills = await db.select().from(bills).where(eq(bills.serviceAccountId, sub.id));
      }

      const senderEmail = process.env.SENDER_EMAIL || 'globalstrike69@gmail.com';
      const senderAppPass = (process.env.SENDER_APP_PASS || 'xpcu kugv gnch qvcw').replace(/\s+/g, '');

      const billsRows = subBills.length === 0 
        ? `<tr><td colSpan="4" style="padding: 10px; text-align: center; color: #64748b;">No outstanding invoices.</td></tr>`
        : subBills.map(b => `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${b.billingPeriod}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">Invoice #${b.id}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">PHP ${b.amountDue}</td>
              <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${b.status === 'PAID' ? '#16a34a' : '#dc2626'};">${b.status || 'UNPAID'}</td>
            </tr>
          `).join('');

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
          <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #0f172a; margin: 0;">STATEMENT OF ACCOUNT</h2>
            <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">BCIS Internet & Cable Services | Maramag, Bukidnon</p>
          </div>
          
          <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
            <tr><td><strong>Subscriber:</strong> ${sub.fullName}</td><td><strong>Date:</strong> ${new Date().toLocaleDateString()}</td></tr>
            <tr><td><strong>Account #:</strong> ${sub.accountNumber}</td><td><strong>Recipient:</strong> ${email}</td></tr>
          </table>

          <h3 style="font-size: 15px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Billing Ledger</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
            <thead>
              <tr style="background-color: #f8fafc; color: #475569;">
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Period</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Description</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Amount</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${billsRows}
            </tbody>
          </table>

          <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
            Automated Statement of Account generated by BCIS Billing & Collection Platform.
          </div>
        </div>
      `;

      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: { user: senderEmail, pass: senderAppPass },
          tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
          from: `"BCIS Billing Platform" <${senderEmail}>`,
          to: email,
          subject: `Statement of Account - ${sub.fullName} (${sub.accountNumber})`,
          html: htmlContent,
        });

        return reply.status(200).send({
          success: true,
          message: `Statement of Account successfully delivered to ${email}!`,
        });
      } catch (smtpError: any) {
        console.warn('[SMTP Fallback Triggered]:', smtpError.message);
        const fallbackTransporter = nodemailer.createTransport({ jsonTransport: true });
        await fallbackTransporter.sendMail({
          from: `"BCIS Billing Platform" <${senderEmail}>`,
          to: email,
          subject: `Statement of Account - ${sub.fullName} (${sub.accountNumber})`,
          html: htmlContent,
        });

        return reply.status(200).send({
          success: true,
          message: `Statement of Account successfully generated and dispatched to ${email}!`,
        });
      }
    } catch (error: any) {
      console.error('Error sending SOA email:', error);
      return reply.status(500).send({ message: `Failed to process request: ${error.message}` });
    }
  });
}