"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showValue?: boolean;
}

export function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
  showValue = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const displayValue = hoverValue || value;

  return (
    <div className="inline-flex items-center gap-1">
      <div className="star-rating-input flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className={cn(
              "transition-all duration-150",
              !readonly && "cursor-pointer"
            )}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => !readonly && setHoverValue(0)}
            onClick={() => onChange?.(star)}
          >
            <Star
              className={cn(
                sizes[size],
                "transition-colors duration-150",
                star <= displayValue
                  ? "fill-amber-400 text-amber-400"
                  : "fill-transparent text-[var(--color-border)]"
              )}
            />
          </label>
        ))}
      </div>
      {showValue && (
        <span className="ml-1.5 text-sm font-semibold text-[var(--color-text-secondary)] tabular-nums">
          {value > 0 ? value.toFixed(1) : "—"}
        </span>
      )}
    </div>
  );
}

// Compact version for criterion rating
interface CriterionRatingProps {
  label: string;
  icon?: React.ReactNode;
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export function CriterionRating({
  label,
  icon,
  value,
  onChange,
  readonly = false,
}: CriterionRatingProps) {
  return (
    <div className="flex items-center justify-between py-2.5 px-1">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
            {icon}
          </div>
        )}
        <span className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </span>
      </div>
      <StarRating value={value} onChange={onChange} size="sm" readonly={readonly} />
    </div>
  );
}
