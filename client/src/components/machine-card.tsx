import { Lock, TrendingUp, Calendar, Coins, Ban } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MachineData } from "@shared/schema";

import m1Image from "@assets/generated_images/basic_m1_mining_machine.png";
import m2Image from "@assets/generated_images/m2_dual_gpu_mining_rig.png";
import m3Image from "@assets/generated_images/m3_triple_gpu_miner.png";
import m4Image from "@assets/generated_images/m4_quad_gpu_station.png";
import m5Image from "@assets/generated_images/m5_enterprise_mining_rig.png";
import m6Image from "@assets/generated_images/m6_server_rack_miner.png";
import m7Image from "@assets/generated_images/m7_mining_supercomputer.png";
import m8Image from "@assets/generated_images/m8_mining_farm_module.png";
import m9Image from "@assets/generated_images/m9_elite_mining_array.png";
import m10Image from "@assets/generated_images/m10_quantum_supernode.png";

const machineImages: Record<string, string> = {
  m1: m1Image,
  m2: m2Image,
  m3: m3Image,
  m4: m4Image,
  m5: m5Image,
  m6: m6Image,
  m7: m7Image,
  m8: m8Image,
  m9: m9Image,
  m10: m10Image,
};

interface MachineCardProps {
  machine: MachineData;
  canAfford: boolean;
  owned: number;
  onRent: () => void;
  isLoading: boolean;
}

export function MachineCard({
  machine,
  canAfford,
  owned,
  onRent,
  isLoading,
}: MachineCardProps) {
  const isHighTier = machine.level >= 8;
  const isMidTier = machine.level >= 4 && machine.level < 8;
  const totalProfit = machine.dailyProfit * machine.duration;
  const remainingRentals = machine.maxRentals - owned;
  const limitReached = remainingRentals <= 0;

  return (
    <Card
      className={`
        p-4 transition-all duration-200
        ${
          isHighTier
            ? "border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/10 to-transparent"
            : isMidTier
            ? "border-l-4 border-l-blue-400 bg-gradient-to-r from-blue-500/5 to-transparent"
            : "border-l-4 border-l-blue-600"
        }
        ${canAfford && !limitReached ? "hover-elevate" : "opacity-60"}
      `}
      data-testid={`card-machine-${machine.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
          <img
            src={machineImages[machine.id]}
            alt={machine.name}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-lg">{machine.name}</h3>
            {owned > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">
                x{owned} owned
              </span>
            )}
            <span 
              className={`px-2 py-0.5 text-xs rounded-full ${
                limitReached 
                  ? "bg-red-500/20 text-red-400" 
                  : "bg-blue-500/20 text-blue-400"
              }`}
              data-testid={`text-limit-${machine.id}`}
            >
              Limit: {remainingRentals}/{machine.maxRentals}
            </span>
          </div>

          <p className="text-foreground font-semibold text-lg">
            ${machine.price.toLocaleString()}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-medium" data-testid={`text-daily-${machine.id}`}>
                +${machine.dailyProfit.toLocaleString()}/day
              </span>
            </div>
            <div className="flex items-center gap-1 text-amber-400">
              <Coins className="w-3.5 h-3.5" />
              <span className="font-medium" data-testid={`text-total-${machine.id}`}>
                Total: ${totalProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground col-span-2">
              <Calendar className="w-3.5 h-3.5" />
              <span data-testid={`text-duration-${machine.id}`}>
                Duration: {machine.duration} Days
              </span>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 self-center">
          {limitReached ? (
            <Button
              disabled
              variant="outline"
              className="min-w-[100px] opacity-50 cursor-not-allowed"
              data-testid={`button-limit-${machine.id}`}
            >
              <Ban className="w-4 h-4 mr-1" />
              Limit Reached
            </Button>
          ) : canAfford ? (
            <Button
              onClick={onRent}
              disabled={isLoading}
              className={`
                min-w-[80px]
                ${
                  isHighTier
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                }
              `}
              data-testid={`button-rent-${machine.id}`}
            >
              Rent
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span className="text-sm">Locked</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
