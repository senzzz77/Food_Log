import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
export function PlaceholderPage({ title, description }: { title: string; description: string }) { return <div className="mx-auto max-w-5xl"><PageHeader eyebrow="In preparation" title={title} description={description} /><div className="panel flex min-h-56 items-center justify-center rounded-md"><ClipboardList size={22} className="text-[#829184]" /></div></div>; }
