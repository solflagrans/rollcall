export function FormCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Surface
      as="section"
      level="raised"
      className="p-5 sm:p-8"
      aria-label={label}
    >
      {children}
    </Surface>
  );
}
import { Surface } from "@/components/ui/surface";
