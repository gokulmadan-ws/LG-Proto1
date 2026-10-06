import * as React from "react";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  size?: "sm" | "md" | "lg";
  /** Font Awesome solid icon name (without `fa-`) shown inside, leading. */
  leftIcon?: string;
  /** Red border + focus ring; also sets aria-invalid. */
  error?: boolean;
}
export declare const Input: React.FC<InputProps>;
export default Input;
