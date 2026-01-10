import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Flame, Users, Copy, Check, Gift, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function Team() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: referrals, isLoading: referralsLoading } = useQuery<{
    level1: any[];
    level2: any[];
  }>({
    queryKey: ["/api/referrals", user?.id],
    enabled: !!user?.id,
  });

  const referralCode = userData?.referralCode || user?.referralCode || "";
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const totalReferralEarnings = userData?.totalReferralEarnings || 0;
  const level1Count = referrals?.level1?.length || 0;
  const level2Count = referrals?.level2?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-20">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          CloudFire
        </h1>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Refer & Earn</h2>
            <p className="text-sm text-muted-foreground">
              Earn commissions from your referrals
            </p>
          </div>
        </div>

        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-400">
              <Gift className="w-5 h-5" />
              Commission Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
              <span className="text-muted-foreground">Level 1 (Direct)</span>
              <span className="font-bold text-green-400">10%</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
              <span className="text-muted-foreground">Level 2 (Indirect)</span>
              <span className="font-bold text-blue-400">4%</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Earn commission on your referrals' machine purchases and deposits
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Your Referral Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border">
              <code className="flex-1 text-sm truncate text-blue-400" data-testid="text-referral-link">
                {referralLink}
              </code>
              <Button
                size="icon"
                variant="ghost"
                onClick={copyLink}
                data-testid="button-copy-referral"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link with friends. Your code: <span className="font-bold text-foreground">{referralCode}</span>
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-400" data-testid="text-referral-earnings">
              {totalReferralEarnings.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">PKR Earned</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400" data-testid="text-level1-count">
              {level1Count}
            </div>
            <div className="text-xs text-muted-foreground">Level 1</div>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400" data-testid="text-level2-count">
              {level2Count}
            </div>
            <div className="text-xs text-muted-foreground">Level 2</div>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Your Team
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referralsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (referrals?.level1?.length || 0) === 0 && (referrals?.level2?.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No referrals yet</p>
                <p className="text-sm">Share your link to start earning!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(referrals?.level1?.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Level 1 (10% commission)</h4>
                    <div className="space-y-2">
                      {referrals?.level1?.map((ref: any) => (
                        <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50" data-testid={`referral-level1-${ref.id}`}>
                          <span className="font-medium">{ref.username}</span>
                          <span className="text-sm text-green-400">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(referrals?.level2?.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Level 2 (4% commission)</h4>
                    <div className="space-y-2">
                      {referrals?.level2?.map((ref: any) => (
                        <div key={ref.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50" data-testid={`referral-level2-${ref.id}`}>
                          <span className="font-medium">{ref.username}</span>
                          <span className="text-sm text-blue-400">Active</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
