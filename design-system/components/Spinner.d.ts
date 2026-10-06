import * as React from "react";
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  thickness?: number;
  color?: string;
}
export declare const Spinner: React.FC<SpinnerProps>;
export default Spinner;
