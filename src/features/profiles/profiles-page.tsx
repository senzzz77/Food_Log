import { useEffect, useState } from "react";
import { ArrowRight, Trash2, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProfileCharacter } from "@/components/profiles/profile-character";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { NewProfileDialog } from "@/features/profiles/new-profile-dialog";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile, Profile } from "@/types/domain";

function shapeFor(body?: BodyProfile | null) {
  if (!body) return "slim" as const;
  return body.weightKg / ((body.heightCm / 100) ** 2) >= 25 ? "round" as const : "slim" as const;
}

export function ProfilesPage() {
  const navigate = useNavigate();
  const token = useAppStore((state) => state.authToken);
  const activeProfileId = useAppStore((state) => state.activeProfileId);
  const setActiveProfile = useAppStore((state) => state.setActiveProfile);
  const { profiles, isLoading, error, remove } = useProfileStore();
  const [bodies, setBodies] = useState<Record<string, BodyProfile | null>>({});
  const [wavingId, setWavingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeleting(true); setDeleteError(null);
    try {
      await remove(token, pendingDelete.id);
      // 删掉的是当前角色时清空选择，由外层自动切换到剩下的第一位角色。
      if (pendingDelete.id === activeProfileId) setActiveProfile(null);
      setPendingDelete(null);
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "无法删除档案。");
    } finally { setDeleting(false); }
  };
  return <div className="mx-auto max-w-6xl"><PageHeader eyebrow="Your people" title="档案与指标" description="每个角色都有独立的目标、记录和推荐。选择一个角色，他会先和你打招呼。" action={<NewProfileDialog />} />
    {error && <p className="mb-5 border-l-2 border-[#c56455] bg-[#fff6f4] px-3 py-2 text-sm text-[#9f4336] dark:bg-[#34211f] dark:text-[#f0aaa0]">{error}</p>}
    {isLoading ? <p className="subtle-text text-sm">正在唤醒你的角色...</p> : profiles.length ? <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{profiles.map((profile) => { const body = bodies[profile.id]; const active = profile.id === activeProfileId; return <div key={profile.id} className="group relative transition-transform duration-300 hover:-translate-y-1"><button onClick={() => choose(profile.id)} className={`panel flex min-h-64 w-full flex-col rounded-md p-6 text-left transition-colors duration-300 group-hover:border-[#a8c7a2] ${active ? "ring-1 ring-[#77a36f]" : ""}`}><div className="flex items-start justify-between"><ProfileCharacter sex={body?.sex} size={shapeFor(body)} accent={profile.accent} waving={wavingId === profile.id} className="scale-[1.45] origin-top-left" /><span className={`rounded-full px-2.5 py-1 text-xs ${active ? "bg-[#e5f1df] text-[#3c6b43] dark:bg-[#314a32] dark:text-[#d7ebd1]" : "bg-[#f0f3ed] text-[#718073] dark:bg-[#29352b] dark:text-[#b3c1b4]"}`}>{active ? "当前使用" : "点击切换"}</span></div><div className="mt-10"><h2 className="text-xl font-bold">{profile.displayName}</h2><p className="subtle-text mt-1 text-sm">{body ? `${body.sex === "female" ? "女" : "男"} · ${shapeFor(body) === "round" ? "圆润型" : "轻盈型"} · ${body.goal === "fat_loss" ? "减脂" : body.goal === "muscle_gain" ? "增肌" : "维持"}` : "等待填写身体指标"}</p></div><span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#55745c] dark:text-[#b6d6b9]">查看指标 <ArrowRight size={15} /></span></button><button onClick={() => { setPendingDelete(profile); setDeleteError(null); }} className="absolute bottom-6 right-6 inline-flex size-9 items-center justify-center rounded-md border border-[#e8c8c3] bg-white/85 text-[#a54739] transition-colors hover:bg-[#fff4f2] dark:border-[#643d39] dark:bg-[#202721]/85 dark:text-[#f2aaa0] dark:hover:bg-[#35201e]" title={`删除档案 ${profile.displayName}`} aria-label={`删除档案 ${profile.displayName}`}><Trash2 size={16} /></button></div>; })}</section> : <div className="panel flex min-h-64 flex-col items-center justify-center rounded-md px-6 text-center"><UserRound className="text-[#7e9281]" size={28} /><h2 className="mt-4 text-base font-semibold">从第一位角色开始</h2><p className="subtle-text mt-2 max-w-sm text-sm leading-6">创建档案后填写身体指标，系统就能为他安排每天的热量与菜谱建议。</p><div className="mt-5"><NewProfileDialog /></div></div>}
    {profiles.length > 0 && <div className="mt-8 border-t border-dashed border-[#d7e1d2] pt-6 dark:border-[#405041]"><NewProfileDialog /></div>}
    <ConfirmDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} title="删除档案" description={`删除「${pendingDelete?.displayName ?? ""}」后，他的身体指标、饮食记录与体重记录会一并清除，且无法恢复。`} pending={deleting} error={deleteError} onConfirm={() => void confirmDelete()} />
  </div>;
}
