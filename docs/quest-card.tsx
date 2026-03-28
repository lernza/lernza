import React, { useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { Check, X, Sparkles, Hand } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatTokens } from "@/lib/utils";

interface SwipeableQuestCardProps {
  quest: {
    id: number;
    name: string;
    description: string;
    rewardAmount: bigint;
    isEnrolled: boolean;
    verified?: boolean;
  };
  onEnroll: (id: number) => Promise<void>;
  onDismiss: (id: number) => void;
  onClick: (id: number) => void;
}

const SWIPE_THRESHOLD = 100;

export function SwipeableQuestCard({
  quest,
  onEnroll,
  onDismiss,
  onClick,
}: SwipeableQuestCardProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const x = useMotionValue(0);

  // Color and icon interpolation based on swipe offset
  const opacity = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    [1, 0, 1]
  );
  const background = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    ["#ef4444", "rgba(0,0,0,0)", "#22c55e"]
  );
  const iconScale = useTransform(
    x,
    [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD],
    [1.2, 0.8, 1.2]
  );

  useEffect(() => {
    const hasSeenHint = localStorage.getItem("lernza:swipe-hint-seen");
    if (!hasSeenHint) {
      setShowHint(true);
    }
  }, []);

  const handleDragEnd = async (_: any, info: any) => {
    // Swipe Right: Quick Enroll
    if (info.offset.x > SWIPE_THRESHOLD && !quest.isEnrolled) {
      if (window.confirm(`Enroll in "${quest.name}"?`)) {
        await onEnroll(quest.id);
      }
      x.set(0);
    }
    // Swipe Left: Dismiss
    else if (info.offset.x < -SWIPE_THRESHOLD) {
      setIsDismissed(true);
      setTimeout(() => onDismiss(quest.id), 300);
    }
    // Snap back
    else {
      x.set(0);
    }

    if (showHint) {
      setShowHint(false);
      localStorage.setItem("lernza:swipe-hint-seen", "true");
    }
  };

  if (isDismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-xl touch-pan-y">
      {/* Action Layer (visible during swipe) */}
      <motion.div
        style={{ background, opacity }}
        className="absolute inset-0 flex items-center justify-between px-10 text-white"
      >
        <motion.div
          style={{ scale: iconScale }}
          className="flex flex-col items-center gap-1"
        >
          <X className="h-8 w-8" />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            Dismiss
          </span>
        </motion.div>
        <motion.div
          style={{ scale: iconScale }}
          className="flex flex-col items-center gap-1"
        >
          <Check className="h-8 w-8" />
          <span className="text-[10px] font-black uppercase tracking-tighter">
            Enroll
          </span>
        </motion.div>
      </motion.div>

      {/* Hint Overlay (first visit) */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[2px]"
          >
            <motion.div
              animate={{ x: [0, 50, -50, 0] }}
              transition={{
                repeat: Infinity,
                duration: 2.5,
                ease: "easeInOut",
              }}
              className="flex flex-col items-center text-white drop-shadow-lg"
            >
              <Hand className="h-12 w-12" />
              <span className="mt-2 text-xs font-black uppercase tracking-widest">
                Swipe to Act
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Layer */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{
          left: -SWIPE_THRESHOLD - 50,
          right: SWIPE_THRESHOLD + 50,
        }}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
        className="relative z-10 cursor-grab"
      >
        <button
          onClick={() => onClick(quest.id)}
          className="block w-full text-left transition-transform active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-primary/40 rounded-lg group"
          aria-label={`View quest details for ${quest.name}`}
        >
          <Card className="neo-lift border-border border-[3px] shadow-[6px_6px_0_var(--color-border)] transition-all group-hover:shadow-[8px_8px_0_var(--color-border)]">
            <CardContent className="p-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-xl font-black leading-tight group-hover:text-primary transition-colors">
                    {quest.name}
                  </h3>
                  {quest.verified && (
                    <Badge variant="verified" className="border-black p-1">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm font-medium">
                  {quest.description}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="secondary" className="gap-1.5 font-bold">
                    <Sparkles className="h-3.5 w-3.5" />
                    {formatTokens(Number(quest.rewardAmount))} USDC
                  </Badge>
                  {quest.isEnrolled && (
                    <Badge variant="success">Enrolled</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </button>
      </motion.div>
    </div>
  );
}
