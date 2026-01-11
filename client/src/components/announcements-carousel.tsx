import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Sparkles, Bell, Gift, Zap, Star, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Announcement } from "@shared/schema";

const ICON_MAP: Record<string, any> = {
  sparkles: Sparkles,
  bell: Bell,
  gift: Gift,
  zap: Zap,
  star: Star,
  megaphone: Megaphone,
};

const FALLBACK_ANNOUNCEMENTS = [
  { id: "1", title: "Welcome to CloudFire!", description: "Start mining today and earn daily profits.", iconType: "sparkles" },
  { id: "2", title: "Referral Bonus Active", description: "Invite friends and earn 10% from their deposits.", iconType: "gift" },
  { id: "3", title: "New Machines Available", description: "Check out M10 with up to $31.75 daily profit.", iconType: "zap" },
];

export function AnnouncementsCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const { data: announcements = [] } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    refetchInterval: 60000,
  });

  const items = announcements.length > 0 ? announcements : FALLBACK_ANNOUNCEMENTS;

  useEffect(() => {
    if (!isAutoPlaying || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, items.length]);

  const goToPrev = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setIsAutoPlaying(false);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const currentItem = items[currentIndex];
  const IconComponent = ICON_MAP[currentItem?.iconType || "sparkles"] || Sparkles;

  return (
    <div className="relative">
      <div 
        className="relative overflow-hidden rounded-xl border border-amber-500/30"
        style={{
          background: "linear-gradient(135deg, rgba(251, 191, 36, 0.08) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(251, 191, 36, 0.05) 100%)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(circle at 30% 20%, rgba(251, 191, 36, 0.15) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
          }}
        />
        
        <div className="relative p-5">
          {'imageUrl' in currentItem && currentItem.imageUrl && typeof currentItem.imageUrl === 'string' ? (
            <div className="mb-4 rounded-lg overflow-hidden">
              <img 
                src={currentItem.imageUrl as string} 
                alt={currentItem.title}
                className="w-full h-40 object-cover"
              />
            </div>
          ) : null}

          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.1) 100%)",
                  boxShadow: "0 0 20px rgba(251, 191, 36, 0.4), 0 0 40px rgba(251, 191, 36, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                }}
              >
                <IconComponent 
                  className="w-7 h-7"
                  style={{
                    color: "#fbbf24",
                    filter: "drop-shadow(0 0 8px rgba(251, 191, 36, 0.8))",
                  }}
                />
              </div>
              <div 
                className="absolute -inset-1 rounded-xl opacity-50 blur-sm -z-10"
                style={{
                  background: "linear-gradient(135deg, rgba(251, 191, 36, 0.4) 0%, transparent 100%)",
                }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <h3 
                className="text-lg font-bold mb-1 leading-tight"
                style={{
                  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fcd34d 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  textShadow: "0 0 30px rgba(251, 191, 36, 0.3)",
                }}
              >
                {currentItem.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentItem.description}
              </p>
            </div>
          </div>

          {items.length > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
              <div className="flex gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setIsAutoPlaying(false);
                      setCurrentIndex(i);
                      setTimeout(() => setIsAutoPlaying(true), 10000);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentIndex 
                        ? "w-6 bg-gradient-to-r from-amber-400 to-amber-500" 
                        : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                    style={i === currentIndex ? {
                      boxShadow: "0 0 8px rgba(251, 191, 36, 0.6)",
                    } : {}}
                    data-testid={`button-carousel-dot-${i}`}
                  />
                ))}
              </div>

              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goToPrev}
                  className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                  data-testid="button-carousel-prev"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goToNext}
                  className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
                  data-testid="button-carousel-next"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
