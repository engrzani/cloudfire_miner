import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { MINING_MACHINES_DATA, insertUserSchema } from "@shared/schema";
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

  // Admin: Get global stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
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
      const { balance } = req.body;
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
      res.json(session || null);
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
      res.json(session);
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

      const session = await storage.getActiveMiningSession(userId);
      if (!session) {
        return res.status(400).json({ message: "No active mining session" });
      }

      const now = new Date();
      if (now < new Date(session.endsAt)) {
        return res.status(400).json({ message: "Mining session not complete" });
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
        await storage.updateUserBalance(userId, user.balance + dailyReward);
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

      if (user.balance < machine.price) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Check rental limit
      const userMachines = await storage.getUserMachines(userId);
      const currentOwned = userMachines.filter(m => m.machineId === machineId).length;
      if (currentOwned >= machine.maxRentals) {
        return res.status(400).json({ message: "Rental limit reached for this machine" });
      }

      const newBalance = user.balance - machine.price;
      await storage.updateUserBalance(userId, newBalance);
      await storage.updateUserMiners(userId, user.totalMiners + 1);
      await storage.addUserMachine({ userId, machineId });

      // Process referral commissions on machine rental (investment)
      if (user.referredById) {
        const commission1 = machine.price * 0.10;
        const referrer1 = await storage.getUser(user.referredById);
        if (referrer1) {
          await storage.updateUserBalance(referrer1.id, referrer1.balance + commission1);
          await storage.updateUserReferralEarnings(referrer1.id, commission1);

          if (referrer1.referredById) {
            const referrer2 = await storage.getUser(referrer1.referredById);
            if (referrer2) {
              const commission2 = machine.price * 0.04;
              await storage.updateUserBalance(referrer2.id, referrer2.balance + commission2);
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

      if (amount < 500) {
        return res.status(400).json({ message: "Minimum withdrawal is 500 PKR" });
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

      if (user.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      // Calculate 10% tax
      const taxAmount = amount * 0.10;
      const netAmount = amount - taxAmount;

      await storage.updateUserBalance(userId, user.balance - amount);
      const withdrawal = await storage.createWithdrawal(userId, amount, taxAmount, netAmount, method, accountHolderName, accountNumber);

      res.json(withdrawal);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Get all withdrawals
  app.get("/api/admin/withdrawals", async (req, res) => {
    try {
      const withdrawals = await storage.getAllWithdrawals();
      res.json(withdrawals);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Server error" });
    }
  });

  // Admin: Update withdrawal status
  app.patch("/api/admin/withdrawals/:id", async (req, res) => {
    try {
      const { status } = req.body;
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

      const deposit = await storage.createDeposit(userId, amount, transactionId, screenshotUrl);
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
          await storage.updateUserBalance(user.id, user.balance + deposit.amount);
          
          // Process referral commissions on deposit approval
          if (user.referredById) {
            const commission1 = deposit.amount * 0.10;
            const referrer1 = await storage.getUser(user.referredById);
            if (referrer1) {
              await storage.updateUserBalance(referrer1.id, referrer1.balance + commission1);
              await storage.updateUserReferralEarnings(referrer1.id, commission1);
              await storage.createReferralCommission(referrer1.id, user.id, deposit.id, 1, commission1);

              if (referrer1.referredById) {
                const referrer2 = await storage.getUser(referrer1.referredById);
                if (referrer2) {
                  const commission2 = deposit.amount * 0.04;
                  await storage.updateUserBalance(referrer2.id, referrer2.balance + commission2);
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

  return httpServer;
}
