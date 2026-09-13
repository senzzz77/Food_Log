import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("field h-10 w-full rounded-md px-3 text-sm transition-colors", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn("field h-10 w-full rounded-md px-3 text-sm transition-colors", className)} {...props}>{children}</select>;
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-[#3c463e] dark:text-[#d1d8d1]">{children}</label>;
}
