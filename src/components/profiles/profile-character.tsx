import { cn } from "@/lib/utils";
import type { Sex } from "@/types/domain";

export function ProfileCharacter({ sex = "female", size = "slim", accent = "#7caa74", waving = false, className }: { sex?: Sex; size?: "slim" | "round"; accent?: string; waving?: boolean; className?: string }) {
  return <span className={cn("profile-character", `profile-character--${sex}`, `profile-character--${size}`, waving && "profile-character--wave", className)} style={{ "--character-accent": accent } as React.CSSProperties} aria-hidden="true">
    <i className="profile-character__hair" />
    <i className="profile-character__head"><b /><b /></i>
    <i className="profile-character__body" />
    <i className="profile-character__arm profile-character__arm--left" />
    <i className="profile-character__arm profile-character__arm--right" />
    <i className="profile-character__leg profile-character__leg--left" />
    <i className="profile-character__leg profile-character__leg--right" />
  </span>;
}
