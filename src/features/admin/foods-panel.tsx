import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { createAdminFood, deleteAdminFood, listAdminFoods, updateAdminFood, type AdminFood, type FoodInput } from "@/services/admin-service";
import { useAppStore } from "@/stores/app-store";

export function FoodsPanel() {
  const token = useAppStore((state) => state.authToken);
  const [foods, setFoods] = useState<AdminFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [formTarget, setFormTarget] = useState<AdminFood | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminFood | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    void listAdminFoods(token, term)
      .then(({ foods: items }) => { if (alive) { setFoods(items); setMessage(null); } })
      .catch((error: Error) => { if (alive) setMessage(error.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, term, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  const toggleActive = async (food: AdminFood) => {
    if (!token) return;
    setBusyId(food.id);
    try {
      await updateAdminFood(token, food.id, { isActive: !food.isActive });
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法更新上架状态。");
    } finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAdminFood(token, pendingDelete.id);
      setPendingDelete(null);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法删除食物。");
    } finally { setDeleting(false); }
  };

  return <section className="panel rounded-md">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee4] px-5 py-4 dark:border-[#354337]">
      <div><h2 className="font-semibold">食物库</h2><p className="subtle-text mt-1 text-xs">下架的食物不会出现在搜索、图片识别和文字记录里，但仍保留在后台。</p></div>
      <div className="flex items-center gap-2">
        <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); setTerm(query); }}><Input className="h-10 w-44" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称或分类" /><Button variant="secondary" type="submit"><Search size={15} />搜索</Button></form>
        <Button onClick={() => { setFormTarget(null); setFormOpen(true); }}><Plus size={16} />新增食物</Button>
        <Button variant="secondary" onClick={refresh} disabled={loading} title="刷新"><RefreshCw size={15} /></Button>
      </div>
    </header>
    {message && <p className="border-b border-[#f0ded9] bg-[#fff6f4] px-5 py-2.5 text-sm text-[#9f4336] dark:border-[#4a2f2c] dark:bg-[#34211f] dark:text-[#f0aaa0]">{message}</p>}
    {loading ? <p className="subtle-text px-5 py-8 text-sm">正在读取食物库...</p> : foods.length ? <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead><tr className="subtle-text text-left text-xs"><th className="px-5 py-3 font-medium">名称</th><th className="px-5 py-3 font-medium">分类</th><th className="px-5 py-3 font-medium">热量</th><th className="px-5 py-3 font-medium">蛋白</th><th className="px-5 py-3 font-medium">碳水</th><th className="px-5 py-3 font-medium">脂肪</th><th className="px-5 py-3 font-medium">类型</th><th className="px-5 py-3 font-medium">状态</th><th className="px-5 py-3 text-right font-medium">操作</th></tr></thead>
        <tbody>{foods.map((food) => <tr key={food.id} className="border-t border-[#eef3ec] dark:border-[#2c382e]">
          <td className="px-5 py-3 font-medium">{food.name}</td>
          <td className="subtle-text px-5 py-3">{food.category}</td>
          <td className="px-5 py-3">{round(food.caloriesPer100g)}</td>
          <td className="px-5 py-3">{round(food.proteinPer100g)}</td>
          <td className="px-5 py-3">{round(food.carbsPer100g)}</td>
          <td className="px-5 py-3">{round(food.fatPer100g)}</td>
          <td className="subtle-text px-5 py-3">{food.isSnack ? "零食" : "正餐"}</td>
          <td className="px-5 py-3"><button onClick={() => void toggleActive(food)} disabled={busyId === food.id} className={`rounded-full px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${food.isActive ? "bg-[#e5f1df] text-[#3c6b43] dark:bg-[#314a32] dark:text-[#d7ebd1]" : "bg-[#f0f3ed] text-[#718073] dark:bg-[#29352b] dark:text-[#b3c1b4]"}`}>{food.isActive ? "上架中" : "已下架"}</button></td>
          <td className="px-5 py-3 text-right"><span className="inline-flex items-center gap-1"><button className="subtle-text p-1 hover:text-[#3c6b43]" title="编辑" onClick={() => { setFormTarget(food); setFormOpen(true); }}><Pencil size={15} /></button><button className="subtle-text p-1 hover:text-[#b34a3e]" title="删除" onClick={() => setPendingDelete(food)}><Trash2 size={15} /></button></span></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="subtle-text px-5 py-8 text-sm">{term ? `没有匹配「${term}」的食物。` : "食物库还是空的，先新增一条吧。"}</p>}
    {formOpen && <FoodFormDialog food={formTarget} onClose={() => setFormOpen(false)} onSaved={() => { setMessage(null); refresh(); }} />}
    <ConfirmDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} title="删除食物" description={`删除「${pendingDelete?.name ?? ""}」后无法恢复；如果只是暂时不想让它出现，可以改为下架。`} pending={deleting} onConfirm={() => void confirmDelete()} />
  </section>;
}

interface FoodFormState { name: string; category: string; calories: string; protein: string; carbs: string; fat: string; isSnack: boolean; isActive: boolean }

function FoodFormDialog({ food, onClose, onSaved }: { food: AdminFood | null; onClose: () => void; onSaved: () => void }) {
  const token = useAppStore((state) => state.authToken);
  const [form, setForm] = useState<FoodFormState>(() => food
    ? { name: food.name, category: food.category, calories: String(food.caloriesPer100g), protein: String(food.proteinPer100g), carbs: String(food.carbsPer100g), fat: String(food.fatPer100g), isSnack: Boolean(food.isSnack), isActive: Boolean(food.isActive) }
    : { name: "", category: "", calories: "", protein: "0", carbs: "0", fat: "0", isSnack: false, isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const update = (patch: Partial<FoodFormState>) => setForm((current) => ({ ...current, ...patch }));

  const submit = async () => {
    if (!token) return;
    const numbers = [form.calories, form.protein, form.carbs, form.fat].map(Number);
    if (!form.name.trim() || !form.category.trim()) return setError("请填写食物名称与分类。");
    if (numbers.some((value) => !Number.isFinite(value) || value < 0)) return setError("热量与三大营养素请填写非负数字（每 100g）。");
    const payload: FoodInput = {
      name: form.name.trim(),
      category: form.category.trim(),
      caloriesPer100g: numbers[0],
      proteinPer100g: numbers[1],
      carbsPer100g: numbers[2],
      fatPer100g: numbers[3],
      isSnack: form.isSnack,
      isActive: form.isActive,
    };
    setSaving(true); setError(null);
    try {
      if (food) await updateAdminFood(token, food.id, payload);
      else await createAdminFood(token, payload);
      onSaved();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "保存失败。");
    } finally { setSaving(false); }
  };

  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-[#18211a]/35 backdrop-blur-[1px]" />
      <Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 max-h-[88vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md p-6 shadow-xl shadow-black/10">
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold">{food ? "编辑食物" : "新增食物"}</Dialog.Title><Dialog.Description className="subtle-text mt-1 text-sm">营养数据按每 100g 填写。</Dialog.Description></div><Dialog.Close asChild><button className="subtle-text p-1 hover:text-[#202521] dark:hover:text-white" aria-label="关闭"><X size={18} /></button></Dialog.Close></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><FieldLabel>食物名称</FieldLabel><Input value={form.name} maxLength={120} onChange={(event) => update({ name: event.target.value })} autoFocus /></div>
          <div><FieldLabel>分类</FieldLabel><Input value={form.category} maxLength={48} onChange={(event) => update({ category: event.target.value })} placeholder="例如：谷物、蔬菜" /></div>
          <div><FieldLabel>类型</FieldLabel><Select value={form.isSnack ? "snack" : "meal"} onChange={(event) => update({ isSnack: event.target.value === "snack" })}><option value="meal">正餐食材</option><option value="snack">零食</option></Select></div>
          <div><FieldLabel>热量 (kcal/100g)</FieldLabel><Input type="number" min={0} value={form.calories} onChange={(event) => update({ calories: event.target.value })} /></div>
          <div><FieldLabel>蛋白质 (g/100g)</FieldLabel><Input type="number" min={0} value={form.protein} onChange={(event) => update({ protein: event.target.value })} /></div>
          <div><FieldLabel>碳水 (g/100g)</FieldLabel><Input type="number" min={0} value={form.carbs} onChange={(event) => update({ carbs: event.target.value })} /></div>
          <div><FieldLabel>脂肪 (g/100g)</FieldLabel><Input type="number" min={0} value={form.fat} onChange={(event) => update({ fat: event.target.value })} /></div>
          <div className="sm:col-span-2"><FieldLabel>上架状态</FieldLabel><Select value={form.isActive ? "active" : "inactive"} onChange={(event) => update({ isActive: event.target.value === "active" })}><option value="active">上架（用户可见）</option><option value="inactive">下架（仅后台可见）</option></Select></div>
        </div>
        {error && <p className="mt-4 text-sm text-[#b34a3e]">{error}</p>}
        <div className="mt-7 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>取消</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? "正在保存..." : food ? "保存修改" : "创建食物"}</Button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}

function round(value: number) { return Math.round(Number(value) * 10) / 10; }
