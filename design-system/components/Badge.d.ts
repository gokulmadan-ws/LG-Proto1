import * as React from "react";
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "blue" | "green" | "amber" | "red" | "purple";
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md" | "lg";
  /** Leading status dot in the current tone colour. */
  dot?: boolean;
  /** Font Awesome solid icon name (without `fa-`). */
  leftIcon?: string;
  /** When provided, renders a trailing × that calls this handler (tag mode). */
  onRemove?: () => void;
}
export declare const Badge: React.FC<BadgeProps>;
export default Badge;
