import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-bg-elevated border border-border-default grid place-items-center mb-4">
        <Icon className="h-6 w-6 text-text-tertiary" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-tertiary max-w-sm mb-5">{description}</p>
      {action && (
        action.href
          ? <Link href={action.href} className="btn-primary text-sm">{action.label}</Link>
          : <button onClick={action.onClick} className="btn-primary text-sm">{action.label}</button>
      )}
    </div>
  );
}
