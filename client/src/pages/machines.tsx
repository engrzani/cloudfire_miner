import { useQuery, useMutation } from "@tanstack/react-query";
import { Flame, Cpu } from "lucide-react";
import { MachineCard } from "@/components/machine-card";
import { BottomNav } from "@/components/bottom-nav";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MINING_MACHINES_DATA } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Machines() {
  const { user, login } = useAuth();
  const { toast } = useToast();

  const { data: userData, isLoading: userLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: userMachines = [], isLoading: machinesLoading } = useQuery<{ machineId: string }[]>({
    queryKey: ["/api/machines/owned", user?.id],
    enabled: !!user?.id,
  });

  const rentMutation = useMutation({
    mutationFn: async (machineId: string) => {
      const res = await apiRequest("POST", "/api/machines/rent", {
        userId: user?.id,
        machineId,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/machines/owned", user?.id] });
      if (data.user) {
        login(data.user);
      }
      toast({
        title: "Machine rented!",
        description: `You've successfully rented a new mining machine.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rental failed",
        description: error.message || "Could not rent this machine",
        variant: "destructive",
      });
    },
  });

  const balance = userData?.balance ?? user?.balance ?? 0;
  const isLoading = userLoading || machinesLoading;

  const machineOwnershipCount = (machineId: string) => {
    return userMachines.filter((m) => m.machineId === machineId).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-blue-950/10 pb-20">
      <header className="flex items-center justify-center gap-2 py-4 border-b border-border/50">
        <Flame className="w-8 h-8 text-amber-400" />
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-amber-400 bg-clip-text text-transparent">
          CloudFire
        </h1>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Cpu className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Mining Machines</h2>
            <p className="text-sm text-muted-foreground">
              Balance:{" "}
              <span className="text-amber-400 font-semibold" data-testid="text-balance">
                ${balance.toLocaleString()}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))
            : MINING_MACHINES_DATA.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  canAfford={balance >= machine.price}
                  owned={machineOwnershipCount(machine.id)}
                  onRent={() => rentMutation.mutate(machine.id)}
                  isLoading={rentMutation.isPending}
                />
              ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
