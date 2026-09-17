import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { FoodsPanel } from "@/features/admin/foods-panel";
import { UsersPanel } from "@/features/admin/users-panel";
import { VisionKeysPanel } from "@/features/admin/vision-keys-panel";

const tabs = [
  { key: "users", label: "用户与角色" },
  { key: "foods", label: "食物库" },
  { key: "keys", label: "识图 Key" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>("users");
  return <div className="mx-auto max-w-6xl">
    <PageHeader eyebrow="Console" title="后台管理" description="管理用户与角色、维护食物库数据，并切换图片识别所使用的大模型 Key。" />
    <div className="mb-6 flex flex-wrap gap-2">{tabs.map((item) => <button key={item.key} onClick={() => setTab(item.key)} className={`h-9 rounded-md px-4 text-sm font-medium transition-colors ${tab === item.key ? "bg-[#315d47] text-white" : "border border-[#d8ddd6] text-[#2b342d] hover:bg-[#f1f4ef] dark:border-[#3b443d] dark:text-[#e7ebe5] dark:hover:bg-[#283129]"}`}>{item.label}</button>)}</div>
    {tab === "users" && <UsersPanel />}
    {tab === "foods" && <FoodsPanel />}
    {tab === "keys" && <VisionKeysPanel />}
  </div>;
}
