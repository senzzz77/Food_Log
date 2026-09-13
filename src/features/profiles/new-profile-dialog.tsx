import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input } from "@/components/ui/field";
import { PROFILE_ACCENTS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import { useProfileStore } from "@/stores/profile-store";

export function NewProfileDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [accent, setAccent] = useState(PROFILE_ACCENTS[0]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const token = useAppStore((state) => state.authToken);
  const setActiveProfile = useAppStore((state) => state.setActiveProfile);
  const create = useProfileStore((state) => state.create);

  const submit = async () => {
    if (!token) return;
    setSaving(true); setError(null);
    try {
      const profile = await create(token, { displayName: name.trim(), accent });
      setActiveProfile(profile.id); setName(""); setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法创建档案。");
    } finally { setSaving(false); }
  };
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><Button><Plus size={16} />新建档案</Button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-40 bg-[#18211a]/35 backdrop-blur-[1px]" /><Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md p-6 shadow-xl shadow-black/10">
      <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold">新建人物档案</Dialog.Title><Dialog.Description className="subtle-text mt-1 text-sm">他会拥有独立的身体指标、饮食记录与推荐安排。</Dialog.Description></div><Dialog.Close asChild><button className="subtle-text p-1 hover:text-[#202521] dark:hover:text-white" aria-label="关闭"><X size={18} /></button></Dialog.Close></div>
      <div className="mt-6"><FieldLabel>档案名称</FieldLabel><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={48} placeholder="例如：林然" autoFocus /></div>
      <div className="mt-5"><FieldLabel>角色颜色</FieldLabel><div className="flex gap-3">{PROFILE_ACCENTS.map((color) => <button key={color} onClick={() => setAccent(color)} aria-label={`选择颜色 ${color}`} className={`size-7 rounded-full border-2 ${accent === color ? "border-[#202521] dark:border-white" : "border-transparent"}`} style={{ backgroundColor: color }} />)}</div></div>
      {error && <p className="mt-4 text-sm text-[#b34a3e]">{error}</p>}
      <div className="mt-7 flex justify-end gap-2"><Dialog.Close asChild><Button variant="secondary">取消</Button></Dialog.Close><Button onClick={() => void submit()} disabled={!name.trim() || saving}>{saving ? "正在创建..." : "创建档案"}</Button></div>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
