import { useState } from "react";
import { Dumbbell, Leaf, LockKeyhole, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { loginUser, registerUser } from "@/services/auth-service";
import { useAppStore } from "@/stores/app-store";

const credentialsSchema = z.object({
  username: z.string().trim().min(3, "用户名至少 3 个字符").max(48).regex(/^[a-zA-Z0-9_.-]+$/, "仅支持字母、数字、点、下划线和连字符"),
  password: z.string().min(8, "密码至少 8 个字符").max(72, "密码最多 72 个字符"),
});
type Credentials = z.infer<typeof credentialsSchema>;

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const setSession = useAppStore((state) => state.setSession);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  const submit = async (values: Credentials) => {
    setSubmitError(null);
    try {
      const session = mode === "login" ? await loginUser(values.username, values.password) : await registerUser(values.username, values.password);
      setSession(session);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "请求未完成，请稍后重试。");
    }
  };

  return (
    <main className="app-surface grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden border-r border-[#e2e6df] bg-[#edf2eb] p-12 dark:border-[#343b35] dark:bg-[#1c251e] lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3 text-[#315d47] dark:text-[#aac7ae]"><span className="flex size-9 items-center justify-center rounded-md border border-current"><Leaf size={19} /></span><span className="font-semibold">饮食助手</span></div>
        <div className="max-w-md">
          <p className="mb-4 text-xs font-semibold tracking-[0.16em] text-[#5f7d6d] uppercase">Food. Training. Rhythm.</p>
          <h1 className="text-4xl font-semibold leading-tight text-[#223026] dark:text-[#ecf3eb]">把饮食安排成长期可持续的日常。</h1>
          <div className="mt-10 grid grid-cols-2 gap-3">
            {[{ icon: Leaf, label: "菜谱与做法" }, { icon: Dumbbell, label: "目标与消耗" }].map(({ icon: Icon, label }) => <div key={label} className="border border-[#d8e0d6] bg-[#f8faf7] p-4 dark:border-[#39473b] dark:bg-[#202a22]"><Icon size={18} className="mb-6 text-[#5f7d6d]" /><span className="text-sm font-medium text-[#344036] dark:text-[#dce6dc]">{label}</span></div>)}
          </div>
        </div>
        <p className="text-xs text-[#718073]">本机开发环境 · MySQL 账户认证</p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 text-[#315d47] lg:hidden"><span className="flex size-9 items-center justify-center rounded-md border border-current"><Leaf size={19} /></span><span className="font-semibold">饮食助手</span></div>
          <p className="text-sm font-medium text-[#5f7d6d]">账户访问</p>
          <h2 className="mt-2 text-2xl font-semibold text-[#202521] dark:text-[#f0f3ee]">{mode === "login" ? "登录你的饮食空间" : "创建本地账户"}</h2>
          <p className="subtle-text mt-2 text-sm leading-6">{mode === "login" ? "继续查看你的菜谱安排与训练饮食记录。" : "账户信息将保存在项目的 MySQL 数据库中。"}</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(submit)}>
            <div><FieldLabel>用户名</FieldLabel><div className="relative"><UserRound className="absolute left-3 top-3 text-[#849087]" size={16} /><Input className="pl-9" autoComplete="username" placeholder="例如 fit.jane" {...register("username")} /></div>{errors.username && <p className="mt-1.5 text-xs text-[#b34a3e]">{errors.username.message}</p>}</div>
            <div><FieldLabel>密码</FieldLabel><div className="relative"><LockKeyhole className="absolute left-3 top-3 text-[#849087]" size={16} /><Input className="pl-9" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="至少 8 个字符" {...register("password")} /></div>{errors.password && <p className="mt-1.5 text-xs text-[#b34a3e]">{errors.password.message}</p>}</div>
            {submitError && <p className="border-l-2 border-[#c56455] bg-[#fff6f4] px-3 py-2 text-sm text-[#9f4336] dark:bg-[#34211f] dark:text-[#f0aaa0]">{submitError}</p>}
            <Button className="w-full" type="submit" disabled={isSubmitting}>{isSubmitting ? "正在处理..." : mode === "login" ? "登录" : "创建账户"}</Button>
          </form>
          <p className="mt-6 text-center text-sm subtle-text">{mode === "login" ? "还没有账户？" : "已有账户？"} <button className="font-medium text-[#315d47] hover:underline dark:text-[#aac7ae]" onClick={() => { setMode(mode === "login" ? "register" : "login"); setSubmitError(null); }}>{mode === "login" ? "创建一个" : "去登录"}</button></p>
        </div>
      </section>
    </main>
  );
}
