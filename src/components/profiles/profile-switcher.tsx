import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ProfileCharacter } from "@/components/profiles/profile-character";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile } from "@/types/domain";

function getCharacterShape(body?: BodyProfile | null) {
  if (!body) return "slim" as const;
  const bmi = body.weightKg / ((body.heightCm / 100) ** 2);
  return bmi >= 25 ? "round" as const : "slim" as const;
}

export function ProfileSwitcher() {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const token = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const setActiveProfile = useAppStore((state) => state.setActiveProfile);
  const logout = useAppStore((state) => state.logout);
  const { profiles, reset } = useProfileStore();
  const [open, setOpen] = useState(false);
  const [bodies, setBodies] = useState<Record<string, BodyProfile | null>>({});
  const [wavingId, setWavingId] = useState<string | null>(null);
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);

  useEffect(() => {
    if (!token || !profiles.length) return;
    let alive = true;
    void Promise.all(profiles.map(async (profile) => [profile.id, (await loadBodyProfile(token, profile.id)).body] as const))
      .then((entries) => { if (alive) setBodies(Object.fromEntries(entries)); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [profiles, token]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const activeBody = activeProfileId ? bodies[activeProfileId] : null;
  const triggerLabel = useMemo(() => activeProfile?.displayName ?? "选择档案", [activeProfile?.displayName]);
  const choose = (id: string) => {
    setActiveProfile(id);
    setWavingId(id);
    window.setTimeout(() => setWavingId(null), 950);
    window.setTimeout(() => setOpen(false), 650);
  };
  const leave = () => { reset(); logout(); navigate("/"); };

  return <div ref={rootRef} className="profile-switcher">
    <button className="profile-trigger" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog">
      {activeProfile ? <ProfileCharacter sex={activeBody?.sex} size={getCharacterShape(activeBody)} accent={activeProfile.accent} className="profile-trigger__character" /> : <span className="profile-trigger__empty" />}
      <span className="profile-trigger__text"><small>当前档案</small><strong>{triggerLabel}</strong></span>
      <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
    </button>
    {open && <div className="profile-popover" role="dialog" aria-label="切换人物档案">
      <div className="profile-popover__heading"><div><p>你的角色</p><h2>挑选今天一起吃饭的人</h2></div><span>{profiles.length} 位</span></div>
      <div className="profile-popover__grid">
        {profiles.map((profile) => {
          const body = bodies[profile.id];
          const selected = profile.id === activeProfileId;
          return <button key={profile.id} onClick={() => choose(profile.id)} className={`profile-choice ${selected ? "profile-choice--active" : ""}`}>
            <ProfileCharacter sex={body?.sex} size={getCharacterShape(body)} accent={profile.accent} waving={wavingId === profile.id} />
            <span><strong>{profile.displayName}</strong><small>{body ? `${body.sex === "female" ? "女" : "男"} · ${getCharacterShape(body) === "round" ? "圆润型" : "轻盈型"}` : "等待填写指标"}</small></span>
          </button>;
        })}
        <Link to="/profiles" className="profile-choice profile-choice--new" onClick={() => setOpen(false)}><Plus size={20} /><span><strong>新建档案</strong><small>添加另一位角色</small></span></Link>
      </div>
      <button className="profile-popover__logout" onClick={leave}><LogOut size={15} />退出登录</button>
    </div>}
  </div>;
}
