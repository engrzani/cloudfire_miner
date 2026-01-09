import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Flame,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Smartphone,
  Upload,
  Image,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const withdrawForm = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
      accountNumber: "",
    },
  });

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
        ...data,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/withdrawals", user?.id] });
      withdrawForm.reset();
      toast({
        title: "Withdrawal requested!",
        description: "Your request is being processed.",
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

  const copyNumber = async () => {
    await navigator.clipboard.writeText(PAYMENT_NUMBER);
    setCopied(true);
    toast({ title: "Copied!", description: "Payment number copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-20">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          CloudFire
        </h1>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <Card className="border-green-500/20 bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-5 h-5 text-green-400" />
              <CardTitle className="text-lg">Deposit Funds</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Smartphone className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  EasyPaisa / JazzCash
                </p>
                <p className="text-lg font-bold text-foreground">{PAYMENT_NUMBER}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyNumber}
                data-testid="button-copy-number"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground mb-3">
                After sending payment, submit your proof below:
              </p>
              <Form {...depositForm}>
                <form
                  onSubmit={depositForm.handleSubmit((data) =>
                    depositMutation.mutate(data)
                  )}
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
                            className="bg-background/50"
                            data-testid="input-deposit-amount"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
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
                            className="bg-background/50"
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
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
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
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-card/80 backdrop-blur-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-amber-400" />
                <CardTitle className="text-lg">Withdraw</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-lg font-bold text-amber-400" data-testid="text-withdraw-balance">
                  {balance.toLocaleString()} PKR
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...withdrawForm}>
              <form
                onSubmit={withdrawForm.handleSubmit((data) =>
                  withdrawMutation.mutate(data)
                )}
                className="space-y-4"
              >
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
                          className="bg-background/50"
                          data-testid="input-withdraw-amount"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseFloat(e.target.value) || 0)
                          }
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
                          placeholder="EasyPaisa/JazzCash number"
                          className="bg-background/50"
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
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                  data-testid="button-withdraw"
                >
                  {withdrawMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Request Withdrawal"
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Minimum withdrawal: 500 PKR
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>

        {(deposits.length > 0 || withdrawals.length > 0) && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {deposits.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Deposits</h4>
                  <div className="space-y-2">
                    {deposits.slice(0, 3).map((d: any) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        data-testid={`deposit-${d.id}`}
                      >
                        <div>
                          <p className="font-medium text-green-400">
                            +{d.amount?.toLocaleString()} PKR
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(d.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`
                            px-2 py-1 text-xs rounded-full
                            ${
                              d.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : d.status === "approved"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          `}
                        >
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {withdrawals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Withdrawals</h4>
                  <div className="space-y-2">
                    {withdrawals.slice(0, 3).map((w: any) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                        data-testid={`withdrawal-${w.id}`}
                      >
                        <div>
                          <p className="font-medium text-red-400">
                            -{w.amount?.toLocaleString()} PKR
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(w.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`
                            px-2 py-1 text-xs rounded-full
                            ${
                              w.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : w.status === "approved"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          `}
                        >
                          {w.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
