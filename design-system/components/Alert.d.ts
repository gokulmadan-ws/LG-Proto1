import * as React from "react";
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "info" | "success" | "warning" | "error";
  title?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}
export declare const Alert: React.FC<AlertProps>;
export default Alert;
