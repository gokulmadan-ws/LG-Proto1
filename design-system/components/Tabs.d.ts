import * as React from "react";
export interface TabItem { value: string; label: React.ReactNode; icon?: string; }
export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  items: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
}
export declare const Tabs: React.FC<TabsProps>;
export default Tabs;
