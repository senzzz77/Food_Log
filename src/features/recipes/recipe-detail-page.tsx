import { useState } from "react";
import { ArrowLeft, ExternalLink, Flame, ListChecks, Plus } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import recipeData from "@/data/generated/how-to-cook-recipes.json";
import { addEntry } from "@/services/diary-service";
import { useAppStore } from "@/stores/app-store";
import type { MealEntry } from "@/types/domain";
import type { Recipe } from "@/types/recipe";

const recipes = recipeData as Recipe[];
const today = new Date().toISOString().slice(0, 10);
const mealOptions: Array<{ value: MealEntry["mealType"]; label: string }> = [
  { value: "breakfast", label: "早餐" }, { value: "lunch", label: "午餐" }, { value: "dinner", label: "晚餐" }, { value: "snack", label: "加餐" },
];

export function RecipeDetailPage() {
  const navigate = useNavigate();
  const { "*": encodedId } = useParams();
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const [mealType, setMealType] = useState<MealEntry["mealType"]>("lunch");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const recipe = recipes.find((item) => item.id === decodeURIComponent(encodedId ?? ""));
  if (!recipe) return <Navigate to="/recipes" replace />;

  const addRecipe = async () => {
    if (!token || !profileId) { navigate("/profiles"); return; }
    if (!recipe.estimatedCalories) { setMessage("这份菜谱没有可用的预估热量，暂时不能加入台账。"); return; }
    setSaving(true); setMessage(null);
    try {
      await addEntry(token, profileId, { date: today, mealType, source: "recipe", name: recipe.title, grams: 1, calories: Math.round(recipe.estimatedCalories), protein: 0, carbs: 0, fat: 0 });
      setMessage("已加入今天的饮食记录。");
    } catch (error) { setMessage(error instanceof Error ? error.message : "加入今天失败。"); }
    finally { setSaving(false); }
  };

  return <div className="mx-auto max-w-5xl"><Link to="/recipes" className="inline-flex items-center gap-2 text-sm font-medium text-[#55745c] hover:underline dark:text-[#b6d6b9]"><ArrowLeft size={16} />返回菜谱库</Link><div className="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"><article><span className="rounded-sm bg-[#edf3ec] px-2 py-1 text-xs font-medium text-[#55745c] dark:bg-[#294331] dark:text-[#c2ddc5]">{recipe.category}</span><h1 className="mt-4 text-3xl font-semibold text-[#202521] dark:text-[#f0f3ee]">{recipe.title}</h1>{recipe.description && <p className="subtle-text mt-4 max-w-2xl leading-7">{recipe.description}</p>}<div className="mt-7 border-y border-[#e2e6df] py-4 text-sm dark:border-[#343b35]"><div className="flex flex-wrap gap-5">{recipe.estimatedCalories && <span className="inline-flex items-center gap-2"><Flame size={16} className="text-[#b06b4f]" />预估 {recipe.estimatedCalories} kcal</span>}{recipe.difficulty && <span className="inline-flex items-center gap-2"><ListChecks size={16} className="text-[#5f7d6d]" />难度 {recipe.difficulty}</span>}</div></div>{recipe.ingredients.length > 0 && <section className="mt-8"><h2 className="text-lg font-semibold">核心原料</h2><div className="mt-3 flex flex-wrap gap-2">{recipe.ingredients.map((ingredient) => <span key={ingredient} className="rounded-sm border border-[#dfe5dd] px-2.5 py-1 text-sm text-[#536055] dark:border-[#3b443d] dark:text-[#c6cec6]">{ingredient}</span>)}</div></section>}<section className="recipe-markdown mt-10"><ReactMarkdown remarkPlugins={[remarkGfm]}>{recipe.markdown}</ReactMarkdown></section></article><aside className="panel h-fit rounded-md p-5"><p className="text-xs font-semibold tracking-[0.12em] text-[#5f7d6d] uppercase">Today</p><p className="mt-3 text-base font-semibold">加入今天的饮食</p><p className="subtle-text mt-2 text-sm leading-6">将使用这份菜谱的预估热量写入台账。HowToCook 原始菜谱未提供统一宏量数据，因此蛋白、碳水和脂肪不会虚构填写。</p><label className="subtle-text mt-5 block text-xs">加入到</label><Select className="mt-1" value={mealType} onChange={(event) => setMealType(event.target.value as MealEntry["mealType"])}>{mealOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</Select><Button className="mt-3 w-full" onClick={() => void addRecipe()} disabled={saving || !recipe.estimatedCalories}><Plus size={16} />{saving ? "加入中..." : "加入今天"}</Button>{message && <p className="mt-3 text-sm text-[#55745c] dark:text-[#b6d6b9]">{message}</p>}<div className="mt-8 border-t border-[#e2e6df] pt-5 dark:border-[#343b35]"><p className="text-xs font-semibold tracking-[0.12em] text-[#5f7d6d] uppercase">Source</p><p className="mt-3 text-sm font-medium">HowToCook</p><a className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-[#55745c] hover:underline dark:text-[#b6d6b9]" href="https://github.com/Anduin2017/HowToCook" target="_blank" rel="noreferrer">查看上游项目 <ExternalLink size={14} /></a></div></aside></div></div>;
}
