import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-[#315d47] text-white hover:bg-[#274b39] disabled:bg-[#8da294]",
    secondary: "border border-[#d8ddd6] bg-white text-[#2b342d] hover:bg-[#f1f4ef] dark:border-[#3b443d] dark:bg-[#202721] dark:text-[#e7ebe5] dark:hover:bg-[#283129]",
    ghost: "text-[#566059] hover:bg-[#eef1eb] dark:text-[#b7c0b8] dark:hover:bg-[#29312a]",
    danger: "border border-[#e8c8c3] text-[#a54739] hover:bg-[#fff4f2] dark:border-[#643d39] dark:text-[#f2aaa0] dark:hover:bg-[#35201e]",
  };
  return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed", variants[variant], className)} {...props} />;
}
