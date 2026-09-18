import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, Flame, X } from "lucide-react";
import { TrendChart } from "@/features/progress/progress-page";
import { ACTIVITY_OPTIONS, GOAL_LABELS } from "@/lib/constants";
import { calculateMetabolism } from "@/lib/calculations";
import { formatCalories } from "@/lib/utils";
import { getAdminProfileData, type AdminProfile, type AdminProfileData } from "@/services/admin-service";
import type { BodyProfile, MealEntry } from "@/types/domain";

const mealLabels: Record<MealEntry["mealType"], string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };

/** 取本地时区的今天，与后端默认日期保持一致。 */
function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function ProfileDataPanel({ token, profile, onClose }: { token: string; profile: AdminProfile; onClose: () => void }) {
  const [date, setDate] = useState(localToday);
  const [data, setData] = useState<AdminProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void getAdminProfileData(token, profile.id, date)
      .then((result) => { if (alive) { setData(result); setMessage(null); } })
      .catch((error: Error) => { if (alive) setMessage(error.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, profile.id, date]);

  const groups = useMemo(() => {
    const entries = data?.entries ?? [];
    return Object.fromEntries(Object.keys(mealLabels).map((key) => [key, entries.filter((entry) => entry.mealType === key)])) as Record<MealEntry["mealType"], MealEntry[]>;
  }, [data?.entries]);

  const body = data?.body ?? null;
  const metabolism = useMemo(() => {
    if (!body) return null;
    return calculateMetabolism({ ...body, profileId: profile.id, userId: "" } as BodyProfile);
  }, [body, profile.id]);
  const activity = body ? ACTIVITY_OPTIONS.find((item) => item.value === body.activityLevel) : undefined;

  return <div className="mt-3 rounded-md border border-[#e1e9dc] bg-white p-4 dark:border-[#3d5040] dark:bg-[#202b22]">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="size-3 flex-none rounded-full" style={{ backgroundColor: profile.accent }} />
        <h4 className="text-sm font-semibold">{profile.displayName} · 数据明细</h4>
        {data && <span className="subtle-text text-xs">所属用户 {data.profile.username}</span>}
      </div>
      <button className="subtle-text inline-flex items-center gap-1 text-xs hover:text-[#3c6b43]" onClick={onClose}><X size={14} />收起</button>
    </div>

    {message && <p className="mt-3 border-l-2 border-[#c56455] bg-[#fff6f4] px-3 py-2 text-sm text-[#9f4336] dark:bg-[#34211f] dark:text-[#f0aaa0]">{message}</p>}
    {loading && !data ? <p className="subtle-text mt-4 text-sm">正在读取该档案的数据...</p> : data && <>
      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="饮食记录条数" value={`${data.stats.mealCount} 条`} />
        <Stat label="有记录的天数" value={`${data.stats.mealDays} 天`} />
        <Stat label="最近一次记录" value={data.stats.lastMealDate ?? "暂无"} />
        <Stat label="体重记录条数" value={`${data.stats.weightCount} 条`} />
        <Stat label="最近一次称重" value={data.stats.lastWeightDate ?? "暂无"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <section>
          <h5 className="text-xs font-semibold tracking-wide text-[#5f7d6d] uppercase">档案指标</h5>
          {body ? <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
            <Stat label="身高" value={`${body.heightCm} cm`} />
            <Stat label="当前体重" value={`${body.weightKg} kg`} />
            <Stat label="年龄" value={`${body.age} 岁`} />
            <Stat label="生理性别" value={body.sex === "male" ? "男" : "女"} />
            <Stat label="活动水平" value={activity ? `${activity.label} · 系数 ${activity.factor}` : body.activityLevel} />
            <Stat label="身体目标" value={GOAL_LABELS[body.goal]} />
            <Stat label="目标体重" value={`${body.targetWeightKg} kg`} />
            <Stat label="每周变化" value={`${body.weeklyRateKg} kg`} />
          </div> : <p className="subtle-text mt-2 text-sm">该档案还没有填写身体指标。</p>}
        </section>

        <aside className="rounded-md border border-[#e1e9dc] p-4 dark:border-[#3d5040]">
          <div className="flex items-center gap-2 text-[#5f7d6d]"><Activity size={15} /><span className="text-xs font-bold">代谢小结</span></div>
          {metabolism ? <>
            <Metric label="基础代谢 BMR" value={`${formatCalories(metabolism.bmr)} kcal`} />
            <Metric label="每日总消耗 TDEE" value={`${formatCalories(metabolism.tdee)} kcal`} />
            <Metric label="每日摄入区间" value={`${formatCalories(metabolism.targetCalories.low)} - ${formatCalories(metabolism.targetCalories.high)} kcal`} />
            <Metric label="蛋白质" value={`${metabolism.macros.protein} g`} />
            <Metric label="碳水" value={`${metabolism.macros.carbs} g`} />
            <Metric label="脂肪" value={`${metabolism.macros.fat} g`} />
          </> : <p className="subtle-text mt-2 text-xs">缺少身体指标，无法计算。</p>}
        </aside>
      </div>

      <section className="mt-6 border-t border-[#eef3ec] pt-5 dark:border-[#2c382e]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h5 className="text-xs font-semibold tracking-wide text-[#5f7d6d] uppercase">饮食记录</h5>
          <label className="flex h-9 items-center gap-2 rounded-md border border-[#d8e4d3] bg-white px-3 text-sm dark:border-[#3b4b3d] dark:bg-[#202a21]"><CalendarDays size={15} className="text-[#6d866d]" /><input className="bg-transparent outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        </div>
        <p className="subtle-text mt-3 inline-flex items-center gap-2 text-sm"><Flame size={15} />当日合计 {formatCalories(data.summary.calories)} kcal · 蛋白质 {Math.round(data.summary.protein)}g · 碳水 {Math.round(data.summary.carbs)}g · 脂肪 {Math.round(data.summary.fat)}g</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Object.entries(mealLabels).map(([type, label]) => <div key={type} className="rounded-md border border-[#e1e9dc] p-3 dark:border-[#3d5040]">
            <div className="flex items-center justify-between border-b border-[#eef3ec] pb-2 text-sm dark:border-[#2c382e]"><span className="font-medium">{label}</span><span className="subtle-text text-xs">{formatCalories(groups[type as MealEntry["mealType"]].reduce((total, entry) => total + Number(entry.calories), 0))} kcal</span></div>
            {groups[type as MealEntry["mealType"]].length ? <ul className="mt-2 space-y-1.5">{groups[type as MealEntry["mealType"]].map((entry) => <li key={entry.id} className="flex items-start justify-between gap-3 text-sm"><span className="min-w-0 truncate">{entry.name}<small className="subtle-text ml-1">{entry.grams}g</small></span><strong className="shrink-0 font-semibold">{formatCalories(entry.calories)}</strong></li>)}</ul> : <p className="subtle-text mt-2 text-xs">这一天这一餐没有记录。</p>}
          </div>)}
        </div>
      </section>

      <section className="mt-6 border-t border-[#eef3ec] pt-5 dark:border-[#2c382e]">
        <h5 className="text-xs font-semibold tracking-wide text-[#5f7d6d] uppercase">近 90 天趋势</h5>
        <p className="subtle-text mt-1 text-xs">绿色曲线为体重，暖色柱为每日摄入热量。</p>
        <TrendChart trends={{ weights: data.weights, calories: data.calories }} />
      </section>
    </>}
  </div>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-[#eef3ec] px-3 py-2 dark:border-[#2c382e]"><p className="subtle-text text-xs">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><p className="subtle-text text-xs">{label}</p><p className="mt-0.5 text-sm font-bold">{value}</p></div>;
}
