import * as React from "react";
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "text" | "rect" | "circle";
  width?: number | string;
  height?: number | string;
}
export declare const Skeleton: React.FC<SkeletonProps>;
export default Skeleton;
