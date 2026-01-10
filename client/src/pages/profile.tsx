import { useQuery } from "@tanstack/react-query";
import { Flame, User, Wallet, Cpu, Gift, LogOut, CreditCard, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userData, isLoading } = useQuery<any>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const displayUser = userData || user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-20">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          CloudFire
        </h1>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-amber-500 flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-32" />
          ) : (
            <h2 className="text-2xl font-bold" data-testid="text-username">
              {displayUser?.username}
            </h2>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Wallet className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Balance</div>
                {isLoading ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <div className="font-bold text-amber-400" data-testid="text-profile-balance">
                    {(displayUser?.balance || 0).toLocaleString()} PKR
                  </div>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Miners</div>
                {isLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <div className="font-bold text-blue-400" data-testid="text-profile-miners">
                    {displayUser?.totalMiners || 0}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Referral Earnings</div>
              {isLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <div className="font-bold text-green-400" data-testid="text-profile-referral">
                  {(displayUser?.totalReferralEarnings || 0).toLocaleString()} PKR
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setLocation("/payments")}
              data-testid="button-goto-payments"
            >
              <CreditCard className="w-5 h-5" />
              Deposit / Withdraw
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setLocation("/team")}
              data-testid="button-goto-team"
            >
              <Gift className="w-5 h-5" />
              Refer & Earn
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              onClick={() => setLocation("/admin-portal")}
              data-testid="button-goto-admin"
            >
              <Shield className="w-5 h-5" />
              Admin Panel
            </Button>
          </CardContent>
        </Card>

        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </main>

      <BottomNav />
    </div>
  );
}
