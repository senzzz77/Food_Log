import { useEffect, useState } from "react";
import { ArrowRight, Flame, Scale, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { calculateMetabolism } from "@/lib/calculations";
import { formatCalories } from "@/lib/utils";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile } from "@/types/domain";

export function DashboardPage() {
  const token = useAppStore((state) => state.authToken); const profileId = useAppStore((state) => state.activeProfileId); const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [body, setBody] = useState<BodyProfile | null>(null);
  useEffect(() => { if (token && profileId) void loadBodyProfile(token, profileId).then(({ body }) => setBody(body ? { ...body, profileId, userId: "", updatedAt: "" } : null)).catch(() => setBody(null)); }, [profileId, token]);
  if (!profile) return <div className="mx-auto max-w-4xl"><PageHeader eyebrow="Dashboard" title="从一份人物档案开始" description="创建档案并填写基础信息后，即可获得匹配目标的菜谱与热量参考。" /><Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#315d47] px-4 text-sm font-medium text-white hover:bg-[#274b39]" to="/profiles">创建档案 <ArrowRight size={16} /></Link></div>;
  const result = body ? calculateMetabolism(body) : null;
  return <div className="mx-auto max-w-5xl"><PageHeader eyebrow={`欢迎回来，${profile.displayName}`} title="今日概览" description="先确定你的基础指标，再从适合当前目标的菜谱开始安排一天。" action={<Link className="inline-flex h-10 items-center gap-2 rounded-md bg-[#315d47] px-4 text-sm font-medium text-white hover:bg-[#274b39]" to="/recipes">浏览菜谱 <ArrowRight size={16} /></Link>} />
    {result && body ? <div className="grid gap-3 md:grid-cols-3"><Summary icon={Flame} label="目标摄入" value={`${formatCalories(result.targetCalories.midpoint)} kcal`} detail={`${formatCalories(result.targetCalories.low)} - ${formatCalories(result.targetCalories.high)} kcal`} /><Summary icon={Target} label="每日总消耗" value={`${formatCalories(result.tdee)} kcal`} detail="已按活动水平估算" /><Summary icon={Scale} label="当前体重" value={`${body.weightKg} kg`} detail={`目标 ${body.targetWeightKg} kg`} /></div> : <div className="panel rounded-md p-6"><h2 className="text-base font-semibold">补充基础指标</h2><p className="subtle-text mt-2 text-sm leading-6">完成身高、体重、年龄、活动水平和目标后，系统才会生成对应热量区间。</p><Link to="/profile/body" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#315d47] hover:underline dark:text-[#aac7ae]">填写基础数据 <ArrowRight size={15} /></Link></div>}
    <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="panel rounded-md p-6"><p className="text-xs font-semibold tracking-[0.12em] text-[#5f7d6d] uppercase">Recipe focus</p><h2 className="mt-3 text-xl font-semibold">先选一顿想做的饭</h2><p className="subtle-text mt-2 text-sm leading-6">菜谱库将以做法、食材和目标热量作为主要检索维度，饮食记录将从选定菜谱自然生成。</p><Link to="/recipes" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#315d47] hover:underline dark:text-[#aac7ae]">进入菜谱库 <ArrowRight size={15} /></Link></div><div className="panel rounded-md p-6"><p className="text-xs font-semibold tracking-[0.12em] text-[#5f7d6d] uppercase">Current profile</p><h2 className="mt-3 text-xl font-semibold">{profile.displayName}</h2><p className="subtle-text mt-2 text-sm leading-6">档案数据与其他人物完全隔离。切换人物后，推荐、记录和进度将同步切换。</p><Link to="/profiles" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#315d47] hover:underline dark:text-[#aac7ae]">管理档案 <ArrowRight size={15} /></Link></div></section></div>;
}
function Summary({ icon: Icon, label, value, detail }: { icon: typeof Flame; label: string; value: string; detail: string }) { return <div className="panel rounded-md p-5"><Icon size={18} className="text-[#5f7d6d]" /><p className="subtle-text mt-5 text-sm">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p><p className="subtle-text mt-1 text-xs">{detail}</p></div>; }
