import * as React from "react";
export interface RadioProps {
  checked?: boolean;
  disabled?: boolean;
  label?: React.ReactNode;
  name?: string;
  value?: string;
  onChange?: (value: string | true) => void;
  className?: string;
  style?: React.CSSProperties;
}
export declare const Radio: React.FC<RadioProps>;
export default Radio;
