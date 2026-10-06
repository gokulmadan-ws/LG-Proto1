import * as React from "react";
export interface TooltipProps {
  label: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export declare const Tooltip: React.FC<TooltipProps>;
export default Tooltip;
