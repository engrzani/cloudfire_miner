import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MINING_MACHINES_DATA, insertUserSchema, EXCHANGE_RATES } from "@shared/schema";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  }, express.static(uploadDir));
  
  // Auth: Signup with referral support
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, password, referralCode, phoneNumber } = req.body;
      
      const parsed = insertUserSchema.safeParse({ username, password });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0].message });
      }

      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      let referredById: string | undefined;
      if (referralCode) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          referredById = referrer.id;
        }
      }

      const user = await storage.createUser(parsed.data, referredById, phoneNumber);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Get user by ID
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin middleware helper
  const requireAdmin = async (userId: string): Promise<boolean> => {
    if (!userId) return false;
    const user = await storage.getUser(userId);
    return user?.isAdmin === true;
  };

  // Admin: Get global stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users = await storage.getAllUsers();
      const deposits = await storage.getAllDeposits();
      const totalUsers = users.length;
      const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
      const totalDeposits = deposits
        .filter(d => d.status === "approved")
        .reduce((sum, d) => sum + (d.amount || 0), 0);
      res.json({ totalUsers, totalBalance, totalDeposits });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Get all users
  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const users = await storage.getAllUsers();
      const safeUsers = users.map(u => {
        const { password: _, ...safe } = u;
        return safe;
      });
      res.json(safeUsers);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Update user balance
  app.patch("/api/admin/users/:id/balance", async (req, res) => {
    try {
      const { balance, adminId } = req.body;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (typeof balance !== "number") {
        return res.status(400).json({ message: "Balance must be a number" });
      }
      const user = await storage.updateUserBalance(req.params.id, balance);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Mining: Get active session
  app.get("/api/mining/session/:userId", async (req, res) => {
    try {
      const session = await storage.getActiveMiningSession(req.params.userId);
      if (session) {
        // Return session with ISO timestamp and server time for sync
        res.json({
          ...session,
          endsAt: new Date(session.endsAt).toISOString(),
          startedAt: new Date(session.startedAt).toISOString(),
          serverTime: new Date().toISOString(),
        });
      } else {
        res.json(null);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Mining: Start session
  app.post("/api/mining/start", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const existingSession = await storage.getActiveMiningSession(userId);
      if (existingSession) {
        return res.status(400).json({ message: "Mining session already active" });
      }

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + 24);

      const session = await storage.createMiningSession(userId, endsAt);
      res.json({
        ...session,
        endsAt: endsAt.toISOString(),
        startedAt: new Date(session.startedAt).toISOString(),
        serverTime: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Mining: Claim reward
  app.post("/api/mining/claim", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const userMachinesData = await storage.getUserMachines(userId);
      if (userMachinesData.length === 0) {
        return res.status(400).json({ message: "No machines to claim from. Rent a machine first!" });
      }

      const now = new Date();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      let totalReward = 0;
      let claimedCount = 0;
      let nextClaimTime: Date | null = null;

      for (const um of userMachinesData) {
        const machine = MINING_MACHINES_DATA.find(m => m.id === um.machineId);
        if (!machine) continue;

        const lastClaimed = um.lastClaimedAt ? new Date(um.lastClaimedAt) : null;
        const timeSinceLastClaim = lastClaimed ? now.getTime() - lastClaimed.getTime() : Infinity;

        if (timeSinceLastClaim >= TWENTY_FOUR_HOURS) {
          const dailyProfit = parseFloat(String(machine.dailyProfit));
          totalReward += dailyProfit;
          await storage.updateMachineLastClaimed(um.id, now);
          claimedCount++;
        } else if (lastClaimed) {
          const machineNextClaim = new Date(lastClaimed.getTime() + TWENTY_FOUR_HOURS);
          if (!nextClaimTime || machineNextClaim < nextClaimTime) {
            nextClaimTime = machineNextClaim;
          }
        }
      }

      if (claimedCount === 0) {
        const remainingMs = nextClaimTime ? nextClaimTime.getTime() - now.getTime() : 0;
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
        return res.status(400).json({
          message: `No machines ready to claim. Next claim in ${remainingHours}h.`,
          remainingMs,
          nextClaimTime
        });
      }

      const user = await storage.getUser(userId);
      if (user) {
        const userBalance = parseFloat(String(user.balance));
        await storage.updateUserBalance(userId, userBalance + totalReward);
      }

      res.json({ reward: totalReward, claimed: true, machinesClaimed: claimedCount });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Mining: Get claimable machines status
  app.get("/api/mining/status/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const userMachinesData = await storage.getUserMachines(userId);
      
      const now = new Date();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      let claimableReward = 0;
      let claimableMachines = 0;
      let nextClaimTime: Date | null = null;

      for (const um of userMachinesData) {
        const machine = MINING_MACHINES_DATA.find(m => m.id === um.machineId);
        if (!machine) continue;

        const lastClaimed = um.lastClaimedAt ? new Date(um.lastClaimedAt) : null;
        const timeSinceLastClaim = lastClaimed ? now.getTime() - lastClaimed.getTime() : Infinity;

        if (timeSinceLastClaim >= TWENTY_FOUR_HOURS) {
          const dailyProfit = parseFloat(String(machine.dailyProfit));
          claimableReward += dailyProfit;
          claimableMachines++;
        } else if (lastClaimed) {
          const machineNextClaim = new Date(lastClaimed.getTime() + TWENTY_FOUR_HOURS);
          if (!nextClaimTime || machineNextClaim < nextClaimTime) {
            nextClaimTime = machineNextClaim;
          }
        }
      }

      res.json({
        totalMachines: userMachinesData.length,
        claimableMachines,
        claimableReward,
        nextClaimTime,
        serverTime: now
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Legacy mining session route (kept for compatibility)
  app.post("/api/mining/claim-legacy", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const session = await storage.getActiveMiningSession(userId);
      if (!session) {
        return res.status(400).json({ message: "No active mining session" });
      }

      const now = new Date();
      const sessionEndTime = new Date(session.endsAt);
      
      if (now.getTime() < sessionEndTime.getTime()) {
        const remainingMs = sessionEndTime.getTime() - now.getTime();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
        return res.status(400).json({ 
          message: `Mining session not complete. ${remainingHours}h remaining.`,
          remainingMs,
          endsAt: session.endsAt
        });
      }

      const userMachines = await storage.getUserMachines(userId);
      let dailyReward = 10;
      
      for (const um of userMachines) {
        const machine = MINING_MACHINES_DATA.find(m => m.id === um.machineId);
        if (machine) {
          dailyReward += machine.dailyProfit;
        }
      }

      const user = await storage.getUser(userId);
      if (user) {
        await storage.updateUserBalance(userId, parseFloat(String(user.balance)) + dailyReward);
      }

      await storage.claimMiningSession(session.id);

      res.json({ reward: dailyReward, claimed: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Machines: Get user's owned machines
  app.get("/api/machines/owned/:userId", async (req, res) => {
    try {
      const machines = await storage.getUserMachines(req.params.userId);
      res.json(machines);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Machines: Rent a machine
  app.post("/api/machines/rent", async (req, res) => {
    try {
      const { userId, machineId } = req.body;
      if (!userId || !machineId) {
        return res.status(400).json({ message: "User ID and Machine ID required" });
      }

      const machine = MINING_MACHINES_DATA.find(m => m.id === machineId);
      if (!machine) {
        return res.status(404).json({ message: "Machine not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userBalance = parseFloat(String(user.balance));
      const machinePrice = parseFloat(String(machine.price));
      if (userBalance < machinePrice) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Check rental limit
      const userMachines = await storage.getUserMachines(userId);
      const currentOwned = userMachines.filter(m => m.machineId === machineId).length;
      if (currentOwned >= machine.maxRentals) {
        return res.status(400).json({ message: "Rental limit reached for this machine" });
      }

      const newBalance = userBalance - machinePrice;
      await storage.updateUserBalance(userId, newBalance);
      await storage.updateUserMiners(userId, user.totalMiners + 1);
      await storage.addUserMachine({ userId, machineId });

      // Process referral commissions on machine rental (investment)
      if (user.referredById) {
        const commission1 = machinePrice * 0.10;
        const referrer1 = await storage.getUser(user.referredById);
        if (referrer1) {
          const referrer1Balance = parseFloat(String(referrer1.balance));
          await storage.updateUserBalance(referrer1.id, referrer1Balance + commission1);
          await storage.updateUserReferralEarnings(referrer1.id, commission1);

          if (referrer1.referredById) {
            const referrer2 = await storage.getUser(referrer1.referredById);
            if (referrer2) {
              const commission2 = machinePrice * 0.04;
              const referrer2Balance = parseFloat(String(referrer2.balance));
              await storage.updateUserBalance(referrer2.id, referrer2Balance + commission2);
              await storage.updateUserReferralEarnings(referrer2.id, commission2);
            }
          }
        }
      }

      const updatedUser = await storage.getUser(userId);
      const { password: _, ...safeUser } = updatedUser!;

      res.json({ success: true, user: safeUser });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Withdrawals: Get user's withdrawals
  app.get("/api/withdrawals/:userId", async (req, res) => {
    try {
      const withdrawals = await storage.getUserWithdrawals(req.params.userId);
      res.json(withdrawals);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Withdrawals: Request withdrawal
  app.post("/api/withdrawals/request", async (req, res) => {
    try {
      const { userId, amount, method, accountHolderName, accountNumber } = req.body;
      if (!userId || !amount || !method || !accountHolderName || !accountNumber) {
        return res.status(400).json({ message: "All fields required" });
      }

      if (amount < 2) {
        return res.status(400).json({ message: "Minimum withdrawal is $2" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has at least one active machine
      const machineCount = await storage.getUserMachineCount(userId);
      if (machineCount === 0) {
        return res.status(400).json({ message: "Please activate a machine to enable withdrawals." });
      }

      const userBalance = parseFloat(String(user.balance));
      if (userBalance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Calculate 10% tax
      const taxAmount = amount * 0.10;
      const netAmount = amount - taxAmount;
      // Calculate PKR payout using withdrawal exchange rate
      const pkrAmount = netAmount * EXCHANGE_RATES.WITHDRAW_RATE;

      await storage.updateUserBalance(userId, userBalance - amount);
      const withdrawal = await storage.createWithdrawal(userId, amount, taxAmount, netAmount, pkrAmount, method, accountHolderName, accountNumber);

      res.json(withdrawal);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Get all withdrawals
  app.get("/api/admin/withdrawals", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Update withdrawal status
  app.patch("/api/admin/withdrawals/:id", async (req, res) => {
    try {
      const { status, adminId } = req.body;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const withdrawal = await storage.updateWithdrawalStatus(req.params.id, status);
      if (!withdrawal) {
        return res.status(404).json({ message: "Withdrawal not found" });
      }
      res.json(withdrawal);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Deposits: Upload screenshot
  app.post("/api/uploads/screenshot", upload.single("screenshot"), async (req: Request, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const url = `/uploads/${file.filename}`;
      res.json({ url });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Upload failed" });
    }
  });

  // Deposits: Submit deposit request
  app.post("/api/deposits/request", async (req, res) => {
    try {
      const { userId, amount, transactionId, screenshotUrl } = req.body;
      if (!userId || !amount || !transactionId) {
        return res.status(400).json({ message: "All fields required" });
      }

      // Calculate PKR amount using deposit exchange rate
      const pkrAmount = amount * EXCHANGE_RATES.DEPOSIT_RATE;

      const deposit = await storage.createDeposit(userId, amount, pkrAmount, transactionId, screenshotUrl);
      res.json(deposit);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Deposits: Get user's deposits
  app.get("/api/deposits/:userId", async (req, res) => {
    try {
      const deposits = await storage.getUserDeposits(req.params.userId);
      res.json(deposits);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Get all deposits
  app.get("/api/admin/deposits", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const deposits = await storage.getAllDeposits();
      res.json(deposits);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Approve/reject deposit
  app.patch("/api/admin/deposits/:id", async (req, res) => {
    try {
      const { status, adminId } = req.body;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const deposits = await storage.getAllDeposits();
      const deposit = deposits.find(d => d.id === req.params.id);
      if (!deposit) {
        return res.status(404).json({ message: "Deposit not found" });
      }

      if (status === "approved" && deposit.status !== "approved") {
        const user = await storage.getUser(deposit.userId);
        if (user) {
          await storage.updateUserBalance(user.id, parseFloat(String(user.balance)) + parseFloat(String(deposit.amount)));
          
          // Process referral commissions on deposit approval
          const depositAmount = parseFloat(String(deposit.amount));
          if (user.referredById) {
            const commission1 = depositAmount * 0.10;
            const referrer1 = await storage.getUser(user.referredById);
            if (referrer1) {
              const referrer1Balance = parseFloat(String(referrer1.balance));
              await storage.updateUserBalance(referrer1.id, referrer1Balance + commission1);
              await storage.updateUserReferralEarnings(referrer1.id, commission1);
              await storage.createReferralCommission(referrer1.id, user.id, deposit.id, 1, commission1);

              if (referrer1.referredById) {
                const referrer2 = await storage.getUser(referrer1.referredById);
                if (referrer2) {
                  const commission2 = depositAmount * 0.04;
                  const referrer2Balance = parseFloat(String(referrer2.balance));
                  await storage.updateUserBalance(referrer2.id, referrer2Balance + commission2);
                  await storage.updateUserReferralEarnings(referrer2.id, commission2);
                  await storage.createReferralCommission(referrer2.id, user.id, deposit.id, 2, commission2);
                }
              }
            }
          }
        }
      }

      const updatedDeposit = await storage.updateDepositStatus(req.params.id, status, adminId || "admin");
      res.json(updatedDeposit);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Referrals: Get user's referrals
  app.get("/api/referrals/:userId", async (req, res) => {
    try {
      const level1 = await storage.getReferrals(req.params.userId);
      const level2 = await storage.getLevel2Referrals(req.params.userId);
      
      const safeLevel1 = level1.map(u => {
        const { password: _, ...safe } = u;
        return safe;
      });
      const safeLevel2 = level2.map(u => {
        const { password: _, ...safe } = u;
        return safe;
      });

      res.json({ level1: safeLevel1, level2: safeLevel2 });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Referrals: Get user's commissions
  app.get("/api/referrals/:userId/commissions", async (req, res) => {
    try {
      const commissions = await storage.getUserCommissions(req.params.userId);
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Announcements: Get active announcements (public)
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Announcements: Admin - Get all announcements
  app.get("/api/admin/announcements", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Announcements: Admin - Create announcement with image upload
  app.post("/api/admin/announcements", upload.single("image"), async (req, res) => {
    try {
      const adminId = req.body.adminId;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { title, description, iconType, isActive, priority } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "Title and description required" });
      }
      const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const announcement = await storage.createAnnouncement({
        title,
        description,
        imageUrl,
        iconType: iconType || "sparkles",
        isActive: isActive === "true" || isActive === true,
        priority: parseInt(priority) || 0,
      }, adminId);
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Announcements: Admin - Update announcement
  app.patch("/api/admin/announcements/:id", upload.single("image"), async (req, res) => {
    try {
      const adminId = req.body.adminId;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { title, description, iconType, isActive, priority } = req.body;
      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (iconType) updateData.iconType = iconType;
      if (isActive !== undefined) updateData.isActive = isActive === "true" || isActive === true;
      if (priority !== undefined) updateData.priority = parseInt(priority);
      if (req.file) updateData.imageUrl = `/uploads/${req.file.filename}`;

      const announcement = await storage.updateAnnouncement(req.params.id, updateData);
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json(announcement);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Announcements: Admin - Delete announcement
  app.delete("/api/admin/announcements/:id", async (req, res) => {
    try {
      const adminId = req.query.adminId as string;
      if (!await requireAdmin(adminId)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const deleted = await storage.deleteAnnouncement(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  return httpServer;
}
