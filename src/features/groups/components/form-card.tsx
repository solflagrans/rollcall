export function FormCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-md border bg-card p-5 sm:p-8"
      aria-label={label}
    >
      {children}
    </section>
  );
}
