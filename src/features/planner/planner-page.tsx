import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Flame, Plus, UtensilsCrossed } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { calculateMetabolism } from "@/lib/calculations";
import { calculatePlan, MEAL_PLAN_TEMPLATES, type CalculatedPlan } from "@/lib/meal-plan";
import { formatCalories } from "@/lib/utils";
import { addEntry, listFoods } from "@/services/diary-service";
import { loadBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile, FoodItem } from "@/types/domain";
import recipeData from "@/data/generated/how-to-cook-recipes.json";
import type { Recipe } from "@/types/recipe";

const recipes = recipeData as Recipe[];
const today = new Date().toISOString().slice(0, 10);
const mealLabels = { breakfast: "早餐", lunch: "午餐", dinner: "晚餐" };

export function PlannerPage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const sheetRefs = useRef<Array<HTMLElement | null>>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [body, setBody] = useState<BodyProfile | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState(0);
  const [flying, setFlying] = useState(false);

  useEffect(() => {
    if (!token) return;
    void listFoods(token).then(({ foods: list }) => setFoods(list)).catch((error: Error) => setMessage(error.message));
  }, [token]);
  useEffect(() => {
    if (!token || !profileId) return;
    void loadBodyProfile(token, profileId).then(({ body: data }) => setBody(data ? { ...data, profileId, userId: "", updatedAt: "" } : null)).catch((error: Error) => setMessage(error.message));
  }, [profileId, token]);

  const target = body ? calculateMetabolism(body).targetCalories.midpoint : null;
  const plans = useMemo(() => target && foods.length ? MEAL_PLAN_TEMPLATES.map((template) => calculatePlan(template, foods, target)) : [], [foods, target]);
  useEffect(() => {
    if (!plans.length) return;
    const observer = new IntersectionObserver((entries) => {
      const centered = entries.filter((entry) => entry.isIntersecting).sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      const next = Number((centered?.target as HTMLElement | undefined)?.dataset.index);
      if (!Number.isFinite(next)) return;
      setActivePlan((current) => {
        if (current !== next) {
          setFlying(true);
          window.setTimeout(() => setFlying(false), 740);
        }
        return next;
      });
    }, { threshold: [.58, .72, .9] });
    sheetRefs.current.forEach((sheet) => { if (sheet) observer.observe(sheet); });
    return () => observer.disconnect();
  }, [plans.length]);
  if (!profileId || !profile) return <Navigate to="/profiles" replace />;

  const addPlan = async (plan: CalculatedPlan) => {
    if (!token) return;
    setAddingId(plan.id);
    setMessage(null);
    try {
      const entries = plan.meals.flatMap((meal) => meal.ingredients.map((ingredient) => ({
        date: today, mealType: meal.type, source: "recipe" as const, name: `${meal.recipeTitle} · ${ingredient.foodName}`,
        grams: ingredient.grams, calories: ingredient.calories, protein: ingredient.protein, carbs: ingredient.carbs, fat: ingredient.fat,
      })));
      await Promise.all(entries.map((entry) => addEntry(token, profileId, entry)));
      setMessage(`“${plan.name}”已加入今天的饮食记录。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加计划失败。");
    } finally { setAddingId(null); }
  };

  const jumpTo = (index: number) => sheetRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" });
  return <div className="mx-auto max-w-6xl">
    <PageHeader eyebrow={profile.displayName} title="今日安排" description="向下轻滑，在三张菜单纸之间选择今天最想执行的一日三餐。" />
    {!body ? <div className="panel rounded-md p-7"><h2 className="text-lg font-semibold">先完成身体指标</h2><p className="subtle-text mt-2 text-sm">推荐安排需要目标热量作为计算依据。</p><Link className="mt-5 inline-flex text-sm font-medium text-[#315d47] hover:underline dark:text-[#b6d6b9]" to="/profile/body">填写身体与目标</Link></div> : <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-y border-[#dce7d7] py-4 text-sm dark:border-[#354638]"><span className="inline-flex items-center gap-2"><Flame size={16} className="text-[#bf7258]" />每日目标 <strong>{formatCalories(target!)} kcal</strong></span><div className="flex items-center gap-1">{plans.map((plan, index) => <button key={plan.id} aria-label={`查看${plan.name}`} onClick={() => jumpTo(index)} className={`size-2.5 rounded-full transition-colors ${index === activePlan ? "bg-[#557f50]" : "bg-[#cedac9] dark:bg-[#465547]"}`} />)}</div></div>
      <div className={`planner-scroll ${flying ? "planner-scroll--flying" : ""}`}>{plans.map((plan, index) => <PlanSheet key={plan.id} innerRef={(element) => { sheetRefs.current[index] = element; }} index={index} plan={plan} active={index === activePlan} adding={addingId === plan.id} onAdd={() => void addPlan(plan)} />)}</div>
      <p className="mt-2 flex items-center justify-center gap-2 text-xs subtle-text"><ChevronDown size={14} />向下滑动，翻到下一张安排</p>
      {message && <p className="mt-5 border-l-2 border-[#5f7d6d] bg-[#eff6ef] px-3 py-2 text-sm text-[#315d47] dark:bg-[#203024] dark:text-[#bfdbbf]">{message}</p>}
    </>}
  </div>;
}

const PlanSheet = ({ plan, index, active, adding, onAdd, innerRef }: { plan: CalculatedPlan; index: number; active: boolean; adding: boolean; onAdd: () => void; innerRef: (element: HTMLElement | null) => void }) => <section ref={innerRef} data-index={index} className={`plan-sheet p-6 sm:p-8 ${active ? "plan-sheet--active" : "plan-sheet--distant"}`}>
  <i className="paper-flight" />
  <div className="flex items-start justify-between gap-5"><div><p className="text-xs font-bold tracking-[.12em] text-[#66805f] uppercase">menu no. {String(index + 1).padStart(2, "0")}</p><h2 className="mt-2 text-2xl font-bold">{plan.name}</h2><p className="subtle-text mt-2 max-w-lg text-sm leading-6">{plan.description}</p></div><span className="inline-flex size-8 items-center justify-center rounded-full border border-[#d2dec8] text-[#62825e]"><Check size={15} /></span></div>
  <div className="mt-6 grid grid-cols-2 gap-px border border-[#dde5d4] bg-[#dde5d4] text-sm dark:border-[#52583d] dark:bg-[#52583d]"><div className="bg-white/80 p-3 dark:bg-[#363726]"><p className="subtle-text text-xs">全天热量</p><p className="mt-1 font-bold">{formatCalories(plan.totals.calories)} kcal</p></div><div className="bg-white/80 p-3 dark:bg-[#363726]"><p className="subtle-text text-xs">蛋白质</p><p className="mt-1 font-bold">{Math.round(plan.totals.protein)} g</p></div></div>
  <div className="mt-6 space-y-5">{plan.meals.map((meal) => <div key={meal.type}><div className="flex items-center justify-between"><p className="text-sm font-bold">{mealLabels[meal.type]}</p><span className="subtle-text text-xs">{formatCalories(meal.totals.calories)} kcal</span></div><RecipeLink title={meal.recipeTitle} /><ul className="mt-2 space-y-1.5">{meal.ingredients.map((ingredient) => <li key={ingredient.foodName} className="flex justify-between gap-3 text-sm"><span className="text-[#4a5a4c] dark:text-[#d8e1d7]">{ingredient.foodName} <span className="subtle-text">{ingredient.grams}g</span></span><span className="shrink-0 subtle-text">P {Math.round(ingredient.protein)} / C {Math.round(ingredient.carbs)} / F {Math.round(ingredient.fat)}</span></li>)}</ul></div>)}</div>
  <Button className="mt-7 w-full" onClick={onAdd} disabled={adding}><Plus size={16} />{adding ? "正在加入..." : "加入今天的饮食"}</Button>
</section>;

function RecipeLink({ title }: { title: string }) {
  const recipe = recipes.find((item) => item.title.includes(title) || title.includes(item.title));
  return recipe ? <Link className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#55745c] hover:underline dark:text-[#b6d6b9]" to={`/recipes/${encodeURIComponent(recipe.id)}`}><UtensilsCrossed size={12} />{title}</Link> : <p className="subtle-text mt-1 text-xs">{title}</p>;
}
