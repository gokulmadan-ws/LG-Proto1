import * as React from "react";
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}
export declare const Textarea: React.FC<TextareaProps>;
export default Textarea;
