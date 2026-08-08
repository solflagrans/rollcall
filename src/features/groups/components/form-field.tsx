import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  hint,
  warning,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  warning?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const warningId = `${id}-warning`;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : warning ? (
        <p id={warningId} role="status" className="text-sm text-status-late-foreground">
          {warning}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
