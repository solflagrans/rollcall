import { GroupForm } from "@/features/groups/components/group-form";
import { PageHeader } from "@/features/groups/components/page-header";

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Первый шаг"
        title="Создание учебной группы"
        description="Создайте группу сейчас — учебные периоды можно добавить позже."
      />
      <section className="rounded-md border bg-card p-5 sm:p-8" aria-label="Форма создания группы">
        <GroupForm mode="create" />
      </section>
    </div>
  );
}
