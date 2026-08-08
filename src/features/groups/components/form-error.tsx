export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-sm border border-destructive/40 bg-status-absent-background p-3 text-sm text-status-absent-foreground"
    >
      {message}
    </div>
  );
}
