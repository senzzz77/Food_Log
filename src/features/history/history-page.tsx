import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Flame } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { formatCalories } from "@/lib/utils";
import { getDiary, type DiaryData } from "@/services/diary-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { MealEntry } from "@/types/domain";

const today = new Date().toISOString().slice(0, 10);
const labels: Record<MealEntry["mealType"], string> = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐", snack: "加餐" };
const noteColors = ["#fff1b7", "#dff0d4", "#fbe0cc", "#dcecf1"];

export function HistoryPage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [date, setDate] = useState(today);
  const [diary, setDiary] = useState<DiaryData>({ entries: [], summary: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !profileId) return;
    void getDiary(token, profileId, date).then(setDiary).catch((error: Error) => setMessage(error.message));
  }, [date, profileId, token]);
  const groups = useMemo(() => Object.fromEntries(Object.keys(labels).map((key) => [key, diary.entries.filter((entry) => entry.mealType === key)])) as Record<MealEntry["mealType"], MealEntry[]>, [diary.entries]);
  if (!profileId || !profile) return <Navigate to="/profiles" replace />;

  return <div className="mx-auto max-w-5xl"><PageHeader eyebrow={profile.displayName} title="饮食记录" description="把过去每一天的摄入，留成一张可翻看的小便签。" action={<label className="flex h-10 items-center gap-2 rounded-md border border-[#d8e4d3] bg-white px-3 text-sm dark:border-[#3b4b3d] dark:bg-[#202a21]"><CalendarDays size={16} className="text-[#6d866d]" /><input className="bg-transparent outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>} />
    <section className="history-note p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-5"><div><p className="text-xs font-bold tracking-[.12em] text-[#7a7548] uppercase">daily intake</p><h2 className="mt-2 text-2xl font-bold text-[#3c422e] dark:text-[#f0eccd]">{date}</h2><p className="mt-2 inline-flex items-center gap-2 text-sm text-[#5a674b] dark:text-[#d0d8b8]"><Flame size={16} />{formatCalories(diary.summary.calories)} kcal</p></div><div className="grid grid-cols-3 gap-4 text-center"><Metric label="蛋白质" value={`${Math.round(diary.summary.protein)}g`} /><Metric label="碳水" value={`${Math.round(diary.summary.carbs)}g`} /><Metric label="脂肪" value={`${Math.round(diary.summary.fat)}g`} /></div></div></section>
    {message && <p className="mt-5 text-sm text-[#b34a3e]">{message}</p>}
    <section className="mt-7 grid gap-5 sm:grid-cols-2">{Object.entries(labels).map(([type, label], index) => <MealNote key={type} label={label} entries={groups[type as MealEntry["mealType"]]} color={noteColors[index]} />)}</section>
    <Link className="mt-7 inline-flex items-center gap-1 text-sm font-medium text-[#55745c] hover:underline dark:text-[#b6d6b9]" to={`/diary?date=${date}`}>编辑这一天 <ChevronRight size={15} /></Link>
  </div>;
}

function MealNote({ label, entries, color }: { label: string; entries: MealEntry[]; color: string }) {
  const calories = entries.reduce((total, entry) => total + Number(entry.calories), 0);
  return <article className="history-note min-h-48 p-5" style={{ backgroundColor: color }}><span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-2deg] bg-white/45" /><div className="flex items-center justify-between border-b border-[#836f3d]/20 pb-3 text-[#41482f]"><h2 className="font-bold">{label}</h2><span className="text-sm">{formatCalories(calories)} kcal</span></div>{entries.length ? <ul className="mt-3 space-y-2">{entries.map((entry) => <li key={entry.id} className="flex items-start justify-between gap-3 text-sm text-[#4b543a]"><span>{entry.name}<small className="ml-1 opacity-65">{entry.grams}g</small></span><strong className="shrink-0 font-semibold">{formatCalories(entry.calories)}</strong></li>)}</ul> : <p className="mt-8 text-sm text-[#596244]/75">今天这一餐没有留下记录。</p>}</article>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] text-[#7d805a] dark:text-[#b6bd8a]">{label}</p><strong className="mt-1 block text-sm text-[#465037] dark:text-[#e0e7b9]">{value}</strong></div>; }
