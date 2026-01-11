import {
  users,
  userMachines,
  miningSessions,
  withdrawalRequests,
  depositRequests,
  referralCommissions,
  announcements,
  type User,
  type InsertUser,
  type UserMachine,
  type InsertUserMachine,
  type MiningSession,
  type WithdrawalRequest,
  type DepositRequest,
  type ReferralCommission,
  type Announcement,
  type InsertAnnouncement,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ne } from "drizzle-orm";

function generateReferralCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByReferralCode(code: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser, referredById?: string, phoneNumber?: string): Promise<User>;
  updateUserBalance(id: string, balance: number): Promise<User | undefined>;
  updateUserMiners(id: string, totalMiners: number): Promise<User | undefined>;
  updateUserReferralEarnings(id: string, amount: number): Promise<User | undefined>;

  getUserMachines(userId: string): Promise<UserMachine[]>;
  addUserMachine(data: InsertUserMachine): Promise<UserMachine>;
  updateMachineLastClaimed(machineId: string, claimedAt: Date): Promise<UserMachine | undefined>;

  getActiveMiningSession(userId: string): Promise<MiningSession | undefined>;
  createMiningSession(userId: string, endsAt: Date): Promise<MiningSession>;
  claimMiningSession(sessionId: string): Promise<MiningSession | undefined>;

  getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]>;
  getAllWithdrawals(): Promise<WithdrawalRequest[]>;
  createWithdrawal(userId: string, amount: number, taxAmount: number, netAmount: number, pkrAmount: number, method: string, accountHolderName: string, accountNumber: string): Promise<WithdrawalRequest>;
  getUserMachineCount(userId: string): Promise<number>;
  updateWithdrawalStatus(id: string, status: string): Promise<WithdrawalRequest | undefined>;

  getUserDeposits(userId: string): Promise<DepositRequest[]>;
  getAllDeposits(): Promise<DepositRequest[]>;
  createDeposit(userId: string, amount: number, pkrAmount: number, transactionId: string, screenshotUrl?: string): Promise<DepositRequest>;
  updateDepositStatus(id: string, status: string, reviewedBy: string): Promise<DepositRequest | undefined>;

  getReferrals(userId: string): Promise<User[]>;
  getLevel2Referrals(userId: string): Promise<User[]>;
  createReferralCommission(userId: string, fromUserId: string, depositId: string, level: number, amount: number): Promise<ReferralCommission>;
  getUserCommissions(userId: string): Promise<ReferralCommission[]>;

  getActiveAnnouncements(): Promise<Announcement[]>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(data: InsertAnnouncement, createdBy: string): Promise<Announcement>;
  updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByReferralCode(code: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.referralCode, code));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.id));
  }

  async createUser(insertUser: InsertUser, referredById?: string, phoneNumber?: string): Promise<User> {
    const referralCode = generateReferralCode();
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        phoneNumber: phoneNumber || null,
        balance: 0,
        totalMiners: 0,
        referralCode,
        referredById: referredById || null,
        totalReferralEarnings: 0,
        isAdmin: false,
      })
      .returning();
    return user;
  }

  async updateUserBalance(id: string, balance: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ balance })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserMiners(id: string, totalMiners: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ totalMiners })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async updateUserReferralEarnings(id: string, amount: number): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    const [updated] = await db
      .update(users)
      .set({ totalReferralEarnings: (user.totalReferralEarnings || 0) + amount })
      .where(eq(users.id, id))
      .returning();
    return updated || undefined;
  }

  async getUserMachines(userId: string): Promise<UserMachine[]> {
    return await db.select().from(userMachines).where(eq(userMachines.userId, userId));
  }

  async addUserMachine(data: InsertUserMachine): Promise<UserMachine> {
    const [machine] = await db
      .insert(userMachines)
      .values(data)
      .returning();
    return machine;
  }

  async updateMachineLastClaimed(machineId: string, claimedAt: Date): Promise<UserMachine | undefined> {
    const [machine] = await db
      .update(userMachines)
      .set({ lastClaimedAt: claimedAt })
      .where(eq(userMachines.id, machineId))
      .returning();
    return machine;
  }

  async getActiveMiningSession(userId: string): Promise<MiningSession | undefined> {
    const [session] = await db
      .select()
      .from(miningSessions)
      .where(and(eq(miningSessions.userId, userId), eq(miningSessions.claimed, false)))
      .orderBy(desc(miningSessions.startedAt))
      .limit(1);
    return session || undefined;
  }

  async createMiningSession(userId: string, endsAt: Date): Promise<MiningSession> {
    const [session] = await db
      .insert(miningSessions)
      .values({ userId, endsAt })
      .returning();
    return session;
  }

  async claimMiningSession(sessionId: string): Promise<MiningSession | undefined> {
    const [session] = await db
      .update(miningSessions)
      .set({ claimed: true })
      .where(eq(miningSessions.id, sessionId))
      .returning();
    return session || undefined;
  }

  async getUserWithdrawals(userId: string): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.userId, userId))
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async getAllWithdrawals(): Promise<WithdrawalRequest[]> {
    return await db
      .select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt));
  }

  async createWithdrawal(userId: string, amount: number, taxAmount: number, netAmount: number, pkrAmount: number, method: string, accountHolderName: string, accountNumber: string): Promise<WithdrawalRequest> {
    const [withdrawal] = await db
      .insert(withdrawalRequests)
      .values({ userId, amount, taxAmount, netAmount, pkrAmount, method, accountHolderName, accountNumber, status: "pending" })
      .returning();
    return withdrawal;
  }

  async getUserMachineCount(userId: string): Promise<number> {
    const machines = await db
      .select()
      .from(userMachines)
      .where(eq(userMachines.userId, userId));
    return machines.length;
  }

  async updateWithdrawalStatus(id: string, status: string): Promise<WithdrawalRequest | undefined> {
    const [withdrawal] = await db
      .update(withdrawalRequests)
      .set({ status })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return withdrawal || undefined;
  }

  async getUserDeposits(userId: string): Promise<DepositRequest[]> {
    return await db
      .select()
      .from(depositRequests)
      .where(eq(depositRequests.userId, userId))
      .orderBy(desc(depositRequests.createdAt));
  }

  async getAllDeposits(): Promise<DepositRequest[]> {
    return await db
      .select()
      .from(depositRequests)
      .orderBy(desc(depositRequests.createdAt));
  }

  async createDeposit(userId: string, amount: number, pkrAmount: number, transactionId: string, screenshotUrl?: string): Promise<DepositRequest> {
    const [deposit] = await db
      .insert(depositRequests)
      .values({
        userId,
        amount,
        pkrAmount,
        transactionId,
        screenshotUrl: screenshotUrl || null,
        status: "pending",
      })
      .returning();
    return deposit;
  }

  async updateDepositStatus(id: string, status: string, reviewedBy: string): Promise<DepositRequest | undefined> {
    const [deposit] = await db
      .update(depositRequests)
      .set({ status, reviewedBy, reviewedAt: new Date() })
      .where(eq(depositRequests.id, id))
      .returning();
    return deposit || undefined;
  }

  async getReferrals(userId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.referredById, userId));
  }

  async getLevel2Referrals(userId: string): Promise<User[]> {
    const level1 = await this.getReferrals(userId);
    const level2Users: User[] = [];
    for (const l1User of level1) {
      const l2 = await this.getReferrals(l1User.id);
      level2Users.push(...l2);
    }
    return level2Users;
  }

  async createReferralCommission(userId: string, fromUserId: string, depositId: string, level: number, amount: number): Promise<ReferralCommission> {
    const [commission] = await db
      .insert(referralCommissions)
      .values({ userId, fromUserId, depositId, level, amount })
      .returning();
    return commission;
  }

  async getUserCommissions(userId: string): Promise<ReferralCommission[]> {
    return await db
      .select()
      .from(referralCommissions)
      .where(eq(referralCommissions.userId, userId))
      .orderBy(desc(referralCommissions.createdAt));
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(data: InsertAnnouncement, createdBy: string): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values({ ...data, createdBy })
      .returning();
    return announcement;
  }

  async updateAnnouncement(id: string, data: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [announcement] = await db
      .update(announcements)
      .set(data)
      .where(eq(announcements.id, id))
      .returning();
    return announcement || undefined;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
