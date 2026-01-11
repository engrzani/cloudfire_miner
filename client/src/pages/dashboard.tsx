import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Flame, User, Phone, Cpu, TrendingUp, MessageCircle, Sparkles } from "lucide-react";
import { SiFacebook, SiWhatsapp, SiTelegram } from "react-icons/si";
import { FloatingCoins } from "@/components/floating-coins";
import { MiningButton } from "@/components/mining-button";
import { StatsCards } from "@/components/stats-cards";
import { BottomNav } from "@/components/bottom-nav";
import { AnnouncementsCarousel } from "@/components/announcements-carousel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MINING_MACHINES_DATA } from "@shared/schema";

export default function Dashboard() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [nextClaimTime, setNextClaimTime] = useState<Date | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  const { data: miningStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/mining/status", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/mining/status/${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch mining status");
      return res.json();
    },
    enabled: !!user?.id,
    refetchInterval: 60000,
  });

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: userMachines = [] } = useQuery<any[]>({
    queryKey: ["/api/machines/owned", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/machines/owned/${user?.id}`);
      if (!res.ok) throw new Error("Failed to fetch machines");
      return res.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (miningStatus?.serverTime) {
      const serverNow = new Date(miningStatus.serverTime).getTime();
      const clientNow = Date.now();
      setServerTimeOffset(serverNow - clientNow);
    }
    if (miningStatus?.nextClaimTime) {
      setNextClaimTime(new Date(miningStatus.nextClaimTime));
    } else {
      setNextClaimTime(null);
    }
  }, [miningStatus]);

  useEffect(() => {
    if (userData) {
      login(userData);
    }
  }, [userData, login]);

  const claimRewardMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mining/claim", { userId: user?.id });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mining/status", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      toast({
        title: "Reward claimed!",
        description: `You earned $${data.reward.toFixed(2)} from ${data.machinesClaimed} machine(s)!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to claim reward",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const hasClaimable = miningStatus?.claimableMachines > 0;
  const hasMachines = miningStatus?.totalMachines > 0;
  const isLoading = statusLoading || claimRewardMutation.isPending;

  const machinesWithData = userMachines.map((um: any) => {
    const machineData = MINING_MACHINES_DATA.find(m => m.id === um.machineId);
    const purchaseDate = new Date(um.purchasedAt);
    const durationDays = machineData?.duration || 60;
    const endDate = new Date(purchaseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const totalDuration = endDate.getTime() - purchaseDate.getTime();
    const elapsed = now.getTime() - purchaseDate.getTime();
    const progressPercent = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    return {
      ...um,
      machineData,
      progressPercent,
      daysRemaining,
      isActive: daysRemaining > 0,
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-24 overflow-y-auto">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          CloudFire
        </h1>
      </header>

      <FloatingCoins />

      <main className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-card/50 border border-border/50">
          <div className="p-2 rounded-full bg-gradient-to-br from-blue-500 to-amber-500">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold" data-testid="text-dashboard-username">
              {userData?.username || user?.username}
            </h2>
            {(userData?.phoneNumber || user?.phoneNumber) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground" data-testid="text-dashboard-phone">
                <Phone className="w-3 h-3" />
                {userData?.phoneNumber || user?.phoneNumber}
              </div>
            )}
          </div>
        </div>

        <StatsCards
          totalAssets={userData?.balance ?? user?.balance ?? 0}
          totalMiners={userData?.totalMiners ?? user?.totalMiners ?? 0}
        />

        <div className="flex justify-center py-6">
          <MiningButton
            hasMachines={hasMachines}
            hasClaimable={hasClaimable}
            claimableReward={miningStatus?.claimableReward || 0}
            claimableMachines={miningStatus?.claimableMachines || 0}
            nextClaimTime={nextClaimTime}
            serverTimeOffset={serverTimeOffset}
            onClaimReward={() => claimRewardMutation.mutate()}
            onTimerExpired={() => refetchStatus()}
            isLoading={isLoading}
          />
        </div>

        {machinesWithData.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold">Active Machines</h2>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {machinesWithData.filter(m => m.isActive).length} Running
              </Badge>
            </div>

            <div className="space-y-3">
              {machinesWithData.map((machine: any) => (
                <Card key={machine.id} className="bg-gradient-to-br from-blue-500/5 to-amber-500/5 border-blue-500/20 overflow-visible">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white" />
                          </div>
                          {machine.isActive && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold">{machine.machineData?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            Level {machine.machineData?.level || 1}
                          </div>
                        </div>
                      </div>
                      <Badge className={machine.isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}>
                        {machine.isActive ? "Running" : "Expired"}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-1 text-amber-400">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">${machine.machineData?.dailyProfit || 0}/day</span>
                      </div>
                      <span className="text-muted-foreground">{machine.daysRemaining} days left</span>
                    </div>

                    <div className="space-y-1">
                      <Progress value={machine.progressPercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Contract Progress</span>
                        <span>{Math.round(machine.progressPercent)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {machinesWithData.length === 0 && (
          <Card className="bg-gradient-to-br from-blue-500/5 to-amber-500/5 border-blue-500/20">
            <CardContent className="p-6 text-center">
              <Cpu className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="font-semibold mb-1">No Active Machines</h3>
              <p className="text-sm text-muted-foreground">
                Rent mining machines to increase your daily earnings!
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" style={{ filter: "drop-shadow(0 0 6px rgba(251, 191, 36, 0.6))" }} />
            <h2 
              className="text-lg font-bold"
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              What's New
            </h2>
          </div>

          <AnnouncementsCarousel />
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Customer Support</h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 bg-green-500/10 border-green-500/30 hover:bg-green-500/20"
              onClick={() => window.open("https://wa.me/923001234567", "_blank")}
              data-testid="button-support-whatsapp"
            >
              <SiWhatsapp className="w-6 h-6 text-green-500" />
              <span className="text-xs">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20"
              onClick={() => window.open("https://facebook.com/cloudfire", "_blank")}
              data-testid="button-support-facebook"
            >
              <SiFacebook className="w-6 h-6 text-blue-500" />
              <span className="text-xs">Facebook</span>
            </Button>

            <Button
              variant="outline"
              className="flex flex-col items-center gap-2 h-auto py-4 bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20"
              onClick={() => window.open("https://t.me/cloudfire", "_blank")}
              data-testid="button-support-telegram"
            >
              <SiTelegram className="w-6 h-6 text-sky-500" />
              <span className="text-xs">Telegram</span>
            </Button>
          </div>
        </div>

        <div className="text-center space-y-2 pt-4">
          <p className="text-xs text-muted-foreground">
            Press the mining button to start earning. Rent more machines to increase your daily profits!
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
