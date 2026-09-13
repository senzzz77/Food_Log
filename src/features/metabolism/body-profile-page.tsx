import { useEffect, useMemo, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Activity, RotateCcw, Save, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { ACTIVITY_OPTIONS, GOAL_LABELS } from "@/lib/constants";
import { calculateMetabolism } from "@/lib/calculations";
import { formatCalories } from "@/lib/utils";
import { loadBodyProfile, saveBodyProfile } from "@/services/profile-service";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";
import type { BodyProfile } from "@/types/domain";

const optionalNumber = (min: number, max: number) =>
  z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return null;
    return typeof value === "string" ? Number(value) : value;
  }, z.number().min(min).max(max).nullable().optional());

const bodySchema = z.object({
  heightCm: z.coerce.number().min(100, "身高应在 100-250cm").max(250, "身高应在 100-250cm"),
  weightKg: z.coerce.number().min(25, "体重应在 25-350kg").max(350, "体重应在 25-350kg"),
  age: z.coerce.number().int().min(14, "年龄应在 14-100 岁").max(100, "年龄应在 14-100 岁"),
  sex: z.enum(["male", "female"]),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["fat_loss", "muscle_gain", "maintenance"]),
  targetWeightKg: z.coerce.number().min(25, "目标体重应在 25-350kg").max(350, "目标体重应在 25-350kg"),
  weeklyRateKg: z.coerce.number().min(0.1, "每周变化至少 0.1kg").max(1, "每周变化最大 1kg"),
  manualTdee: optionalNumber(800, 6000),
  manualTargetCalories: optionalNumber(800, 6000),
  manualProtein: optionalNumber(0, 500),
  manualCarbs: optionalNumber(0, 1000),
  manualFat: optionalNumber(0, 300),
});
type BodyForm = z.infer<typeof bodySchema>;
const defaults: BodyForm = {
  heightCm: 170, weightKg: 65, age: 28, sex: "female", activityLevel: "moderate", goal: "fat_loss", targetWeightKg: 60, weeklyRateKg: 0.4,
  manualTdee: null, manualTargetCalories: null, manualProtein: null, manualCarbs: null, manualFat: null,
};

export function BodyProfilePage() {
  const token = useAppStore((state) => state.authToken);
  const profileId = useAppStore((state) => state.activeProfileId);
  const profile = useProfileStore((state) => state.profiles.find((item) => item.id === profileId));
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<BodyForm>({ resolver: zodResolver(bodySchema), defaultValues: defaults });

  useEffect(() => {
    if (!token || !profileId) return;
    setLoading(true);
    void loadBodyProfile(token, profileId).then(({ body }) => {
      if (body) reset({ ...defaults, ...body });
    }).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [profileId, reset, token]);

  const values = watch();
  const result = useMemo(() => calculateMetabolism({ ...values, profileId: profileId ?? "", userId: "", updatedAt: "" } as BodyProfile), [profileId, values]);

  if (!profileId || !profile) return <Navigate to="/profiles" replace />;

  const submit = async (data: BodyForm) => {
    if (!token) return;
    setMessage(null);
    try {
      await saveBodyProfile(token, profileId, data);
      setMessage("基础指标与营养目标已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败。");
    }
  };

  const resetOverrides = () => {
    setValue("manualTdee", null);
    setValue("manualTargetCalories", null);
    setValue("manualProtein", null);
    setValue("manualCarbs", null);
    setValue("manualFat", null);
    setMessage("已恢复为系统推荐值，记得点击保存。");
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={profile.displayName} title="档案指标" description="基础代谢采用 Mifflin-St Jeor 公式，可自定义 TDEE、每日摄入与三大营养素目标。" action={<Button onClick={handleSubmit(submit)} disabled={isSubmitting}><Save size={16} />{isSubmitting ? "保存中..." : "保存更新"}</Button>} />
      {loading ? (
        <p className="subtle-text text-sm">正在读取身体指标...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
          <form className="panel rounded-md p-5 sm:p-7" onSubmit={handleSubmit(submit)}>
            <div className="mb-6 flex items-center gap-2 border-b border-[#e5ece2] pb-4 text-[#597d55] dark:border-[#354437] dark:text-[#b8d4b2]"><Sparkles size={17} /><span className="text-sm font-bold">给角色一组可信的基础数据</span></div>
            <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
              <NumberField label="身高 (cm)" error={errors.heightCm?.message} input={register("heightCm")} />
              <NumberField label="当前体重 (kg)" step="0.1" error={errors.weightKg?.message} input={register("weightKg")} />
              <NumberField label="年龄" error={errors.age?.message} input={register("age")} />
              <div><FieldLabel>生理性别</FieldLabel><Select {...register("sex")}><option value="female">女</option><option value="male">男</option></Select></div>
              <div className="sm:col-span-2"><FieldLabel>活动水平</FieldLabel><Select {...register("activityLevel")}>{ACTIVITY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label} · 系数 {item.factor} · {item.description}</option>)}</Select></div>
              <div><FieldLabel>身体目标</FieldLabel><Select {...register("goal")}>{Object.entries(GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></div>
              <NumberField label="目标体重 (kg)" step="0.1" error={errors.targetWeightKg?.message} input={register("targetWeightKg")} />
              <div className="sm:col-span-2"><NumberField label={values.goal === "fat_loss" ? "预计每周减重 (kg)" : values.goal === "muscle_gain" ? "预计每周增重 (kg)" : "每周体重浮动上限 (kg)"} step="0.1" error={errors.weeklyRateKg?.message} input={register("weeklyRateKg")} /></div>
            </div>

            <div className="mt-7 border-t border-[#e2e9df] pt-6 dark:border-[#354337]">
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[#597d55] dark:text-[#b8d4b2]"><Activity size={17} /><span className="text-sm font-bold">自定义营养目标</span></div>
                <button type="button" onClick={resetOverrides} className="inline-flex items-center gap-1 text-xs font-medium text-[#5f7d6d] hover:text-[#315d47] dark:text-[#a7c7a9]"><RotateCcw size={13} />恢复推荐值</button>
              </div>
              <p className="subtle-text mb-4 text-xs">留空则使用系统推荐值，填写后按你的设定覆盖。</p>
              <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                <NumberField label="TDEE (kcal)" error={errors.manualTdee?.message} input={register("manualTdee")} placeholder={`推荐 ${result.tdee}`} />
                <NumberField label="每日摄入 (kcal)" error={errors.manualTargetCalories?.message} input={register("manualTargetCalories")} placeholder={`推荐 ${result.targetCalories.midpoint}`} />
                <NumberField label="蛋白质 (g)" error={errors.manualProtein?.message} input={register("manualProtein")} placeholder={`推荐 ${result.macros.protein}`} />
                <NumberField label="碳水 (g)" error={errors.manualCarbs?.message} input={register("manualCarbs")} placeholder={`推荐 ${result.macros.carbs}`} />
                <NumberField label="脂肪 (g)" error={errors.manualFat?.message} input={register("manualFat")} placeholder={`推荐 ${result.macros.fat}`} />
              </div>
            </div>

            {message && <p className={`mt-5 border-l-2 px-3 py-2 text-sm ${message.includes("已保存") ? "border-[#5f7d6d] bg-[#eff6ef] text-[#315d47] dark:bg-[#203024] dark:text-[#bfdbbf]" : "border-[#c56455] bg-[#fff6f4] text-[#9f4336] dark:bg-[#34211f] dark:text-[#f0aaa0]"}`}>{message}</p>}
            <div className="mt-7 flex justify-end border-t border-[#e2e9df] pt-5 dark:border-[#354337]"><Button type="submit" disabled={isSubmitting}>保存基础数据</Button></div>
          </form>

          <aside className="panel h-fit rounded-md p-6">
            <div className="flex items-center gap-2 text-[#5f7d6d]"><Activity size={17} /><span className="text-sm font-bold">代谢小结</span></div>
            <Metric label="基础代谢 BMR" value={`${formatCalories(result.bmr)} kcal`} />
            <Metric label="每日总消耗 TDEE" value={`${formatCalories(result.tdee)} kcal`} custom={values.manualTdee != null} />
            <div className="mt-6 border-t border-dashed border-[#d4e0d0] pt-5 dark:border-[#405241]">
              <p className="subtle-text text-xs">每日摄入{customTag(values.manualTargetCalories)}</p>
              <p className="mt-1 text-xl font-bold text-[#315d47] dark:text-[#b6d6b9]">{formatCalories(result.targetCalories.low)} - {formatCalories(result.targetCalories.high)} kcal</p>
              <p className="subtle-text mt-2 text-xs leading-5">目标中位值 {formatCalories(result.targetCalories.midpoint)} kcal。</p>
            </div>
            <div className="mt-6 border-t border-dashed border-[#d4e0d0] pt-5 dark:border-[#405241]">
              <p className="subtle-text text-xs">三大营养素目标</p>
              <Macro label="蛋白质" value={result.macros.protein} custom={values.manualProtein != null} />
              <Macro label="碳水" value={result.macros.carbs} custom={values.manualCarbs != null} />
              <Macro label="脂肪" value={result.macros.fat} custom={values.manualFat != null} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function customTag(custom: boolean) {
  return custom ? <span className="ml-2 rounded-full bg-[#e6efe7] px-2 py-0.5 text-[10px] font-medium text-[#4c6b56] dark:bg-[#2a3a2d] dark:text-[#a7c7a9]">已自定义</span> : null;
}

function NumberField({ label, error, input, step, placeholder }: { label: string; error?: string; input: UseFormRegisterReturn; step?: string; placeholder?: string }) {
  return <div><FieldLabel>{label}</FieldLabel><Input type="number" step={step ?? "1"} inputMode="decimal" placeholder={placeholder} {...input} />{error && <p className="mt-1.5 text-xs text-[#b34a3e]">{error}</p>}</div>;
}

function Metric({ label, value, custom }: { label: string; value: string; custom?: boolean }) {
  return <div className="mt-5"><p className="subtle-text text-xs">{label}{customTag(Boolean(custom))}</p><p className="mt-1 text-lg font-bold">{value}</p></div>;
}

function Macro({ label, value, custom }: { label: string; value: number; custom?: boolean }) {
  return <div className="mt-3 flex items-center justify-between"><span className="subtle-text text-xs">{label}{customTag(Boolean(custom))}</span><span className="text-sm font-bold">{Math.round(value)} g</span></div>;
}
