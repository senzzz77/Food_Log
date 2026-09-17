import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, KeyRound, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldLabel, Input } from "@/components/ui/field";
import { activateVisionKey, createVisionKey, deleteVisionKey, listVisionKeys, updateVisionKey, type AdminVisionKey } from "@/services/admin-service";
import { useAppStore } from "@/stores/app-store";

const DEFAULT_MODEL = "qwen3.5-plus";
const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

export function VisionKeysPanel() {
  const token = useAppStore((state) => state.authToken);
  const [keys, setKeys] = useState<AdminVisionKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [formTarget, setFormTarget] = useState<AdminVisionKey | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminVisionKey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    setLoading(true);
    void listVisionKeys(token)
      .then(({ keys: items }) => { if (alive) { setKeys(items); setMessage(null); } })
      .catch((error: Error) => { if (alive) setMessage(error.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [token, reloadKey]);

  const refresh = () => setReloadKey((value) => value + 1);

  const activate = async (key: AdminVisionKey) => {
    if (!token) return;
    setBusyId(key.id);
    try {
      await activateVisionKey(token, key.id);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法启用该 Key。");
    } finally { setBusyId(null); }
  };

  const confirmDelete = async () => {
    if (!token || !pendingDelete) return;
    setDeleting(true);
    try {
      await deleteVisionKey(token, pendingDelete.id);
      setPendingDelete(null);
      setMessage(null);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "无法删除该 Key。");
    } finally { setDeleting(false); }
  };

  return <section className="panel rounded-md">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e7eee4] px-5 py-4 dark:border-[#354337]">
      <div><h2 className="font-semibold">识图大模型 Key</h2><p className="subtle-text mt-1 text-xs">图片识别会使用「启用中」的那条 Key；没有配置时回退到服务端环境变量。</p></div>
      <div className="flex items-center gap-2"><Button onClick={() => { setFormTarget(null); setFormOpen(true); }}><Plus size={16} />新增 Key</Button><Button variant="secondary" onClick={refresh} disabled={loading} title="刷新"><RefreshCw size={15} /></Button></div>
    </header>
    {message && <p className="border-b border-[#f0ded9] bg-[#fff6f4] px-5 py-2.5 text-sm text-[#9f4336] dark:border-[#4a2f2c] dark:bg-[#34211f] dark:text-[#f0aaa0]">{message}</p>}
    {loading ? <p className="subtle-text px-5 py-8 text-sm">正在读取 Key 列表...</p> : keys.length ? <ul>{keys.map((key) => <li key={key.id} className="flex flex-wrap items-center gap-3 border-b border-[#eef3ec] px-5 py-4 last:border-b-0 dark:border-[#2c382e]">
      <span className={`inline-flex size-9 flex-none items-center justify-center rounded-md ${key.isActive ? "bg-[#e5f1df] text-[#3c6b43] dark:bg-[#314a32] dark:text-[#d7ebd1]" : "bg-[#f0f3ed] text-[#718073] dark:bg-[#29352b] dark:text-[#b3c1b4]"}`}><KeyRound size={17} /></span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-medium">{key.label}{key.isActive && <span className="rounded-full bg-[#e5f1df] px-2 py-0.5 text-xs font-normal text-[#3c6b43] dark:bg-[#314a32] dark:text-[#d7ebd1]">启用中</span>}</p>
        <p className="subtle-text mt-1 truncate text-xs">{key.model} · {key.baseUrl} · {key.apiKeyMasked}</p>
      </div>
      <div className="flex items-center gap-1">
        {!key.isActive && <Button variant="secondary" className="h-9 px-3" disabled={busyId === key.id} onClick={() => void activate(key)}><Check size={15} />启用</Button>}
        <button className="subtle-text p-1.5 hover:text-[#3c6b43]" title="编辑" onClick={() => { setFormTarget(key); setFormOpen(true); }}><Pencil size={16} /></button>
        <button className="subtle-text p-1.5 hover:text-[#b34a3e]" title="删除" onClick={() => setPendingDelete(key)}><Trash2 size={16} /></button>
      </div>
    </li>)}</ul> : <p className="subtle-text px-5 py-8 text-sm">还没有配置 Key。新增第一条后会自动启用。</p>}
    {formOpen && <VisionKeyFormDialog target={formTarget} onClose={() => setFormOpen(false)} onSaved={() => { setMessage(null); refresh(); }} />}
    <ConfirmDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }} title="删除 Key" description={`删除「${pendingDelete?.label ?? ""}」后，若它正是启用中的那条，识别会回退到环境变量中的 Key。`} pending={deleting} onConfirm={() => void confirmDelete()} />
  </section>;
}

function VisionKeyFormDialog({ target, onClose, onSaved }: { target: AdminVisionKey | null; onClose: () => void; onSaved: () => void }) {
  const token = useAppStore((state) => state.authToken);
  const [label, setLabel] = useState(target?.label ?? "");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(target?.model ?? DEFAULT_MODEL);
  const [baseUrl, setBaseUrl] = useState(target?.baseUrl ?? DEFAULT_BASE_URL);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!token) return;
    if (!label.trim() || !model.trim() || !baseUrl.trim()) return setError("请填写名称、模型与 Base URL。");
    if (!target && apiKey.trim().length < 8) return setError("请填写 API Key（至少 8 个字符）。");
    setSaving(true); setError(null);
    try {
      if (target) {
        // 编辑时留空表示不改动已保存的 Key。
        await updateVisionKey(token, target.id, { label: label.trim(), model: model.trim(), baseUrl: baseUrl.trim(), ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) });
      } else {
        await createVisionKey(token, { label: label.trim(), apiKey: apiKey.trim(), model: model.trim(), baseUrl: baseUrl.trim() });
      }
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
        <div className="flex items-start justify-between gap-4"><div><Dialog.Title className="text-lg font-semibold">{target ? "编辑 Key" : "新增 Key"}</Dialog.Title><Dialog.Description className="subtle-text mt-1 text-sm">支持任何兼容 OpenAI 接口的多模态模型服务。</Dialog.Description></div><Dialog.Close asChild><button className="subtle-text p-1 hover:text-[#202521] dark:hover:text-white" aria-label="关闭"><X size={18} /></button></Dialog.Close></div>
        <div className="mt-6 grid gap-4">
          <div><FieldLabel>名称</FieldLabel><Input value={label} maxLength={64} onChange={(event) => setLabel(event.target.value)} placeholder="例如：千问主账号" autoFocus /></div>
          <div><FieldLabel>API Key</FieldLabel><Input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={target ? `留空则不修改（当前 ${target.apiKeyMasked}）` : "sk-..."} autoComplete="off" /></div>
          <div><FieldLabel>模型名</FieldLabel><Input value={model} maxLength={64} onChange={(event) => setModel(event.target.value)} /></div>
          <div><FieldLabel>Base URL</FieldLabel><Input value={baseUrl} maxLength={255} onChange={(event) => setBaseUrl(event.target.value)} /></div>
        </div>
        {error && <p className="mt-4 text-sm text-[#b34a3e]">{error}</p>}
        <div className="mt-7 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>取消</Button><Button onClick={() => void submit()} disabled={saving}>{saving ? "正在保存..." : target ? "保存修改" : "创建并启用"}</Button></div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
