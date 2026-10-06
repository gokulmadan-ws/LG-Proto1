import * as React from "react";
export interface CrumbItem { label: React.ReactNode; href?: string; icon?: string; }
export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: CrumbItem[];
}
export declare const Breadcrumb: React.FC<BreadcrumbProps>;
export default Breadcrumb;
