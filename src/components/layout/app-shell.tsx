import { useEffect } from "react";
import { BookOpen, ChartNoAxesCombined, ChefHat, ClipboardList, History, Moon, Sun, UserRound } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { BroccoliMark } from "@/components/brand/broccoli-mark";
import { ProfileSwitcher } from "@/components/profiles/profile-switcher";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";

const primaryNav = [
  { to: "/recipes", label: "菜谱库", icon: BookOpen },
  { to: "/planner", label: "今日安排", icon: ChefHat },
  { to: "/diary", label: "热量记录", icon: ClipboardList },
  { to: "/progress", label: "进度", icon: ChartNoAxesCombined },
  { to: "/history", label: "饮食记录", icon: History },
  { to: "/profiles", label: "档案与指标", icon: UserRound },
];

export function AppShell() {
  const { authToken, activeProfileId, setActiveProfile, setTheme, theme } = useAppStore();
  const { profiles, load } = useProfileStore();
  useEffect(() => { if (authToken) void load(authToken); }, [authToken, load]);
  useEffect(() => { if (profiles.length && !profiles.some((profile) => profile.id === activeProfileId)) setActiveProfile(profiles[0].id); }, [activeProfileId, profiles, setActiveProfile]);

  return <div className="app-surface min-h-screen">
    <header className="app-header">
      <NavLink className="app-brand" to="/recipes" aria-label="饮食助手菜谱库"><BroccoliMark className="app-brand__mark" /><span><strong>饮食助手</strong><small>Eat in season</small></span></NavLink>
      <nav className="glass-nav" aria-label="主导航">{primaryNav.map(({ to, label, icon: Icon }) => <NavItem key={to} to={to} label={label} icon={<Icon size={15} />} />)}</nav>
      <ProfileSwitcher />
    </header>
    <aside className="theme-rail"><button className="theme-toggle" title="切换主题" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}<span>{theme === "light" ? "夜色" : "日光"}</span></button></aside>
    <main className="app-content"><Outlet /></main>
  </div>;
}

function NavItem({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return <NavLink to={to} className={({ isActive }) => cn("glass-nav__item", isActive && "glass-nav__item--active")}>{icon}<span>{label}</span></NavLink>;
}
