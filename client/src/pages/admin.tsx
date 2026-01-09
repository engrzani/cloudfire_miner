import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Flame, Users, ArrowDownLeft, ArrowUpRight, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balanceInput, setBalanceInput] = useState<Record<string, string>>({});

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: deposits = [], isLoading: depositsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/deposits"],
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals"],
  });

  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance }: { userId: string; balance: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/balance`, { balance });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Balance updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateDepositMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/deposits/${id}`, { status, adminId: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/deposits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Deposit updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      toast({ title: "Withdrawal updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          Admin Dashboard
        </h1>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="deposits" className="gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Deposits
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users ({users.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{u.username}</div>
                          <div className="text-sm text-muted-foreground">
                            Balance: <span className="text-amber-400">{u.balance?.toLocaleString() || 0} PKR</span>
                            {" | "}Miners: <span className="text-blue-400">{u.totalMiners || 0}</span>
                            {u.isAdmin && (
                              <Badge className="ml-2 bg-purple-500/20 text-purple-400">Admin</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="New balance"
                            className="w-28"
                            value={balanceInput[u.id] || ""}
                            onChange={(e) => setBalanceInput({ ...balanceInput, [u.id]: e.target.value })}
                            data-testid={`input-balance-${u.id}`}
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              const newBalance = parseFloat(balanceInput[u.id]);
                              if (!isNaN(newBalance)) {
                                updateBalanceMutation.mutate({ userId: u.id, balance: newBalance });
                                setBalanceInput({ ...balanceInput, [u.id]: "" });
                              }
                            }}
                            disabled={updateBalanceMutation.isPending}
                            data-testid={`button-update-balance-${u.id}`}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  Deposit Requests ({deposits.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {depositsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : deposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No deposit requests yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deposits.map((d: any) => {
                      const depositUser = users.find((u: any) => u.id === d.userId);
                      return (
                        <div key={d.id} className="p-4 rounded-lg bg-background/50 border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{depositUser?.username || "Unknown User"}</div>
                              <div className="text-lg font-bold text-green-400">{d.amount?.toLocaleString()} PKR</div>
                            </div>
                            {getStatusBadge(d.status)}
                          </div>
                          <div className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">TX ID:</span> <span className="font-mono">{d.transactionId}</span></div>
                            <div><span className="text-muted-foreground">Date:</span> {new Date(d.createdAt).toLocaleString()}</div>
                          </div>
                          {d.screenshotUrl && (
                            <div>
                              <a
                                href={d.screenshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-sm"
                              >
                                View Screenshot
                              </a>
                            </div>
                          )}
                          {d.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateDepositMutation.mutate({ id: d.id, status: "approved" })}
                                disabled={updateDepositMutation.isPending}
                                data-testid={`button-approve-deposit-${d.id}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateDepositMutation.mutate({ id: d.id, status: "rejected" })}
                                disabled={updateDepositMutation.isPending}
                                data-testid={`button-reject-deposit-${d.id}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                  Withdrawal Requests ({withdrawals.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {withdrawalsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No withdrawal requests yet
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((w: any) => {
                      const withdrawalUser = users.find((u: any) => u.id === w.userId);
                      return (
                        <div key={w.id} className="p-4 rounded-lg bg-background/50 border border-border space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{withdrawalUser?.username || "Unknown User"}</div>
                              <div className="text-lg font-bold text-red-400">{w.amount?.toLocaleString()} PKR</div>
                            </div>
                            {getStatusBadge(w.status)}
                          </div>
                          <div className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">Account:</span> <span className="font-mono">{w.accountNumber}</span></div>
                            <div><span className="text-muted-foreground">Date:</span> {new Date(w.createdAt).toLocaleString()}</div>
                          </div>
                          {w.status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateWithdrawalMutation.mutate({ id: w.id, status: "approved" })}
                                disabled={updateWithdrawalMutation.isPending}
                                data-testid={`button-approve-withdrawal-${w.id}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateWithdrawalMutation.mutate({ id: w.id, status: "rejected" })}
                                disabled={updateWithdrawalMutation.isPending}
                                data-testid={`button-reject-withdrawal-${w.id}`}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
