import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel = "确认删除", pendingLabel = "正在删除...", pending = false, error, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
}) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-[#18211a]/35 backdrop-blur-[1px]" />
      <Dialog.Content className="panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-md p-6 shadow-xl shadow-black/10">
        <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        <Dialog.Description className="subtle-text mt-2 text-sm leading-6">{description}</Dialog.Description>
        {error && <p className="mt-4 text-sm text-[#b34a3e]">{error}</p>}
        <div className="mt-7 flex justify-end gap-2">
          <Dialog.Close asChild><Button variant="secondary">取消</Button></Dialog.Close>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>{pending ? pendingLabel : confirmLabel}</Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
