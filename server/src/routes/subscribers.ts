import { FastifyInstance } from 'fastify';
import { db } from '../db';
import { subscribers, serviceAccounts, bills, payments } from '../db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const subscriberSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
});

export async function subscriberRoutes(fastify: FastifyInstance) {
  // GET /api/subscribers
  fastify.get('/', async () => {
    return await db.select().from(subscribers);
  });

  // POST /api/subscribers
  fastify.post('/', async (request, reply) => {
    try {
      const parse = subscriberSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ 
          message: 'Validation failed', 
          errors: parse.error.format() 
        });
      }

      const { fullName, email, contactNumber, address } = parse.data;
      const generatedAccNum = `ACC-${Date.now().toString().slice(-6)}`;

      const [newSub] = await db.insert(subscribers).values({
        accountNumber: generatedAccNum,
        fullName,
        contactNumber: email || contactNumber || '09123456789',
        address: address || 'Maramag, Bukidnon',
        status: 'ACTIVE',
      }).returning();

      return reply.status(201).send(newSub);
    } catch (err: any) {
      console.error('Error creating subscriber:', err);
      return reply.status(500).send({ message: `Failed to create subscriber: ${err.message}` });
    }
  });

  // PUT /api/subscribers/:id (UPDATE SUBSCRIBER)
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const subId = Number(id);

      const parse = subscriberSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ message: 'Invalid payload', errors: parse.error.format() });
      }

      const { fullName, email, contactNumber, address } = parse.data;

      const [updatedSub] = await db.update(subscribers)
        .set({
          fullName,
          contactNumber: email || contactNumber,
          address: address || 'Maramag, Bukidnon',
        })
        .where(eq(subscribers.id, subId))
        .returning();

      if (!updatedSub) {
        return reply.status(404).send({ message: 'Subscriber not found' });
      }

      return reply.status(200).send(updatedSub);
    } catch (err: any) {
      console.error('Error updating subscriber:', err);
      return reply.status(500).send({ message: `Failed to update subscriber: ${err.message}` });
    }
  });

  // DELETE /api/subscribers/:id
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const subId = Number(id);

      const [existingSub] = await db.select().from(subscribers).where(eq(subscribers.id, subId));
      if (!existingSub) {
        return reply.status(404).send({ message: 'Subscriber not found' });
      }

      const subAccounts = await db.select().from(serviceAccounts).where(eq(serviceAccounts.subscriberId, subId));
      for (const sa of subAccounts) {
        const saBills = await db.select().from(bills).where(eq(bills.serviceAccountId, sa.id));
        for (const b of saBills) {
          await db.delete(payments).where(eq(payments.billId, b.id));
          await db.delete(bills).where(eq(bills.id, b.id));
        }
        await db.delete(serviceAccounts).where(eq(serviceAccounts.id, sa.id));
      }

      await db.delete(subscribers).where(eq(subscribers.id, subId));

      return reply.status(200).send({ success: true, message: `Subscriber #${subId} (${existingSub.fullName}) removed successfully.` });
    } catch (err: any) {
      console.error('Error removing subscriber:', err);
      return reply.status(500).send({ message: `Failed to delete subscriber: ${err.message}` });
    }
  });

  // GET /api/subscribers/service-accounts
  fastify.get('/service-accounts', async () => {
    return await db.select().from(serviceAccounts);
  });

  // POST /api/subscribers/service-accounts (CHECKS BOTH ID & ACCOUNT NUMBER)
  fastify.post('/service-accounts', async (request, reply) => {
    try {
      const { subscriberId, subscriberAccountNum, accountNumber, serviceType, monthlyFee } = request.body as {
        subscriberId?: number;
        subscriberAccountNum?: string;
        accountNumber?: string;
        serviceType: string;
        monthlyFee: string;
      };

      let targetSubId = subscriberId;
      const rawInput = (subscriberAccountNum || '').trim();

      // Look up subscriber if numeric ID wasn't passed directly
      if (!targetSubId && rawInput) {
        const isNumeric = /^\d+\$/.test(rawInput);

        if (isNumeric) {
          // If input is a number like "4", search by ID
          const [foundById] = await db.select()
            .from(subscribers)
            .where(eq(subscribers.id, Number(rawInput)));
          if (foundById) targetSubId = foundById.id;
        }

        if (!targetSubId) {
          // Otherwise search by Account Number like "ACC-629043"
          const [foundByAcc] = await db.select()
            .from(subscribers)
            .where(eq(subscribers.accountNumber, rawInput));
          if (foundByAcc) targetSubId = foundByAcc.id;
        }

        if (!targetSubId) {
          return reply.status(404).send({ 
            message: `Subscriber with ID or Account Number "${rawInput}" not found.` 
          });
        }
      }

      if (!targetSubId) {
        return reply.status(400).send({ message: 'Valid Subscriber ID or Account Number is required.' });
      }

      const newSaAccNum = accountNumber || `SA-${Date.now().toString().slice(-5)}`;

      const [created] = await db.insert(serviceAccounts).values({
        subscriberId: targetSubId,
        accountNumber: newSaAccNum,
        serviceType: serviceType || 'INTERNET',
        monthlyFee: monthlyFee || '1500.00',
      }).returning();

      return reply.status(201).send(created);
    } catch (error: any) {
      console.error('Error creating service account:', error);
      return reply.status(500).send({ message: `Failed to register service account: ${error.message || error}` });
    }
  });
}