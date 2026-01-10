import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  History,
  FileText,
  Gift,
  TrendingUp,
  Cpu,
  Sparkles,
  Users,
  Calendar,
  Copy,
  Check,
  Upload,
  Image,
  AlertCircle,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { withdrawalFormSchema, depositFormSchema } from "@shared/schema";
import type { z } from "zod";

const PAYMENT_NUMBER = "03425809569";

type WithdrawFormData = z.infer<typeof withdrawalFormSchema>;
type DepositFormData = z.infer<typeof depositFormSchema>;

export default function Payments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [withdrawHistoryDialogOpen, setWithdrawHistoryDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: withdrawals = [] } = useQuery<any[]>({
    queryKey: ["/api/withdrawals", user?.id],
    enabled: !!user?.id,
  });

  const { data: deposits = [] } = useQuery<any[]>({
    queryKey: ["/api/deposits", user?.id],
    enabled: !!user?.id,
  });

  const { data: userMachines = [] } = useQuery<any[]>({
    queryKey: ["/api/machines/user", user?.id],
    enabled: !!user?.id,
  });

  const { data: miningSession } = useQuery<any>({
    queryKey: ["/api/mining/session", user?.id],
    enabled: !!user?.id,
  });

  const hasActiveMachine = userMachines.length > 0;

  const withdrawForm = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
      method: "easypaisa",
      accountHolderName: "",
      accountNumber: "",
    },
  });

  const watchedAmount = withdrawForm.watch("amount");
  const taxAmount = watchedAmount * 0.10;
  const netAmount = watchedAmount - taxAmount;

  const depositForm = useForm<DepositFormData>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: 0,
      transactionId: "",
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (data: WithdrawFormData) => {
      const res = await apiRequest("POST", "/api/withdrawals/request", {
        userId: user?.id,
        amount: data.amount,
        method: data.method,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", user?.id] });
      withdrawForm.reset();
      setWithdrawDialogOpen(false);
      toast({
        title: "Withdrawal requested!",
        description: "Your request is being processed within 24 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal failed",
        description: error.message || "Could not process withdrawal",
        variant: "destructive",
      });
    },
  });

  const depositMutation = useMutation({
    mutationFn: async (data: DepositFormData) => {
      const res = await apiRequest("POST", "/api/deposits/request", {
        userId: user?.id,
        amount: data.amount,
        transactionId: data.transactionId,
        screenshotUrl: screenshotUrl,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deposits", user?.id] });
      depositForm.reset();
      setScreenshotUrl(null);
      setDepositDialogOpen(false);
      toast({
        title: "Deposit submitted!",
        description: "Your deposit request is pending admin approval.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deposit submission failed",
        description: error.message || "Could not submit deposit",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("screenshot", file);

    try {
      const res = await fetch("/api/uploads/screenshot", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setScreenshotUrl(data.url);
        toast({ title: "Screenshot uploaded!" });
      }
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const balance = userData?.balance ?? user?.balance ?? 0;
  const commissionBalance = userData?.totalReferralEarnings ?? 0;
  const totalAssets = balance + commissionBalance;

  const calculateDailyMinerIncome = () => {
    let daily = 0;
    for (const um of userMachines) {
      daily += um.machine?.dailyProfit || 0;
    }
    return daily;
  };

  const dailyMinerIncome = calculateDailyMinerIncome();
  const dailyAdditionalIncome = 10;
  const dailyTotalIncome = dailyMinerIncome + dailyAdditionalIncome;

  const copyNumber = async () => {
    await navigator.clipboard.writeText(PAYMENT_NUMBER);
    setCopied(true);
    toast({ title: "Copied!", description: "Payment number copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const quickLinks = [
    { icon: History, label: "Account history", onClick: () => setHistoryDialogOpen(true) },
    { icon: FileText, label: "Withdrawal history", onClick: () => setWithdrawHistoryDialogOpen(true) },
    { icon: Gift, label: "My Coupons", onClick: () => toast({ title: "Coming Soon", description: "Coupons feature coming soon!" }) },
  ];

  const incomeItems = [
    { label: "Daily total income", value: dailyTotalIncome, icon: TrendingUp, color: "text-green-400" },
    { label: "Daily miner income", value: dailyMinerIncome, icon: Cpu, color: "text-blue-400" },
    { label: "Daily additional income", value: dailyAdditionalIncome, icon: Sparkles, color: "text-purple-400" },
    { label: "Yesterday's commission", value: 0, icon: Calendar, color: "text-amber-400" },
    { label: "Today's commission", value: 0, icon: Users, color: "text-cyan-400" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-20">
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <Card className="overflow-hidden border-0 shadow-xl">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-6 h-6" />
              <span className="text-sm opacity-80">My Wallet</span>
            </div>
            
            <div className="mb-6">
              <p className="text-sm opacity-70 mb-1">Total assets</p>
              <p className="text-4xl font-bold" data-testid="text-total-assets">
                {totalAssets.toLocaleString()} <span className="text-lg font-normal">PKR</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs opacity-70 mb-1">Available balance</p>
                <p className="text-xl font-semibold" data-testid="text-available-balance">
                  {balance.toLocaleString()} PKR
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="text-xs opacity-70 mb-1">Commission balance</p>
                <p className="text-xl font-semibold" data-testid="text-commission-balance">
                  {commissionBalance.toLocaleString()} PKR
                </p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Button
            size="lg"
            className="h-14 text-lg font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg"
            onClick={() => setDepositDialogOpen(true)}
            data-testid="button-open-deposit"
          >
            <ArrowDownLeft className="w-5 h-5 mr-2" />
            Deposit
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-14 text-lg font-semibold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-foreground rounded-xl shadow-lg border-2"
            onClick={() => setWithdrawDialogOpen(true)}
            data-testid="button-open-withdraw"
          >
            <ArrowUpRight className="w-5 h-5 mr-2" />
            Withdraw
          </Button>
        </div>

        <div className="flex justify-around py-4">
          {quickLinks.map((link, index) => (
            <button
              key={index}
              onClick={link.onClick}
              className="flex flex-col items-center gap-2 group"
              data-testid={`quicklink-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500/20 to-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <link.icon className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-[80px]">{link.label}</span>
            </button>
          ))}
        </div>

        <Card className="border-border/50 bg-card/80 backdrop-blur-md">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Daily Income
            </h3>
            <div className="space-y-3">
              {incomeItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/70 transition-colors"
                  data-testid={`income-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-background/50 ${item.color}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm">{item.label}</span>
                  </div>
                  <span className={`font-semibold ${item.color}`}>
                    {item.value.toLocaleString()} PKR
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
              Deposit Funds
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">EasyPaisa / JazzCash</p>
                <p className="text-lg font-bold">{PAYMENT_NUMBER}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyNumber}
                data-testid="button-copy-number"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <Form {...depositForm}>
              <form
                onSubmit={depositForm.handleSubmit((data) => depositMutation.mutate(data))}
                className="space-y-4"
              >
                <FormField
                  control={depositForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (PKR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter deposit amount"
                          data-testid="input-deposit-amount"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={depositForm.control}
                  name="transactionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter transaction ID from receipt"
                          data-testid="input-transaction-id"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Screenshot</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    data-testid="input-screenshot"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    data-testid="button-upload-screenshot"
                  >
                    {uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : screenshotUrl ? (
                      <>
                        <Image className="w-4 h-4 text-green-400" />
                        Screenshot Uploaded
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload Screenshot
                      </>
                    )}
                  </Button>
                </div>

                <Button
                  type="submit"
                  disabled={depositMutation.isPending}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
                  data-testid="button-submit-deposit"
                >
                  {depositMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Submit Deposit Request"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-amber-400" />
              Withdraw Funds
            </DialogTitle>
          </DialogHeader>
          
          {!hasActiveMachine ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-400" data-testid="text-no-machine-warning">
                Please activate a machine to enable withdrawals.
              </p>
            </div>
          ) : (
            <Form {...withdrawForm}>
              <form
                onSubmit={withdrawForm.handleSubmit((data) => withdrawMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-xl font-bold text-amber-400">{balance.toLocaleString()} PKR</p>
                </div>

                <FormField
                  control={withdrawForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (PKR)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          data-testid="input-withdraw-amount"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedAmount >= 500 && (
                  <div className="p-3 rounded-lg bg-background/50 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (10%):</span>
                      <span className="text-red-400">-{taxAmount.toLocaleString()} PKR</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">You'll receive:</span>
                      <span className="text-green-400">{netAmount.toLocaleString()} PKR</span>
                    </div>
                  </div>
                )}

                <FormField
                  control={withdrawForm.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-method">
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="easypaisa">EasyPaisa</SelectItem>
                          <SelectItem value="jazzcash">JazzCash</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawForm.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter account holder name"
                          data-testid="input-account-holder-name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={withdrawForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="11-digit account number"
                          data-testid="input-account-number"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={withdrawMutation.isPending || balance < 500}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600"
                  data-testid="button-withdraw"
                >
                  {withdrawMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Request Withdrawal"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Processed within 24 hours. 10% tax applies.
                </p>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              Account History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No deposit history yet</p>
            ) : (
              deposits.map((d: any) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                >
                  <div>
                    <p className="font-medium text-green-400">+{d.amount?.toLocaleString()} PKR</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    d.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    d.status === "approved" ? "bg-green-500/20 text-green-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawHistoryDialogOpen} onOpenChange={setWithdrawHistoryDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              Withdrawal History
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No withdrawal history yet</p>
            ) : (
              withdrawals.map((w: any) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                >
                  <div>
                    <p className="font-medium text-red-400">-{w.amount?.toLocaleString()} PKR</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    w.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    w.status === "approved" ? "bg-green-500/20 text-green-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {w.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
