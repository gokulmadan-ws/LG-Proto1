import * as React from "react";
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "info" | "success" | "warning" | "error";
  title?: React.ReactNode;
  onClose?: () => void;
}
export declare const Toast: React.FC<ToastProps>;
export default Toast;
