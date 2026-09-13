import { useEffect, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileCharacter } from "@/components/profiles/profile-character";
import { PageHeader } from "@/components/ui/page-header";
import { NewProfileDialog } from "@/features/profiles/new-profile-dialog";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile } from "@/types/domain";

function shapeFor(body?: BodyProfile | null) {
  if (!body) return "slim" as const;
  return body.weightKg / ((body.heightCm / 100) ** 2) >= 25 ? "round" as const : "slim" as const;
}

export function ProfilesPage() {
  const navigate = useNavigate();
  const token = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const setActiveProfile = useAppStore((state) => state.setActiveProfile);
  const { profiles, isLoading, error } = useProfileStore();
  const [bodies, setBodies] = useState<Record<string, BodyProfile | null>>({});
  const [wavingId, setWavingId] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !profiles.length) return;
    let alive = true;
    void Promise.all(profiles.map(async (profile) => [profile.id, (await loadBodyProfile(token, profile.id)).body] as const)).then((items) => { if (alive) setBodies(Object.fromEntries(items)); }).catch(() => undefined);
    return () => { alive = false; };
  }, [profiles, token]);
  const choose = (id: string) => {
    setActiveProfile(id); setWavingId(id);
    window.setTimeout(() => navigate("/profile/body"), 540);
  };
  return <div className="mx-auto max-w-6xl"><PageHeader eyebrow="Your people" title="档案与指标" description="每个角色都有独立的目标、记录和推荐。选择一个角色，他会先和你打招呼。" action={<NewProfileDialog />} />
    {error && <p className="mb-5 border-l-2 border-[#c56455] bg-[#fff6f4] px-3 py-2 text-sm text-[#9f4336] dark:bg-[#34211f] dark:text-[#f0aaa0]">{error}</p>}
    {isLoading ? <p className="subtle-text text-sm">正在唤醒你的角色...</p> : profiles.length ? <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{profiles.map((profile) => { const body = bodies[profile.id]; const active = profile.id === activeProfileId; return <button key={profile.id} onClick={() => choose(profile.id)} className={`panel group min-h-64 rounded-md p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#a8c7a2] ${active ? "ring-1 ring-[#77a36f]" : ""}`}><div className="flex items-start justify-between"><ProfileCharacter sex={body?.sex} size={shapeFor(body)} accent={profile.accent} waving={wavingId === profile.id} className="scale-[1.45] origin-top-left" /><span className={`rounded-full px-2.5 py-1 text-xs ${active ? "bg-[#e5f1df] text-[#3c6b43] dark:bg-[#314a32] dark:text-[#d7ebd1]" : "bg-[#f0f3ed] text-[#718073] dark:bg-[#29352b] dark:text-[#b3c1b4]"}`}>{active ? "当前使用" : "点击切换"}</span></div><div className="mt-10"><h2 className="text-xl font-bold">{profile.displayName}</h2><p className="subtle-text mt-1 text-sm">{body ? `${body.sex === "female" ? "女" : "男"} · ${shapeFor(body) === "round" ? "圆润型" : "轻盈型"} · ${body.goal === "fat_loss" ? "减脂" : body.goal === "muscle_gain" ? "增肌" : "维持"}` : "等待填写身体指标"}</p></div><span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#55745c] dark:text-[#b6d6b9]">查看指标 <ArrowRight size={15} /></span></button>; })}</section> : <div className="panel flex min-h-64 flex-col items-center justify-center rounded-md px-6 text-center"><UserRound className="text-[#7e9281]" size={28} /><h2 className="mt-4 text-base font-semibold">从第一位角色开始</h2><p className="subtle-text mt-2 max-w-sm text-sm leading-6">创建档案后填写身体指标，系统就能为他安排每天的热量与菜谱建议。</p><div className="mt-5"><NewProfileDialog /></div></div>}
    {profiles.length > 0 && <div className="mt-8 border-t border-dashed border-[#d7e1d2] pt-6 dark:border-[#405041]"><NewProfileDialog /></div>}
  </div>;
}
