import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const EXCHANGE_RATES = {
  DEPOSIT_RATE: 315,
  WITHDRAW_RATE: 270,
};

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  phoneNumber: varchar("phone_number", { length: 11 }),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMiners: integer("total_miners").notNull().default(0),
  isAdmin: boolean("is_admin").notNull().default(false),
  referralCode: varchar("referral_code").unique(),
  referredById: varchar("referred_by_id"),
  totalReferralEarnings: numeric("total_referral_earnings", { precision: 10, scale: 2 }).notNull().default("0"),
  profilePic: text("profile_pic"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  rebatePaidToReferrer: boolean("rebate_paid_to_referrer").notNull().default(false),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phoneNumber: z.string().length(11, "Phone number must be 11 digits"),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const miningMachines = pgTable("mining_machines", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  dailyProfit: numeric("daily_profit", { precision: 10, scale: 2 }).notNull(),
});

export type MiningMachine = typeof miningMachines.$inferSelect;

export const userMachines = pgTable("user_machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  machineId: varchar("machine_id").notNull(),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  lastClaimedAt: timestamp("last_claimed_at"),
});

export const insertUserMachineSchema = createInsertSchema(userMachines).pick({
  userId: true,
  machineId: true,
});

export type InsertUserMachine = z.infer<typeof insertUserMachineSchema>;
export type UserMachine = typeof userMachines.$inferSelect;

export const miningSessions = pgTable("mining_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endsAt: timestamp("ends_at").notNull(),
  claimed: boolean("claimed").notNull().default(false),
});

export const insertMiningSessionSchema = createInsertSchema(miningSessions).pick({
  userId: true,
  endsAt: true,
});

export type InsertMiningSession = z.infer<typeof insertMiningSessionSchema>;
export type MiningSession = typeof miningSessions.$inferSelect;

export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 10, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  pkrAmount: numeric("pkr_amount", { precision: 10, scale: 2 }).notNull(),
  method: text("method").notNull().default("easypaisa"),
  accountHolderName: text("account_holder_name").notNull(),
  accountNumber: text("account_number").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWithdrawalSchema = createInsertSchema(withdrawalRequests).pick({
  userId: true,
  amount: true,
  taxAmount: true,
  netAmount: true,
  pkrAmount: true,
  method: true,
  accountHolderName: true,
  accountNumber: true,
});

export const withdrawalFormSchema = z.object({
  amount: z.number().min(2, "Minimum withdrawal is $2"),
  method: z.enum(["easypaisa", "jazzcash"], { required_error: "Please select a payment method" }),
  accountHolderName: z.string().min(3, "Enter account holder name"),
  accountNumber: z.string().min(11, "Enter a valid account number"),
});

export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;

export const depositRequests = pgTable("deposit_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  pkrAmount: numeric("pkr_amount", { precision: 10, scale: 2 }).notNull(),
  transactionId: text("transaction_id").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
});

export const insertDepositSchema = createInsertSchema(depositRequests).pick({
  userId: true,
  amount: true,
  pkrAmount: true,
  transactionId: true,
  screenshotUrl: true,
});

export const depositFormSchema = z.object({
  amount: z.number().min(1, "Minimum deposit is $1"),
  transactionId: z.string().min(5, "Enter a valid transaction ID"),
});

export type InsertDeposit = z.infer<typeof insertDepositSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;

export const referralCommissions = pgTable("referral_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  fromUserId: varchar("from_user_id").notNull(),
  depositId: varchar("deposit_id"),
  sourceType: varchar("source_type", { length: 20 }).notNull().default("deposit"),
  level: integer("level").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ReferralCommission = typeof referralCommissions.$inferSelect;

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  iconType: text("icon_type").notNull().default("sparkles"),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: varchar("created_by"),
});

export const insertAnnouncementSchema = createInsertSchema(announcements).pick({
  title: true,
  description: true,
  imageUrl: true,
  iconType: true,
  isActive: true,
  priority: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

export interface MachineData {
  id: string;
  name: string;
  level: number;
  price: number;
  dailyProfit: number;
  duration: number;
  totalProfit: number;
  rebate: number;
  maxRentals: number;
}

export const MINING_MACHINES_DATA: MachineData[] = [
  { id: "m1", name: "Nebula Core HZ-1", level: 1, price: 5, dailyProfit: 0.50, duration: 20, totalProfit: 10.00, rebate: 0.50, maxRentals: 1 },
  { id: "m2", name: "Quantum Node HZ-2", level: 2, price: 20, dailyProfit: 0.67, duration: 60, totalProfit: 40.20, rebate: 1.00, maxRentals: 1 },
  { id: "m3", name: "Titan Miner HZ-3", level: 3, price: 50, dailyProfit: 1.67, duration: 60, totalProfit: 100.20, rebate: 1.70, maxRentals: 1 },
  { id: "m4", name: "Apex Grid HZ-4", level: 4, price: 100, dailyProfit: 3.33, duration: 60, totalProfit: 200.00, rebate: 2.30, maxRentals: 1 },
  { id: "m5", name: "Vortex Prime HZ-5", level: 5, price: 150, dailyProfit: 5.00, duration: 60, totalProfit: 300.00, rebate: 4.00, maxRentals: 2 },
  { id: "m6", name: "Zenith Pulse HZ-6", level: 6, price: 200, dailyProfit: 6.66, duration: 60, totalProfit: 400.00, rebate: 5.50, maxRentals: 2 },
  { id: "m7", name: "Stellar Forge HZ-7", level: 7, price: 500, dailyProfit: 16.66, duration: 60, totalProfit: 1000.00, rebate: 11.00, maxRentals: 2 },
  { id: "m8", name: "Infinity Ray HZ-8", level: 8, price: 700, dailyProfit: 23.33, duration: 60, totalProfit: 1400.00, rebate: 15.00, maxRentals: 2 },
  { id: "m9", name: "Omega Stream HZ-9", level: 9, price: 1000, dailyProfit: 33.33, duration: 60, totalProfit: 2000.00, rebate: 40.00, maxRentals: 2 },
  { id: "m10", name: "Galactic Vault HZ-10", level: 10, price: 1200, dailyProfit: 48.00, duration: 50, totalProfit: 2400.00, rebate: 60.00, maxRentals: 2 },
];
