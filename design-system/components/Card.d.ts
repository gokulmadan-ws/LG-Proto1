import * as React from "react";
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned footer row, divided from the body. */
  footer?: React.ReactNode;
  padding?: number;
  /** Adds elevation shadow. */
  elevated?: boolean;
}
export declare const Card: React.FC<CardProps>;
export default Card;
