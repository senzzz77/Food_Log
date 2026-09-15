import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { CalendarDays, Camera, Plus, Search, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { calculateMetabolism } from "@/lib/calculations";
import { cn, formatCalories } from "@/lib/utils";
import {
  addEntry,
  addUserFood,
  deleteEntry,
  getDiary,
  listFoods,
  listUserFoods,
  recognizeFoods,
  recognizeNutritionFacts,
  type DiaryData,
} from "@/services/diary-service";
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
  manualFoodId: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  grams: string;
  saveToLibrary: boolean;
}

function parsePhotoNutrition(item: PhotoEntry) {
  const grams = Number(item.grams);
  const protein = item.protein.trim() === "" ? 0 : Number(item.protein);
  const carbs = item.carbs.trim() === "" ? 0 : Number(item.carbs);
  const fat = item.fat.trim() === "" ? 0 : Number(item.fat);
  const entered = item.calories.trim() === "" ? NaN : Number(item.calories);
  const caloriesPer100g = Number.isFinite(entered) ? entered : protein * 4 + carbs * 4 + fat * 9;
  const valid = item.name.trim().length > 0
    && Number.isFinite(grams) && grams > 0 && grams <= 5000
    && Number.isFinite(caloriesPer100g) && caloriesPer100g > 0
    && [protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0);
  return { valid, grams, caloriesPer100g, protein, carbs, fat };
}

export function DiaryPage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [date, setDate] = useState(today);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [diary, setDiary] = useState<DiaryData>({ entries: [], summary: { calories: 0, protein: 0, carbs: 0, fat: 0 } });
  const [body, setBody] = useState<BodyProfile | null>(null);
  const [mode, setMode] = useState<"manual" | "quick" | "photo">("manual");
  const [message, setMessage] = useState<string | null>(null);
  const [manualFoodId, setManualFoodId] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [manualGrams, setManualGrams] = useState("100");
  const [manualMeal, setManualMeal] = useState<MealEntry["mealType"]>("breakfast");

  // 快速添加（合并原「文本」与「零食」）
  const [quickName, setQuickName] = useState("");
  const [quickFoodId, setQuickFoodId] = useState("");
  const [quickMeal, setQuickMeal] = useState<MealEntry["mealType"]>("lunch");
  const [quickGrams, setQuickGrams] = useState("100");
  const [quickCalories, setQuickCalories] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");
  const [quickSaveToLibrary, setQuickSaveToLibrary] = useState(true);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoItems, setPhotoItems] = useState<PhotoEntry[]>([]);
  const [photoMeal, setPhotoMeal] = useState<MealEntry["mealType"]>("lunch");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoKind, setPhotoKind] = useState<"food" | "label">("food");

  const load = async () => {
    if (!token || !profileId) return;
    try { setDiary(await getDiary(token, profileId, date)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "无法读取当天记录。"); }
  };
  const refreshFoods = async () => {
    if (!token) return;
    try {
      const [catalog, mine] = await Promise.all([listFoods(token), listUserFoods(token)]);
      const userItems: FoodItem[] = mine.foods.map((food) => ({ ...food, category: "自定义", isSnack: false }));
      const merged = new Map<string, FoodItem>();
      for (const food of userItems) merged.set(food.name, food);
      for (const food of catalog.foods) if (!merged.has(food.name)) merged.set(food.name, food);
      const list = [...merged.values()];
      setFoods(list);
      setManualFoodId((previous) => previous || list[0]?.id || "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "无法读取食物库。"); }
  };
  useEffect(() => { void refreshFoods(); }, [token]);
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

  // 快速添加：优先匹配食物库
  const quickMatches = useMemo(() => {
    const term = quickName.trim().toLocaleLowerCase();
    if (!term) return [];
    return foods.filter((food) => food.name.toLocaleLowerCase().includes(term)).slice(0, 8);
  }, [foods, quickName]);
  const nameInLibrary = foods.some((food) => food.name === quickName.trim());
  const showSaveToLibrary = quickName.trim() !== "" && !nameInLibrary;
  useEffect(() => {
    const match = foods.find((food) => food.name === quickName.trim());
    if (match && match.id !== quickFoodId) {
      setQuickFoodId(match.id);
      setQuickCalories(String(match.caloriesPer100g));
      setQuickProtein(String(match.proteinPer100g));
      setQuickCarbs(String(match.carbsPer100g));
      setQuickFat(String(match.fatPer100g));
    }
  }, [foods, quickName, quickFoodId]);
  const quickNutrition = useMemo(() => {
    const grams = Number(quickGrams);
    const enteredCalories = quickCalories.trim() === "" ? NaN : Number(quickCalories);
    const protein = quickProtein.trim() === "" ? 0 : Number(quickProtein);
    const carbs = quickCarbs.trim() === "" ? 0 : Number(quickCarbs);
    const fat = quickFat.trim() === "" ? 0 : Number(quickFat);
    const derived = protein * 4 + carbs * 4 + fat * 9;
    const caloriesPer100g = Number.isFinite(enteredCalories) ? enteredCalories : derived;
    const valid = quickName.trim().length > 0
      && Number.isFinite(grams) && grams > 0 && grams <= 5000
      && Number.isFinite(caloriesPer100g) && caloriesPer100g > 0
      && [protein, carbs, fat].every((value) => Number.isFinite(value) && value >= 0);
    return { valid, grams, caloriesPer100g, protein, carbs, fat };
  }, [quickName, quickGrams, quickCalories, quickProtein, quickCarbs, quickFat]);

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

  const pickQuickFood = (food: FoodItem) => {
    setQuickName(food.name);
    setQuickFoodId(food.id);
    setQuickCalories(String(food.caloriesPer100g));
    setQuickProtein(String(food.proteinPer100g));
    setQuickCarbs(String(food.carbsPer100g));
    setQuickFat(String(food.fatPer100g));
  };

  const resetQuick = () => {
    setQuickName(""); setQuickFoodId(""); setQuickGrams("100");
    setQuickCalories(""); setQuickProtein(""); setQuickCarbs(""); setQuickFat("");
    setQuickSaveToLibrary(true);
  };

  const addQuick = async () => {
    if (!token) return;
    if (!quickNutrition.valid) return setMessage("请填写食物名称、有效重量，并填写热量或三大营养素。");
    const { grams, caloriesPer100g, protein, carbs, fat } = quickNutrition;
    const ratio = grams / 100;
    const name = quickName.trim();
    try {
      await addEntry(token, profileId, { date, mealType: quickMeal, source: quickMeal === "snack" ? "snack" : "text", name, grams, calories: round(caloriesPer100g * ratio), protein: round(protein * ratio), carbs: round(carbs * ratio), fat: round(fat * ratio) });
      let saved = false;
      if (!nameInLibrary && quickSaveToLibrary) {
        await addUserFood(token, { name, caloriesPer100g: round(caloriesPer100g), proteinPer100g: round(protein), carbsPer100g: round(carbs), fatPer100g: round(fat) });
        await refreshFoods();
        saved = true;
      }
      resetQuick();
      setMessage(saved ? "已加入记录，并保存到食物库。" : "已加入当天记录。");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "录入失败。"); }
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
      const { items } = photoKind === "label"
        ? await recognizeNutritionFacts(token, base64, mimeType)
        : await recognizeFoods(token, base64, mimeType);
      setPhotoItems(items.map((item) => {
        const source = item.food ?? item.estimate;
        return {
          name: item.food?.name ?? item.name,
          food: item.food,
          manualFoodId: item.food?.id ?? "",
          calories: source ? String(source.caloriesPer100g) : "",
          protein: source ? String(source.proteinPer100g) : "",
          carbs: source ? String(source.carbsPer100g) : "",
          fat: source ? String(source.fatPer100g) : "",
          grams: "100",
          saveToLibrary: false,
        };
      }));
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "识别失败，请稍后重试。");
    } finally {
      setPhotoLoading(false);
    }
  };

  const addPhotoEntries = async () => {
    if (!token) return;
    const targets = photoItems.map((item) => ({ item, values: parsePhotoNutrition(item) })).filter(({ values }) => values.valid);
    if (!targets.length) return setMessage("没有可加入的食物，请检查名称、重量与热量。");
    try {
      let saved = 0;
      for (const { item, values } of targets) {
        const ratio = values.grams / 100;
        const name = item.name.trim();
        await addEntry(token, profileId, { date, mealType: photoMeal, source: "photo", name, grams: values.grams, calories: round(values.caloriesPer100g * ratio), protein: round(values.protein * ratio), carbs: round(values.carbs * ratio), fat: round(values.fat * ratio) });
        if (item.saveToLibrary) {
          await addUserFood(token, { name, caloriesPer100g: round(values.caloriesPer100g), proteinPer100g: round(values.protein), carbsPer100g: round(values.carbs), fatPer100g: round(values.fat) });
          saved++;
        }
      }
      if (saved) await refreshFoods();
      setMessage(saved ? `已将 ${targets.length} 种食物加入记录，其中 ${saved} 种存入食物库。` : `已将 ${targets.length} 种食物加入记录。`);
      setPhotoPreview(null); setPhotoItems([]);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "批量加入失败。");
    }
  };

  const updatePhotoItem = (index: number, patch: Partial<PhotoEntry>) => setPhotoItems((prev) => prev.map((entry, i) => i === index ? { ...entry, ...patch } : entry));

  const segmented = (active: boolean) => cn("h-8 rounded-sm px-3 text-sm transition-colors", active ? "bg-white font-medium text-[#315d47] shadow-sm dark:bg-[#1a251b] dark:text-[#cce3cf]" : "subtle-text");

  return <div className="mx-auto max-w-6xl">
    <PageHeader eyebrow={profile.displayName} title="热量记录" description="每一次记录都会流进今天的营养水位。" action={<label className="flex h-10 items-center gap-2 rounded-md border border-[#d8e4d3] bg-white px-3 text-sm dark:border-[#3b4b3d] dark:bg-[#202a21]"><CalendarDays size={16} className="text-[#6d866d]" /><input className="bg-transparent outline-none" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>} />
    <NutritionStage body={body} summary={diary.summary} target={target} remaining={remaining} />
    <section className="panel mt-7 rounded-md p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">添加饮食记录</h2><p className="subtle-text mt-1 text-sm">选一种最顺手的方式，把这一口写下来。</p></div><div className="flex gap-1 rounded-md bg-[#edf3e9] p-1 dark:bg-[#293a2b]">{[{ value: "manual", label: "食物库" }, { value: "quick", label: "快速添加" }, { value: "photo", label: "拍照" }].map((item) => <button key={item.value} onClick={() => setMode(item.value as typeof mode)} className={segmented(mode === item.value)}>{item.label}</button>)}</div></div>
      {mode === "manual" && <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_140px_auto]"><div className="md:col-span-4"><FieldLabel>搜索食物库</FieldLabel><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#718572]" size={16} /><Input className="pl-9" value={manualQuery} onChange={(event) => setManualQuery(event.target.value)} placeholder="输入食物名称或分类，例如鸡胸肉、蔬菜、坚果" /></label><p className="subtle-text mt-1.5 text-xs">共 {foods.length} 种食物，当前匹配 {visibleFoods.length} 种</p></div><div><FieldLabel>食物</FieldLabel><Select value={manualFoodId} onChange={(event) => setManualFoodId(event.target.value)} disabled={!visibleFoods.length}>{visibleFoods.length ? visibleFoods.map((food) => <option key={food.id} value={food.id}>{food.name} · {food.caloriesPer100g} kcal/100g</option>) : <option value="">没有匹配的食物</option>}</Select></div><div><FieldLabel>重量 (g)</FieldLabel><Input type="number" min="1" max="5000" value={manualGrams} onChange={(event) => setManualGrams(event.target.value)} /></div><div><FieldLabel>餐次</FieldLabel><Select value={manualMeal} onChange={(event) => setManualMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select></div><Button className="self-end" onClick={() => void addManual()} disabled={!selectedFood}><Plus size={16} />加入</Button></div>}
      {mode === "quick" && <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
          <div>
            <FieldLabel>食物名称</FieldLabel>
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#718572]" size={16} /><Input className="pl-9" value={quickName} onChange={(event) => { setQuickName(event.target.value); setQuickFoodId(""); }} placeholder="输入名称，例如 鸡胸肉、蛋白棒，会优先匹配食物库" /></label>
            {quickName.trim() && !nameInLibrary && <p className="mt-1.5 text-xs text-[#b3743e]">食物库中未找到「{quickName.trim()}」，可手动填写营养并保存</p>}
          </div>
          <div><FieldLabel>餐次</FieldLabel><Select value={quickMeal} onChange={(event) => setQuickMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select></div>
        </div>
        {quickMatches.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{quickMatches.map((food) => <button key={food.id} onClick={() => pickQuickFood(food)} className={cn("rounded-full border px-3 py-1 text-xs transition-colors", quickFoodId === food.id ? "border-[#5f7d6d] bg-[#eaf1e7] text-[#315d47] dark:border-[#7fa085] dark:bg-[#26382a] dark:text-[#cce3cf]" : "border-[#d8e4d3] bg-white text-[#4a5b4a] hover:border-[#9bb09a] dark:border-[#3b4b3d] dark:bg-[#202a21] dark:text-[#a9b8aa]")}>{food.name} · {food.caloriesPer100g} kcal</button>)}</div>}
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <div><FieldLabel>重量 (g)</FieldLabel><Input type="number" min="1" max="5000" value={quickGrams} onChange={(event) => setQuickGrams(event.target.value)} /></div>
          <div><FieldLabel>热量 /100g</FieldLabel><Input type="number" min="0" step="0.1" value={quickCalories} onChange={(event) => setQuickCalories(event.target.value)} placeholder="kcal" /></div>
          <div><FieldLabel>蛋白质 /100g</FieldLabel><Input type="number" min="0" step="0.1" value={quickProtein} onChange={(event) => setQuickProtein(event.target.value)} placeholder="g" /></div>
          <div><FieldLabel>碳水 /100g</FieldLabel><Input type="number" min="0" step="0.1" value={quickCarbs} onChange={(event) => setQuickCarbs(event.target.value)} placeholder="g" /></div>
          <div><FieldLabel>脂肪 /100g</FieldLabel><Input type="number" min="0" step="0.1" value={quickFat} onChange={(event) => setQuickFat(event.target.value)} placeholder="g" /></div>
        </div>
        <p className="subtle-text mt-2 text-xs">留空热量时，会按蛋白质×4 + 碳水×4 + 脂肪×9 自动估算（与原零食计算一致）。</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <p className="subtle-text text-sm">合计 <span className="font-bold text-[#315d47] dark:text-[#cce3cf]">{quickNutrition.valid ? `${formatCalories(round(quickNutrition.caloriesPer100g * quickNutrition.grams / 100))} kcal` : "待填写"}</span></p>
            {showSaveToLibrary && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={quickSaveToLibrary} onChange={(event) => setQuickSaveToLibrary(event.target.checked)} />保存到食物库</label>}
          </div>
          <Button onClick={() => void addQuick()} disabled={!quickNutrition.valid}><Plus size={16} />加入记录</Button>
        </div>
      </div>}
      {mode === "photo" && <div className="mt-6">
        <div className="mb-4 inline-flex gap-1 rounded-md bg-[#edf3e9] p-1 dark:bg-[#293a2b]">{[{ value: "food", label: "识别食物" }, { value: "label", label: "识别营养成分表" }].map((kind) => <button key={kind.value} onClick={() => setPhotoKind(kind.value as typeof photoKind)} className={segmented(photoKind === kind.value)}>{kind.label}</button>)}</div>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <FieldLabel>{photoKind === "label" ? "上传营养成分表照片" : "上传食物照片"}</FieldLabel>
            {photoPreview ? <img src={photoPreview} alt="待识别图片" className="max-h-56 w-full rounded-md border border-[#d8e4d3] object-contain dark:border-[#3b4b3d]" /> : <label className="flex min-h-40 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#c4d3bf] bg-[#f7faf5] text-[#6d866d] dark:border-[#46564a] dark:bg-[#1c281e] dark:text-[#a9b8aa]"><Camera size={28} /><span className="text-sm">点击选择图片</span><span className="text-xs">支持 JPG / PNG / WebP</span><input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPhotoSelected} /></label>}
          </div>
          <div className="flex flex-col">
            <FieldLabel>餐次</FieldLabel>
            <Select value={photoMeal} onChange={(event) => setPhotoMeal(event.target.value as MealEntry["mealType"])}>{mealTypes.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}</Select>
            {photoPreview && <Button className="mt-auto" onClick={() => void runPhotoRecognition()} disabled={photoLoading}>{photoLoading ? "识别中…" : <><Camera size={16} />{photoKind === "label" ? "识别营养标签" : "识别食物"}</>}</Button>}
          </div>
        </div>
        {photoItems.length > 0 && <div className="mt-5">
          <div className="mb-2 flex items-center justify-between"><FieldLabel>识别结果</FieldLabel><span className="subtle-text text-xs">识别出 {photoItems.length} 种，{photoItems.filter((item) => parsePhotoNutrition(item).valid).length} 种可记录</span></div>
          <ul className="divide-y divide-[#eef3ec] rounded-md border border-[#e4ece1] dark:divide-[#2c382e] dark:border-[#354337]">{photoItems.map((item, index) => {
            const parsed = parsePhotoNutrition(item);
            const sourceLabel = item.manualFoodId && item.manualFoodId === item.food?.id ? "食物库匹配" : item.manualFoodId ? "已选食物库" : "AI 估算";
            // key 不能包含 item.name：改名会导致列表项重建、输入框失焦
            return <li key={index} className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <Input className="h-8 w-40 min-w-32 flex-1 text-sm font-medium" value={item.name} placeholder="食物名称" onChange={(event) => updatePhotoItem(index, { name: event.target.value })} />
                <Select className="h-8 w-44 text-sm" value={item.manualFoodId} onChange={(event) => { const food = foods.find((candidate) => candidate.id === event.target.value); updatePhotoItem(index, food ? { manualFoodId: food.id, name: food.name, calories: String(food.caloriesPer100g), protein: String(food.proteinPer100g), carbs: String(food.carbsPer100g), fat: String(food.fatPer100g) } : { manualFoodId: "" }); }}><option value="">不关联食物库</option>{foods.map((food) => <option key={food.id} value={food.id}>{food.name}</option>)}</Select>
                <div className="flex items-center gap-2"><Input className="h-8 w-24" type="number" min="1" max="5000" value={item.grams} onChange={(event) => updatePhotoItem(index, { grams: event.target.value })} /><span className="subtle-text text-xs">g</span></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><FieldLabel>热量/100g (kcal)</FieldLabel><Input type="number" min="0" step="0.1" value={item.calories} onChange={(event) => updatePhotoItem(index, { calories: event.target.value })} /></div>
                <div><FieldLabel>蛋白质/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.protein} onChange={(event) => updatePhotoItem(index, { protein: event.target.value })} /></div>
                <div><FieldLabel>碳水/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.carbs} onChange={(event) => updatePhotoItem(index, { carbs: event.target.value })} /></div>
                <div><FieldLabel>脂肪/100g (g)</FieldLabel><Input type="number" min="0" step="0.1" value={item.fat} onChange={(event) => updatePhotoItem(index, { fat: event.target.value })} /></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="subtle-text text-xs">来源：{sourceLabel}{parsed.valid ? ` · 本次计入 ${round(parsed.caloriesPer100g * parsed.grams / 100)} kcal` : " · 请完善名称、重量与热量"}</p>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.saveToLibrary} onChange={(event) => updatePhotoItem(index, { saveToLibrary: event.target.checked })} />加入食物库（重名将覆盖旧数据）</label>
              </div>
            </li>;
          })}</ul>
          <div className="mt-4 flex justify-end"><Button onClick={() => void addPhotoEntries()} disabled={!photoItems.some((item) => parsePhotoNutrition(item).valid)}><Plus size={16} />加入记录</Button></div>
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
  return <section className="panel rounded-md"><div className="flex items-center justify-between border-b border-[#e7eee4] px-5 py-4 dark:border-[#354337]"><h2 className="font-semibold">{label}</h2><span className="subtle-text text-sm">{formatCalories(calories)} kcal</span></div>{entries.length ? <ul>{entries.map((entry) => <li key={entry.id} className="flex items-center gap-3 border-b border-[#eef3ec] px-5 py-3 last:border-b-0 dark:border-[#2c382e]"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{entry.name}</p><p className="subtle-text mt-0.5 text-xs">{entry.grams}g · P {fmtGrams(entry.protein)} · C {fmtGrams(entry.carbs)} · F {fmtGrams(entry.fat)}</p></div><span className="text-sm font-medium">{formatCalories(entry.calories)}</span><button className="subtle-text p-1 hover:text-[#b34a3e]" title="删除记录" onClick={() => onDelete(entry.id)}><Trash2 size={15} /></button></li>)}</ul> : <p className="subtle-text px-5 py-8 text-sm">还没有记录</p>}</section>;
}

function round(value: number) { return Math.round(value * 10) / 10; }
function fmtGrams(value: number) { return `${round(Number(value) || 0)}g`; }
