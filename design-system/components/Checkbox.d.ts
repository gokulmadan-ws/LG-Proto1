import * as React from "react";
export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  onChange?: (checked: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
}
export declare const Checkbox: React.FC<CheckboxProps>;
export default Checkbox;
