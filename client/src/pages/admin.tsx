import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Flame, Users, ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Sun, Moon, Search, Megaphone, Plus, Trash2, Image, Sparkles, Bell, Gift, Zap, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Announcement } from "@shared/schema";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balanceInput, setBalanceInput] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [minerFilter, setMinerFilter] = useState<"all" | "active" | "none">("all");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("admin-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Check if user is admin - if not, show access denied
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardContent>
            <h2 className="text-xl font-bold text-red-400 mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You do not have admin privileges.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats } = useQuery<{ totalUsers: number; totalBalance: number; totalDeposits: number }>({
    queryKey: ["/api/admin/stats", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user?.id && user?.isAdmin,
  });

  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/users", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!user?.id && user?.isAdmin,
  });

  const { data: deposits = [], isLoading: depositsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/deposits", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/deposits?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch deposits");
      return res.json();
    },
    enabled: !!user?.id && user?.isAdmin,
  });

  const { data: withdrawals = [], isLoading: withdrawalsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/withdrawals", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/withdrawals?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch withdrawals");
      return res.json();
    },
    enabled: !!user?.id && user?.isAdmin,
  });

  const { data: announcements = [], isLoading: announcementsLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/admin/announcements", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/announcements?adminId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch announcements");
      return res.json();
    },
    enabled: !!user?.id && user?.isAdmin,
  });

  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    description: "",
    iconType: "sparkles",
    isActive: true,
    priority: 0,
  });
  const [announcementImage, setAnnouncementImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createAnnouncementMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to create announcement");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      setAnnouncementForm({ title: "", description: "", iconType: "sparkles", isActive: true, priority: 0 });
      setAnnouncementImage(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast({ title: "Announcement created!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/announcements/${id}?adminId=${user?.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete announcement");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement deleted!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { isActive?: boolean; priority?: number } }) => {
      const formData = new FormData();
      formData.append("adminId", user?.id || "");
      if (data.isActive !== undefined) formData.append("isActive", String(data.isActive));
      if (data.priority !== undefined) formData.append("priority", String(data.priority));
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to update announcement");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/announcements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Announcement updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateAnnouncement = () => {
    if (!announcementForm.title || !announcementForm.description) {
      toast({ title: "Missing fields", description: "Title and description are required", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("adminId", user?.id || "");
    formData.append("title", announcementForm.title);
    formData.append("description", announcementForm.description);
    formData.append("iconType", announcementForm.iconType);
    formData.append("isActive", String(announcementForm.isActive));
    formData.append("priority", String(announcementForm.priority));
    if (announcementImage) {
      formData.append("image", announcementImage);
    }
    createAnnouncementMutation.mutate(formData);
  };

  const getIconComponent = (iconType: string) => {
    switch (iconType) {
      case "bell": return Bell;
      case "gift": return Gift;
      case "zap": return Zap;
      case "star": return Star;
      case "megaphone": return Megaphone;
      default: return Sparkles;
    }
  };

  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, balance }: { userId: string; balance: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/balance`, { balance, adminId: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Deposit updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateWithdrawalMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/withdrawals/${id}`, { status, adminId: user?.id });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
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

  const getMethodBadge = (method: string) => {
    if (method === "jazzcash") {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">JazzCash</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">EasyPaisa</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10">
      <header className="flex items-center justify-between px-4 py-4 border-b border-border/50">
        <div className="w-10" />
        <div className="flex items-center gap-2">
          <Flame className="w-8 h-8 text-amber-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
            Admin Portal
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDarkMode(!isDarkMode)}
          data-testid="button-theme-toggle"
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-400" />}
        </Button>
      </header>

      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold text-blue-400" data-testid="text-total-users">
                    {stats?.totalUsers ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-2xl font-bold text-green-400" data-testid="text-total-deposits">
                    {(stats?.totalDeposits ?? 0).toLocaleString()} PKR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Wallet className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Global Balance</p>
                  <p className="text-2xl font-bold text-amber-400" data-testid="text-global-balance">
                    {(stats?.totalBalance ?? 0).toLocaleString()} PKR
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="withdrawals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="gap-1 text-xs sm:text-sm" data-testid="tab-users">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="deposits" className="gap-1 text-xs sm:text-sm" data-testid="tab-deposits">
              <ArrowDownLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Deposits</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="gap-1 text-xs sm:text-sm" data-testid="tab-withdrawals">
              <ArrowUpRight className="w-4 h-4" />
              <span className="hidden sm:inline">Withdrawals</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="gap-1 text-xs sm:text-sm" data-testid="tab-announcements">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">News</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader className="space-y-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  All Users ({users.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by username or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-user-search"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={minerFilter === "all" ? "default" : "outline"}
                      onClick={() => setMinerFilter("all")}
                      data-testid="button-filter-all"
                    >
                      All
                    </Button>
                    <Button
                      size="sm"
                      variant={minerFilter === "active" ? "default" : "outline"}
                      onClick={() => setMinerFilter("active")}
                      className={minerFilter === "active" ? "bg-green-600 hover:bg-green-700" : ""}
                      data-testid="button-filter-active"
                    >
                      Active Miners
                    </Button>
                    <Button
                      size="sm"
                      variant={minerFilter === "none" ? "default" : "outline"}
                      onClick={() => setMinerFilter("none")}
                      className={minerFilter === "none" ? "bg-red-600 hover:bg-red-700" : ""}
                      data-testid="button-filter-none"
                    >
                      No Miners
                    </Button>
                  </div>
                </div>
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
                    {users
                      .filter((u: any) => {
                        const matchesSearch = searchQuery === "" || 
                          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.phoneNumber?.toLowerCase().includes(searchQuery.toLowerCase());
                        const matchesMiner = minerFilter === "all" ||
                          (minerFilter === "active" && (u.totalMiners || 0) > 0) ||
                          (minerFilter === "none" && (u.totalMiners || 0) === 0);
                        return matchesSearch && matchesMiner;
                      })
                      .map((u: any) => (
                      <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border">
                        <div className="flex-1">
                          <div className="font-medium">{u.username}</div>
                          <div className="text-sm text-muted-foreground">
                            {u.phoneNumber && <span className="mr-2">Phone: {u.phoneNumber}</span>}
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
                  <ArrowUpRight className="w-5 h-5 text-amber-400" />
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
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="font-medium">{withdrawalUser?.username || "Unknown User"}</div>
                              {withdrawalUser?.phoneNumber && (
                                <div className="text-sm text-muted-foreground">Phone: {withdrawalUser.phoneNumber}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getMethodBadge(w.method || "easypaisa")}
                              {getStatusBadge(w.status)}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 p-3 rounded-lg bg-background/30">
                            <div>
                              <div className="text-xs text-muted-foreground">Requested Amount</div>
                              <div className="text-lg font-bold text-amber-400">{w.amount?.toLocaleString()} PKR</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Tax Deducted (10%)</div>
                              <div className="text-lg font-bold text-red-400">-{(w.taxAmount || w.amount * 0.1)?.toLocaleString()} PKR</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-xs text-muted-foreground">Net Amount (Payable)</div>
                              <div className="text-xl font-bold text-green-400">{(w.netAmount || w.amount * 0.9)?.toLocaleString()} PKR</div>
                            </div>
                          </div>

                          <div className="text-sm space-y-1">
                            <div><span className="text-muted-foreground">Account Holder:</span> <span className="font-medium">{w.accountHolderName || "N/A"}</span></div>
                            <div><span className="text-muted-foreground">Account Number:</span> <span className="font-mono">{w.accountNumber}</span></div>
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

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  Manage Announcements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Card className="bg-gradient-to-br from-amber-500/5 to-blue-500/5 border-amber-500/20">
                  <CardHeader>
                    <CardTitle className="text-base">Create New Announcement</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ann-title">Title</Label>
                      <Input
                        id="ann-title"
                        placeholder="Enter announcement title..."
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                        data-testid="input-announcement-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ann-desc">Description</Label>
                      <Textarea
                        id="ann-desc"
                        placeholder="Enter announcement description..."
                        value={announcementForm.description}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, description: e.target.value }))}
                        rows={3}
                        data-testid="input-announcement-description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Icon Style</Label>
                        <Select
                          value={announcementForm.iconType}
                          onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, iconType: value }))}
                        >
                          <SelectTrigger data-testid="select-announcement-icon">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sparkles">Sparkles</SelectItem>
                            <SelectItem value="bell">Bell</SelectItem>
                            <SelectItem value="gift">Gift</SelectItem>
                            <SelectItem value="zap">Zap</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="megaphone">Megaphone</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ann-priority">Priority (Higher = First)</Label>
                        <Input
                          id="ann-priority"
                          type="number"
                          value={announcementForm.priority}
                          onChange={(e) => setAnnouncementForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                          data-testid="input-announcement-priority"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Banner Image (Optional)</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAnnouncementImage(e.target.files?.[0] || null)}
                          className="flex-1"
                          data-testid="input-announcement-image"
                        />
                        {announcementImage && (
                          <Badge variant="outline" className="text-green-400 border-green-500/30">
                            <Image className="w-3 h-3 mr-1" />
                            {announcementImage.name.substring(0, 20)}...
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        id="ann-active"
                        checked={announcementForm.isActive}
                        onCheckedChange={(checked) => setAnnouncementForm(prev => ({ ...prev, isActive: checked }))}
                        data-testid="switch-announcement-active"
                      />
                      <Label htmlFor="ann-active">Active (visible to users)</Label>
                    </div>
                    <Button
                      onClick={handleCreateAnnouncement}
                      disabled={createAnnouncementMutation.isPending}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                      data-testid="button-create-announcement"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createAnnouncementMutation.isPending ? "Creating..." : "Create Announcement"}
                    </Button>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <h3 className="font-semibold">Existing Announcements ({announcements.length})</h3>
                  {announcementsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No announcements yet. Create one above!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {announcements.map((ann) => {
                        const IconComp = getIconComponent(ann.iconType);
                        return (
                          <Card key={ann.id} className={`${ann.isActive ? 'border-green-500/30' : 'border-red-500/30 opacity-60'}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                    <IconComp className="w-5 h-5 text-amber-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="font-semibold">{ann.title}</span>
                                      <Badge variant="outline" className="text-xs">
                                        Priority: {ann.priority}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{ann.description}</p>
                                    {ann.imageUrl && (
                                      <img src={ann.imageUrl} alt="" className="mt-2 h-16 rounded object-cover" />
                                    )}
                                    <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border/50">
                                      <div className="flex items-center gap-2">
                                        <Switch
                                          checked={ann.isActive}
                                          onCheckedChange={(checked) => 
                                            updateAnnouncementMutation.mutate({ id: ann.id, data: { isActive: checked } })
                                          }
                                          disabled={updateAnnouncementMutation.isPending}
                                          data-testid={`switch-announcement-active-${ann.id}`}
                                        />
                                        <Label className="text-xs">{ann.isActive ? "Active" : "Inactive"}</Label>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Created: {new Date(ann.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => deleteAnnouncementMutation.mutate(ann.id)}
                                  disabled={deleteAnnouncementMutation.isPending}
                                  data-testid={`button-delete-announcement-${ann.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
