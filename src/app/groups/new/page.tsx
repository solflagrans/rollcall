import { FormCard } from "@/features/groups/components/form-card";
import { GroupForm } from "@/features/groups/components/group-form";
import { PageHeader } from "@/features/groups/components/page-header";
import { SuccessNotice } from "@/features/groups/components/success-notice";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <SuccessNotice notice={notice} />
      <PageHeader
        eyebrow="Новая группа"
        title="Создание учебной группы"
        description="Укажите название группы и выберите единую систему учебных периодов."
      />
      <FormCard label="Форма создания группы">
        <GroupForm mode="create" />
      </FormCard>
    </div>
  );
}
