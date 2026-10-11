import { pgTable, serial, text, timestamp, boolean, numeric, integer } from 'drizzle-orm/pg-core';

// 1. Users (RBAC)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  fullName: text('full_name').notNull(),
  role: text('role').notNull().default('Cashier'), // Admin, Cashier, Collection Supervisor, Auditor
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Subscribers
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  accountNumber: text('account_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  contactNumber: text('contact_number').notNull(),
  address: text('address').notNull(),
  status: text('status').notNull().default('ACTIVE'), // ACTIVE, INACTIVE, SUSPENDED
  createdAt: timestamp('created_at').defaultNow(),
});

// 3. Service Accounts
export const serviceAccounts = pgTable('service_accounts', {
  id: serial('id').primaryKey(),
  subscriberId: integer('subscriber_id').references(() => subscribers.id).notNull(),
  accountNumber: text('account_number').notNull().unique(),
  serviceType: text('service_type').notNull(), // CABLE, INTERNET, COMBO
  monthlyFee: numeric('monthly_fee', { precision: 10, scale: 2 }).notNull(),
  status: text('status').notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4. Bills
export const bills = pgTable('bills', {
  id: serial('id').primaryKey(),
  serviceAccountId: integer('service_account_id').references(() => serviceAccounts.id).notNull(),
  billingPeriod: text('billing_period').notNull(), // e.g., "2026-10"
  amountDue: numeric('amount_due', { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp('due_date').notNull(),
  status: text('status').notNull().default('UNPAID'), // UNPAID, PAID, PARTIAL, OVERDUE
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  billId: integer('bill_id').references(() => bills.id).notNull(),
  cashierId: integer('cashier_id').references(() => users.id).notNull(),
  orNumber: text('or_number').notNull().unique(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull().default('CASH'),
  paymentDate: timestamp('payment_date').defaultNow(),
});