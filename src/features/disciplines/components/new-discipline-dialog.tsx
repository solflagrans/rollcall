"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DisciplineNameForm } from "@/features/disciplines/components/discipline-name-form";

export function NewDisciplineDialog({
  groupId,
  label = "Новая дисциплина",
}: {
  groupId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus aria-hidden="true" />
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Новая дисциплина"
        description="Дисциплина появится в списке дисциплин группы."
      >
        <DisciplineNameForm
          groupId={groupId}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </Dialog>
    </>
  );
}
