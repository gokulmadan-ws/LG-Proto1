import * as React from "react";
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** 1–2 letter fallback when no image. */
  initials?: string;
  size?: number;
  shape?: "circle" | "rounded";
  status?: "online" | "away" | "busy" | "offline";
}
export declare const Avatar: React.FC<AvatarProps>;
export default Avatar;
