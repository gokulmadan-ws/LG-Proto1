import * as React from "react";
export interface AccordionItem { title: React.ReactNode; content: React.ReactNode; }
export interface AccordionProps {
  items: AccordionItem[];
  /** Allow more than one panel open at once. */
  allowMultiple?: boolean;
  /** Indices open on first render. */
  defaultOpen?: number[];
  className?: string;
  style?: React.CSSProperties;
}
export declare const Accordion: React.FC<AccordionProps>;
export default Accordion;
