import { useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, Clock3, Search, Utensils } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import recipeData from "@/data/generated/how-to-cook-recipes.json";
import type { Recipe } from "@/types/recipe";

const recipes = recipeData as Recipe[];
const categories = ["全部", ...Array.from(new Set(recipes.map((recipe) => recipe.category)))];
const noteStyles = ["", "recipe-note--peach", "recipe-note--mint", "recipe-note--blue"];
const noteAngles = ["-1.2deg", "1.4deg", "-.45deg", ".8deg", "-1.7deg", ".35deg"];

export function RecipesPage() {
  const navigate = useNavigate();
  const scrollTimer = useRef<number | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [scrolling, setScrolling] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const visibleRecipes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return recipes.filter((recipe) => (category === "全部" || recipe.category === category) && (!normalized || [recipe.title, recipe.description, recipe.ingredients.join(" ")].join(" ").toLowerCase().includes(normalized)));
  }, [category, query]);

  const breeze = () => {
    setScrolling(true);
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => setScrolling(false), 180);
  };
  const openRecipe = (id: string) => {
    setSelectedId(id);
    window.setTimeout(() => navigate(`/recipes/${encodeURIComponent(id)}`), 230);
  };

  return <div className="mx-auto max-w-7xl">
    <PageHeader eyebrow="HowToCook Collection" title="菜谱库" description={`收录 ${recipes.length} 份家常做法。挑一张便签，从今天想吃的开始。`} />
    <section className="mb-8 border-y border-[#dce7d7] py-4 dark:border-[#354638]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="panel flex h-11 max-w-xl flex-1 items-center rounded-md px-3"><Search className="mr-2 text-[#66816a]" size={17} /><Input className="h-8 border-0 bg-transparent px-0 shadow-none focus:outline-none dark:bg-transparent" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索菜名、食材或做法" /></label>
        <p className="subtle-text text-sm">{visibleRecipes.length} 份便签</p>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`h-8 shrink-0 rounded-md border px-3 text-sm transition-colors ${category === item ? "border-[#63895f] bg-[#e4f0df] text-[#315c39] dark:bg-[#2d4a30] dark:text-[#dcefd8]" : "border-[#dce5d8] text-[#667667] hover:border-[#9eb99a] dark:border-[#3b4a3d] dark:text-[#b7c3b7]"}`}>{item}</button>)}</div>
    </section>
    {visibleRecipes.length ? <div onScroll={breeze} className={`grid gap-x-5 gap-y-7 sm:grid-cols-2 xl:grid-cols-3 ${scrolling ? "recipe-board--breezy" : ""}`}>
      {visibleRecipes.map((recipe, index) => <RecipeNote key={recipe.id} recipe={recipe} index={index} selected={selectedId === recipe.id} breezy={scrolling} onOpen={openRecipe} />)}
    </div> : <div className="panel mt-7 flex min-h-48 flex-col items-center justify-center rounded-md"><BookOpen className="text-[#829b81]" size={24} /><p className="subtle-text mt-3 text-sm">没有找到匹配的菜谱</p></div>}
  </div>;
}

function RecipeNote({ recipe, index, selected, breezy, onOpen }: { recipe: Recipe; index: number; selected: boolean; breezy: boolean; onOpen: (id: string) => void }) {
  return <button onClick={() => onOpen(recipe.id)} className={`recipe-note ${noteStyles[index % noteStyles.length]} ${breezy ? "recipe-note--wind" : ""} ${selected ? "recipe-note--selected" : ""} p-5 text-left`} style={{ "--note-angle": noteAngles[index % noteAngles.length], "--wind-delay": `${(index % 5) * -0.2}s` } as React.CSSProperties}>
    <span className="note-tape" />
    <div className="mt-3 flex items-center justify-between gap-3"><span className="rounded-sm border border-current/15 bg-white/25 px-2 py-1 text-xs font-semibold">{recipe.category}</span><ChevronRight size={17} className="opacity-65" /></div>
    <h2 className="mt-7 text-lg font-bold leading-6">{recipe.title}</h2>
    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 opacity-75">{recipe.description || "翻开便签，查看食材与完整做法。"}</p>
    <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-5 text-xs opacity-75">{recipe.estimatedCalories && <span className="inline-flex items-center gap-1"><Utensils size={13} />{recipe.estimatedCalories} kcal</span>}{recipe.difficulty && <span className="inline-flex items-center gap-1"><Clock3 size={13} />{recipe.difficulty}</span>}</div>
  </button>;
}
