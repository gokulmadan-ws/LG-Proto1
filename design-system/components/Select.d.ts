import * as React from "react";
export interface SelectOption { value: string; label: string; }
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Option list; strings or {value,label}. Omit to pass <option> children. */
  options?: (string | SelectOption)[];
  size?: "sm" | "md" | "lg";
  error?: boolean;
}
export declare const Select: React.FC<SelectProps>;
export default Select;
