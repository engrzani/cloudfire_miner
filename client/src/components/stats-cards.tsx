import { Wallet, Users } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StatsCardsProps {
  totalAssets: number;
  totalMiners: number;
}

export function StatsCards({ totalAssets, totalMiners }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-4 backdrop-blur-md bg-card/80 border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <Wallet className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Assets</p>
            <p className="text-xl md:text-2xl font-bold text-amber-400 tabular-nums" data-testid="text-total-assets">
              ${totalAssets.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 backdrop-blur-md bg-card/80 border-blue-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Your Miners</p>
            <p className="text-xl md:text-2xl font-bold text-blue-400 tabular-nums" data-testid="text-total-miners">
              {totalMiners}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
