import * as React from "react";
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. Ignored when indeterminate. */
  value?: number;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  tone?: "blue" | "green" | "amber" | "red";
}
export declare const Progress: React.FC<ProgressProps>;
export default Progress;
