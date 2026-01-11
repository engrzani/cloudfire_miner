import { useState, useEffect } from "react";
import { Zap, Loader2 } from "lucide-react";

interface MiningButtonProps {
  hasMachines: boolean;
  hasClaimable: boolean;
  claimableReward: number;
  claimableMachines: number;
  nextClaimTime: Date | null;
  serverTimeOffset?: number;
  onClaimReward: () => void;
  onTimerExpired?: () => void;
  isLoading: boolean;
}

export function MiningButton({
  hasMachines,
  hasClaimable,
  claimableReward,
  claimableMachines,
  nextClaimTime,
  serverTimeOffset = 0,
  onClaimReward,
  onTimerExpired,
  isLoading,
}: MiningButtonProps) {
  const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

  useEffect(() => {
    if (!nextClaimTime) {
      setTimeLeft(hasClaimable ? "READY!" : "--:--:--");
      return;
    }

    const updateTimer = () => {
      const now = Date.now() + serverTimeOffset;
      const diff = nextClaimTime.getTime() - now;

      if (diff <= 0) {
        setTimeLeft("READY!");
        onTimerExpired?.();
        return true;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
      return false;
    };

    const expired = updateTimer();
    if (expired) return;

    const interval = setInterval(() => {
      const expired = updateTimer();
      if (expired) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [nextClaimTime, serverTimeOffset, hasClaimable, onTimerExpired]);

  const handleClick = () => {
    if (isLoading) return;
    if (hasClaimable) {
      onClaimReward();
    }
  };

  const buttonText = !hasMachines 
    ? "NO MACHINES" 
    : hasClaimable 
    ? "CLAIM NOW" 
    : "WAITING...";

  const subText = !hasMachines
    ? "Rent a machine to start mining"
    : hasClaimable
    ? `$${claimableReward.toFixed(2)} from ${claimableMachines} machine(s)`
    : "Next claim countdown";

  return (
    <div className="flex flex-col items-center gap-6">
      <button
        onClick={handleClick}
        disabled={isLoading || !hasClaimable}
        className={`
          relative w-48 h-48 md:w-56 md:h-56 rounded-full
          flex flex-col items-center justify-center gap-2
          transition-all duration-300 transform
          ${
            !hasMachines
              ? "bg-gradient-to-br from-gray-600 to-gray-800 cursor-not-allowed"
              : hasClaimable
              ? "bg-gradient-to-br from-amber-500 to-amber-700 hover:scale-105 active:scale-95 cursor-pointer animate-pulse-glow"
              : "bg-gradient-to-br from-blue-600 to-blue-800 cursor-not-allowed"
          }
          shadow-2xl
        `}
        data-testid="button-mining"
      >
        <div className="absolute inset-2 rounded-full border-2 border-white/20" />
        <div className="absolute inset-4 rounded-full border border-white/10" />
        
        {isLoading ? (
          <Loader2 className="w-12 h-12 text-white animate-spin" />
        ) : (
          <>
            <Zap className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-lg" />
            <span className="text-lg md:text-xl font-bold text-white drop-shadow-lg text-center px-4">
              {buttonText}
            </span>
          </>
        )}
      </button>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-1">
          {subText}
        </p>
        <p className="text-3xl md:text-4xl font-bold text-amber-400 tabular-nums tracking-wider">
          {timeLeft}
        </p>
      </div>
    </div>
  );
}
