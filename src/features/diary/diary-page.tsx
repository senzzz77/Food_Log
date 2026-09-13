import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CalendarDays, Camera, ClipboardPaste, Flame, Plus, Search, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { calculateMetabolism } from "@/lib/calculations";
import { cn, formatCalories } from "@/lib/utils";
import { addEntry, deleteEntry, getDiary, listFoods, parseEntries, recognizeFoods, type DiaryData } from "@/services/diary-service";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile, FoodItem, MealEntry } from "@/types/domain";

const mealTypes: Array<{ value: MealEntry["mealType"]; label: string }> = [
  { value: "breakfast", label: "早餐" }, { value: "lunch", label: "午餐" }, { value: "dinner", label: "晚餐" }, { value: "snack", label: "加餐" },
];
const today = new Date().toISOString().slice(0, 10);

interface PhotoEntry {
  name: string;
  food: FoodItem | null;
  estimate: { caloriesPer100g: string; proteinPer100g: string; carbsPer100g: string; fatPer100g: string };
  grams: string;
  manualFoodId: string;
  editing: boolean;
}

function parseEstimate(estimate: PhotoEntry["estimate"]) {
  const caloriesPer100g = Number(estimate.caloriesPer100g);
  const proteinPer100g = estimate.proteinPer100g.trim() === "" ? 0 : Number(estimate.proteinPer100g);
  const carbsPer100g = estimate.carbsPer100g.trim() === "" ? 0 : Number(estimate.carbsPer100g);
  const fatPer100g = estimate.fatPer100g.trim() === "" ? 0 : Number(estimate.fatPer100g);
  if (!Number.isFinite(caloriesPer100g) || caloriesPer100g < 0) return null;
  if ([proteinPer100g, carbsPer100g, fatPer100g].some((value) => !Number.isFinite(value) || value < 0)) return null;
  return { caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g };
}

export function DiaryPage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [date, setDate] = useState(today);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [diary, setDiary] = useState<DiaryData>({ entries: [], summary: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [body, setBody] = useState<BodyProfile | null>(null);
  const [mode, setMode] = useState<"manual" | "text" | "snack" | "photo">("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [manualFoodId, setManualFoodId] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualGrams, setManualGrams] = useState("100");
  const [manualMeal, setManualMeal] = useState<MealEntry["mealType"]>("breakfast");
  const [textMeal, setTextMeal] = useState<MealEntry["mealType"]>("lunch");
  const [text, setText] = useState("");
  const [snackName, setSnackName] = useState("");
  const [snackGrams, setSnackGrams] = useState("100");
  const [snackProtein, setSnackProtein] = useState("");
  const [snackCarbs, setSnackCarbs] = useState("");
  const [snackFat, setSnackFat] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<PhotoEntry[]>([]);
  const [photoMeal, setPhotoMeal] = useState<MealEntry["mealType"]>("lunch");
  const [photoLoading, setPhotoLoading] = useState(false);

  const load = async () => {
    if (!token || !profileId) return;
    try { setDiary(await getDiary(token, profileId, date)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "无法读取当天记录。"); }
  };
  useEffect(() => {
    if (!token) return;
    void listFoods(token).then(({ foods: list }) => { setFoods(list); setManualFoodId((previous) => previous || list[0]?.id || ""); }).catch((error: Error) => setMessage(error.message));
  }, [token]);
  useEffect(() => { void load(); }, [date, profileId, token]);
  useEffect(() => {
    if (!token || !profileId) return;
    void loadBodyProfile(token, profileId).then(({ body: data }) => setBody(data ? { ...data, profileId, userId: "", updatedAt: "" } : null)).catch(() => setBody(null));
  }, [profileId, token]);

  const visibleFoods = useMemo(() => {
    const term = manualQuery.trim().toLocaleLowerCase();
    if (!term) return foods;
    return foods.filter((food) => `${food.name} ${food.category}`.toLocaleLowerCase().includes(term));
  }, [foods, manualQuery]);
  useEffect(() => {
    if (visibleFoods.length && !visibleFoods.some((food) => food.id === manualFoodId)) setManualFoodId(visibleFoods[0].id);
  }, [manualFoodId, visibleFoods]);
  const selectedFood = foods.find((food) => food.id === manualFoodId);
  const target = body ? calculateMetabolism(body).targetCalories.midpoint : null;
  const remaining = target === null ? null : target - diary.summary.calories;
  const byMeal = useMemo<Record<MealEntry["mealType"], MealEntry[]>>(() => Object.fromEntries(mealTypes.map(({ value }) => [value, diary.entries.filter((entry) => entry.mealType === value)])) as Record<MealEntry["mealType"], MealEntry[]>, [diary.entries]);
  if (!profileId || !profile) return <Navigate to="/profiles" replace />;

  const addManual = async () => {
    if (!token || !selectedFood) return;
    const grams = Number(manualGrams);
    if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) return setMessage("请输入 1 到 5000g 之间的有效重量。");
    const ratio = grams / 100;
    try {
      await addEntry(token, profileId, { date, mealType: manualMeal, source: "manual", name: selectedFood.name, grams, calories: round(selectedFood.caloriesPer100g * ratio), protein: round(selectedFood.proteinPer100g * ratio), carbs: round(selectedFood.carbsPer100g * ratio), fat: round(selectedFood.fatPer100g * ratio) });
      setMessage("已加入当天记录。"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "录入失败。"); }
  };
  const addText = async () => {
    if (!token || !text.trim()) return;
    try {
      const result = await parseEntries(token, profileId, { date, mealType: textMeal, text });
      setMessage(result.rejected.length ? `已录入 ${result.accepted.length} 条，未识别 ${result.rejected.length} 条。` : `已录入 ${result.accepted.length} 条记录。`);
      setText(""); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "文本录入失败。"); }
  };
  const snackNutrition = useMemo(() => {
    const grams = Number(snackGrams); const proteinPer100g = Number(snackProtein); const carbsPer100g = Number(snackCarbs); const fatPer100g = Number(snackFat);
    const hasAllMacros = [snackProtein, snackCarbs, snackFat].every((value) => value.trim() !== "");
    const valid = hasAllMacros && [grams, proteinPer100g, carbsPer100g, fatPer100g].every(Number.isFinite) && grams > 0 && grams <= 5000 && proteinPer100g >= 0 && proteinPer100g <= 100 && carbsPer100g >= 0 && carbsPer100g <= 100 && fatPer100g >= 0 && fatPer100g <= 100;
    const ratio = valid ? grams / 100 : 0;
    return { valid, grams, protein: round(proteinPer100g * ratio), carbs: round(carbsPer100g * ratio), fat: round(fatPer100g * ratio), calories: round((proteinPer100g * 4 + carbsPer100g * 4 + fatPer100g * 9) * ratio) };
  }, [snackCarbs, snackFat, snackGrams, snackProtein]);
  const addSnack = async () => {
    if (!token) return;
    if (!snackName.trim() || !snackNutrition.valid) return setMessage("请填写零食名称、每 100g 营养成分和有效重量。");
    try {
      await addEntry(token, profileId, { date, mealType: "snack", source: "snack", name: snackName.trim(), grams: snackNutrition.grams, calories: snackNutrition.calories, protein: snackNutrition.protein, carbs: snackNutrition.carbs, fat: snackNutrition.fat });
      setSnackName(""); setSnackGrams("100"); setSnackProtein(""); setSnackCarbs(""); setSnackFat(""); setMessage("零食营养已按每 100g 成分计算并记录。"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "零食记录失败。"); }
  };
  const remove = async (entryId: string) => {
    if (!token) return;
    try { await deleteEntry(token, profileId, entryId); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "删除失败。"); }
  };

  const onPhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return setMessage("仅支持 JPG、PNG 或 WebP 图片。");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPhotoPreview(dataUrl);
      setPhotoItems([]);
    };
    reader.readAsDataURL(file);
  };

  const runPhotoRecognition = async () => {
    if (!token || !photoPreview) return;
    setPhotoLoading(true);
    try {
      const base64 = photoPreview.slice(photoPreview.indexOf(",") + 1);
      const mimeType = photoPreview.slice(photoPreview.indexOf(":") + 1, photoPreview.indexOf(";"));
      const { items } = await recognizeFoods(token, base64, mimeType);
      setPhotoItems(items.map((item) => ({
        name: item.name,
        food: item.food,
        estimate: {
          caloriesPer100g: item.estimate ? String(item.estimate.caloriesPer100g) : "",
          proteinPer100g: item.estimate ? String(item.estimate.proteinPer100g) : "",
          carbsPer100g: item.estimate ? String(item.estimate.carbsPer100g) : "",
          fatPer100g: item.estimate ? String(item.estimate.fatPer100g) : "",
        },
        grams: "100",
        manualFoodId: "",
        editing: false,
      })));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "识别失败，请稍后重试。");
    } finally {
      setPhotoLoading(false);
    }
  };

  const addPhotoEntries = async () => {
    if (!token) return;
    const entries = photoItems.filter((item) => item.food || item.manualFoodId || parseEstimate(item.estimate));
    if (!entries.length) return setMessage("没有可加入的食物，请先识别或手动选择。");
    try {
      let added = 0;
      for (const item of entries) {
        const grams = Number(item.grams);
        if (!Number.isFinite(grams) || grams <= 0 || grams > 5000) continue;
        const ratio = grams / 100;
        const manualFood = item.manualFoodId ? foods.find((food) => food.id === item.manualFoodId) : undefined;
        const estimate = parseEstimate(item.estimate);
        const nutrition = manualFood ?? item.food ?? (estimate ? { name: item.name, ...estimate } : null);
        if (!nutrition) continue;
        await addEntry(token, profileId, { date, mealType: photoMeal, source: "photo", name: nutrition.name, grams, calories: round(nutrition.caloriesPer100g * ratio), protein: round(nutrition.proteinPer100g * ratio), carbs: round(nutrition.carbsPer100g * ratio), fat: round(nutrition.fatPer100g * ratio) });
        added++;
      }
      setMessage(`已将 ${added} 种食物加入记录。`);
      setPhotoPreview(null); setPhotoItems([]);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量加入失败。");
    }
  };

  const updateEstimate = (index: number, field: keyof PhotoEntry["estimate"], value: string) => {
    setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, estimate: { ...entry.estimate, [field]: value } } : entry));
  };

  return <div className="mx-auto max-w-6xl">
    <PageHeader eyebrow={profile.displayName} title="热量记录" description="每一次记录都会流进今天的营养水位。" action={<label className="flex h-10 items-center gap-2 rounded-md border border-[#d8e4d3] bg-white px-3 text-sm dark:border-[#3b4b3d] dark:bg-[#202a21]"><CalendarDays size={16} className="text-[#6d866d]" /><input className="bg-transparent outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>} />
    <NutritionStage body={body} summary={diary.summary} target={target} remaining={remaining} />
    <section className="panel mt-7 rounded-md p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">添加饮食记录</h2><p className="subtle-text mt-1 text-sm">选一种最顺手的方式，把这一口写下来。</p></div><div className="flex gap-1 rounded-md bg-[#edf3e9] p-1 dark:bg-[#293a2b]">{[{ value: "manual", label: "食物库" }, { value: "text", label: "文本" }, { value: "snack", label: "零食" }, { value: "photo", label: "拍照" }].map((item) => <button key={item.value} onClick={() => setMode(item.value as typeof mode)} className={cn("h-8 rounded-sm px-3 text-sm transition-colors", mode === item.value ? "bg-white font-medium text-[#315d47] shadow-sm dark:bg-[#1a251b] dark:text-[#cce3cf]" : "subtle-text")}>{item.label}</button>)}</div></div>
      {mode === "manual" && <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_140px_auto]"><div className="md:col-span-4"><FieldLabel>搜索食物库</FieldLabel><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#718572]" size={16} /><Input className="pl-9" value={manualQuery} onChange={(event) => setManualQuery(event.target.value)} placeholder="输入食物名称或分类，例如鸡胸肉、蔬菜、坚果" /></label><p className="subtle-text mt-1.5 text-xs">共 {foods.length} 种食物，当前匹配 {visibleFoods.length} 种</p></div><div><FieldLabel>食物</FieldLabel><Select value={manualFoodId} onChange={(event) => setManualFoodId(event.target.value)} disabled={!visibleFoods.length}>{visibleFoods.length ? visibleFoods.map((food) => <option key={food.id} value={food.id}>{food.name} · {food.caloriesPer100g} kcal/100g</option>) : <option value="">没有匹配的食物</option>}</Select></div><div><FieldLabel>重量 (g)</FieldLabel><Input type="number" min="1" max="5000" value={manualGrams} onChange={(event) => setManualGrams(event.target.value)} /></div><div><FieldLabel>餐次</FieldLabel><Select value={manualMeal} onChange={(event) => setManualMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select></div><Button className="self-end" onClick={() => void addManual()} disabled={!selectedFood}><Plus size={16} />加入</Button></div>}
      {mode === "text" && <div className="mt-6 grid gap-4 md:grid-cols-[1fr_150px]"><div><FieldLabel>每行一项</FieldLabel><textarea className="field min-h-28 w-full rounded-md p-3 text-sm" value={text} onChange={(event) => setText(event.target.value)} placeholder={"鸡胸肉 150g\n熟米饭 100g\n西兰花 200g"} /></div><div className="flex flex-col"><FieldLabel>餐次</FieldLabel><Select value={textMeal} onChange={(event) => setTextMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select><Button className="mt-auto" onClick={() => void addText()}><ClipboardPaste size={16} />解析并录入</Button></div></div>}
      {mode === "snack" && <div className="mt-6"><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]"><div><FieldLabel>零食名称</FieldLabel><Input value={snackName} onChange={(event) => setSnackName(event.target.value)} placeholder="例如：蛋白棒" /></div><div><FieldLabel>食用重量 (g)</FieldLabel><Input type="number" min="1" max="5000" value={snackGrams} onChange={(event) => setSnackGrams(event.target.value)} /></div></div><div className="mt-4 grid gap-4 md:grid-cols-4"><div><FieldLabel>每 100g 蛋白质 (g)</FieldLabel><Input type="number" min="0" max="100" step="0.1" value={snackProtein} onChange={(event) => setSnackProtein(event.target.value)} /></div><div><FieldLabel>每 100g 碳水 (g)</FieldLabel><Input type="number" min="0" max="100" step="0.1" value={snackCarbs} onChange={(event) => setSnackCarbs(event.target.value)} /></div><div><FieldLabel>每 100g 脂肪 (g)</FieldLabel><Input type="number" min="0" max="100" step="0.1" value={snackFat} onChange={(event) => setSnackFat(event.target.value)} /></div><div className="rounded-md border border-[#d8e4d3] bg-[#f4f8f1] px-3 py-2 dark:border-[#3d4d3e] dark:bg-[#202d22]"><p className="subtle-text text-xs">自动计算热量</p><p className="mt-1 text-sm font-bold">{snackNutrition.valid ? `${formatCalories(snackNutrition.calories)} kcal` : "等待输入"}</p></div></div><div className="mt-4 flex justify-end"><Button onClick={() => void addSnack()}><Flame size={16} />记录零食</Button></div></div>}
      {mode === "photo" && <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <FieldLabel>上传食物照片</FieldLabel>
            {photoPreview ? <img src={photoPreview} alt="待识别食物" className="max-h-56 w-full rounded-md border border-[#d8e4d3] object-contain dark:border-[#3b4b3d]" /> : <label className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#c4d3bf] bg-[#f7faf5] text-[#6d866d] dark:border-[#46564a] dark:bg-[#1c281e] dark:text-[#a9b8aa]"><Camera size={28} /><span className="text-sm">点击选择图片</span><span className="text-xs">支持 JPG / PNG / WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoSelected} /></label>}
          </div>
          <div className="flex flex-col">
            <FieldLabel>餐次</FieldLabel>
            <Select value={photoMeal} onChange={(event) => setPhotoMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select>
            {photoPreview && <Button className="mt-auto" onClick={() => void runPhotoRecognition()} disabled={photoLoading}>{photoLoading ? "识别中…" : <><Camera size={16} />识别食物</>}</Button>}
          </div>
        </div>
        {photoItems.length > 0 && <div className="mt-5">
          <div className="mb-2 flex items-center justify-between"><FieldLabel>识别结果</FieldLabel><span className="subtle-text text-xs">识别出 {photoItems.length} 种，{photoItems.filter((item) => item.food || item.manualFoodId || item.estimate.caloriesPer100g.trim() !== "").length} 种可记录</span></div>
          <ul className="divide-y divide-[#eef3ec] rounded-md border border-[#e4ece1] dark:divide-[#2c382e] dark:border-[#354337]">{photoItems.map((item, index) => {
            const manualFood = item.manualFoodId ? foods.find((food) => food.id === item.manualFoodId) : undefined;
            const effective = manualFood ?? item.food;
            const hasEstimate = item.estimate.caloriesPer100g.trim() !== "";
            const sourceLabel = manualFood ? "手动选择" : item.food ? "食物库" : "AI 估算";
            return <li key={`${item.name}-${index}`} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{effective?.name ?? item.name}</p>
                  {effective ? <p className="subtle-text mt-0.5 text-xs">{effective.caloriesPer100g} kcal/100g · {sourceLabel}{item.food ? ` · 识别为“${item.name}”` : ""}</p> : <p className="subtle-text mt-0.5 text-xs">{sourceLabel} · 识别为“{item.name}” · 可编辑</p>}
                </div>
                {!item.food && <Select className="w-40" value={item.manualFoodId} onChange={(event) => setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, manualFoodId: event.target.value } : entry))}><option value="">使用预估热量</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</Select>}
                {(effective || hasEstimate) && <div className="flex items-center gap-2"><Input className="w-24" type="number" min="1" max="5000" value={item.grams} onChange={(event) => setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, grams: event.target.value } : entry))} /><span className="subtle-text text-xs">g</span></div>}
              </div>
              {!effective && (item.editing ? <div className="mt-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><FieldLabel>热量/100g (kcal)</FieldLabel><Input type="number" min="0" step="0.1" value={item.estimate.caloriesPer100g} onChange={(event) => updateEstimate(index, "caloriesPer100g", event.target.value)} /></div><div><FieldLabel>蛋白质/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.estimate.proteinPer100g} onChange={(event) => updateEstimate(index, "proteinPer100g", event.target.value)} /></div><div><FieldLabel>碳水/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.estimate.carbsPer100g} onChange={(event) => updateEstimate(index, "carbsPer100g", event.target.value)} /></div><div><FieldLabel>脂肪/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.estimate.fatPer100g} onChange={(event) => updateEstimate(index, "fatPer100g", event.target.value)} /></div></div><div className="mt-2 flex justify-end"><Button variant="ghost" className="h-7 px-2 text-xs" onClick={() => setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, editing: false } : entry))}>完成</Button></div></div> : <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-[#e4ece1] bg-[#f4f8f1] px-3 py-2 dark:border-[#354337] dark:bg-[#202d22]"><div className="min-w-0 text-sm"><span className="font-medium text-[#315d47] dark:text-[#cce3cf]">{item.estimate.caloriesPer100g || "—"} kcal/100g</span><span className="subtle-text text-xs"> · 蛋白质 {item.estimate.proteinPer100g || "0"}g · 碳水 {item.estimate.carbsPer100g || "0"}g · 脂肪 {item.estimate.fatPer100g || "0"}g</span><span className="ml-1 text-xs text-[#6d866d]">AI 估算</span></div><Button variant="ghost" className="h-7 shrink-0 px-2 text-xs" onClick={() => setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, editing: true } : entry))}>编辑</Button></div>)}
            </li>;
          })}</ul>
          <div className="mt-4 flex justify-end"><Button onClick={() => void addPhotoEntries()} disabled={!photoItems.some((item) => item.food || item.manualFoodId || item.estimate.caloriesPer100g.trim() !== "")}><Plus size={16} />加入记录</Button></div>
        </div>}
      </div>}
      {message && <p className="mt-5 border-l-2 border-[#5f7d6d] bg-[#eff6ef] px-3 py-2 text-sm text-[#315d47] dark:bg-[#203024] dark:text-[#bfdbbf]">{message}</p>}</section>
    <section className="mt-7 grid gap-4 lg:grid-cols-2">{mealTypes.map((meal) => <MealSection key={meal.value} label={meal.label} entries={byMeal[meal.value]} onDelete={remove} />)}</section>
  </div>;
}

function NutritionStage({ body, summary, target, remaining }: { body: BodyProfile | null; summary: DiaryData["summary"]; target: number | null; remaining: number | null }) {
  const proteinTarget = body ? body.weightKg * (body.goal === "muscle_gain" ? 2 : 1.8) : 100;
  const carbTarget = target ? target * .45 / 4 : 220;
  const fatTarget = target ? target * .25 / 9 : 60;
  const mood = remaining === null || remaining > 200 ? "hungry" : remaining < 0 ? "cry" : "smile";
  const copy = mood === "cry" ? "今天已经超出目标啦，明天再轻轻调整。" : mood === "smile" ? "刚刚好，今天的节奏很稳。" : "还可以吃一点，让身体获得足够能量。";
  return <section className="nutrition-stage"><div className="grid justify-items-center gap-4 text-center"><div className={`mood-face mood-face--${mood}`}><i className="mood-face__mouth" /></div><div><p className="text-sm font-bold">{target ? `${formatCalories(summary.calories)} / ${formatCalories(target)} kcal` : `${formatCalories(summary.calories)} kcal`}</p><p className="subtle-text mt-1 max-w-48 text-xs leading-5">{copy}</p></div></div><div className="nutrition-tubes"><NutritionTube className="tube-carbs" label="碳水" value={summary.carbs} target={carbTarget} /><NutritionTube className="tube-protein" label="蛋白质" value={summary.protein} target={proteinTarget} /><NutritionTube className="tube-fat" label="脂肪" value={summary.fat} target={fatTarget} /></div></section>;
}

function NutritionTube({ className, label, value, target }: { className: string; label: string; value: number; target: number }) {
  const fill = Math.min(100, Math.max(0, value / Math.max(target, 1) * 100));
  return <div className={`nutrition-tube ${className}`}><div className="nutrition-tube__glass"><i key={`${label}-${Math.round(value * 10)}`} className="nutrition-tube__water nutrition-tube__water--changed" style={{ "--fill": `${fill}%` } as React.CSSProperties} /></div><div className="text-center"><strong>{Math.round(value)}g</strong><small className="mt-0.5 block">{label}</small></div></div>;
}

function MealSection({ label, entries, onDelete }: { label: string; entries: MealEntry[]; onDelete: (id: string) => void }) {
  const calories = entries.reduce((sum, entry) => sum + Number(entry.calories), 0);
  return <section className="panel rounded-md"><div className="flex items-center justify-between border-b border-[#e7eee4] px-5 py-4 dark:border-[#354337]"><h2 className="font-semibold">{label}</h2><span className="subtle-text text-sm">{formatCalories(calories)} kcal</span></div>{entries.length ? <ul>{entries.map((entry) => <li key={entry.id} className="flex items-center gap-3 border-b border-[#eef3ec] px-5 py-3 last:border-b-0 dark:border-[#2c382e]"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{entry.name}</p><p className="subtle-text mt-0.5 text-xs">{entry.grams}g · P {Math.round(entry.protein)}g · C {Math.round(entry.carbs)}g · F {Math.round(entry.fat)}g</p></div><span className="text-sm font-medium">{formatCalories(entry.calories)}</span><button className="subtle-text p-1 hover:text-[#b34a3e]" title="删除记录" onClick={() => onDelete(entry.id)}><Trash2 size={15} /></button></li>)}</ul> : <p className="subtle-text px-5 py-8 text-sm">还没有记录</p>}</section>;
}

function round(value: number) { return Math.round(value * 10) / 10; }
