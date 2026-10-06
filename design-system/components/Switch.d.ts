import * as React from "react";
export interface SwitchProps {
  checked?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: React.ReactNode;
  onChange?: (checked: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}
export declare const Switch: React.FC<SwitchProps>;
export default Switch;
