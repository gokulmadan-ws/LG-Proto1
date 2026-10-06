import * as React from "react";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` is the brand blue. */
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  /** Font Awesome solid icon name (without the `fa-` prefix), e.g. "plus". */
  leftIcon?: string;
  rightIcon?: string;
  /** Shows a spinner and blocks interaction (sets aria-busy). */
  loading?: boolean;
  disabled?: boolean;
}
export declare const Button: React.FC<ButtonProps>;
export default Button;
