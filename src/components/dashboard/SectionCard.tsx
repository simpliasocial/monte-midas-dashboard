import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({ title, subtitle, icon: Icon, children, className }: SectionCardProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl border border-border shadow-card p-6 animate-fade-in",
      className
    )}>
      <div className="flex items-center gap-3 mb-5">
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-display font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
