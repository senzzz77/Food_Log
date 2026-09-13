export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-[#5f7d6d] uppercase">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-normal text-[#202521] dark:text-[#f0f3ee]">{title}</h1>
        {description && <p className="subtle-text mt-2 max-w-2xl text-sm leading-6">{description}</p>}
      </div>
      {action}
    </header>
  );
}
