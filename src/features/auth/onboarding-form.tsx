"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, School } from "lucide-react";
import { formatPeriodLabel, periodSystemLabels, periodSystems, type PeriodSystem } from "@/features/periods/domain";
import { createGroupAction, type OnboardingState } from "@/server/actions/onboarding";

const initialState: OnboardingState = {};

export function OnboardingForm({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const [state, action, pending] = useActionState(createGroupAction, initialState);
  const [system, setSystem] = useState<PeriodSystem>("semester");
  const [number, setNumber] = useState(1);

  return <form action={action} className="onboarding-form">
    <div className="form-grid">
      <div className="field"><label htmlFor="group-name">Название группы</label><input className="input" id="group-name" name="groupName" placeholder="Например, ИВТ-21" minLength={2} maxLength={120} required /></div>
      <div className="field"><label htmlFor="period-system">Как делится учебный год</label><select className="input" id="period-system" name="periodSystem" value={system} onChange={(event) => setSystem(event.target.value as PeriodSystem)}>{periodSystems.map((value) => <option value={value} key={value}>{periodSystemLabels[value]}</option>)}</select></div>
      <div className="field full-field"><label htmlFor="group-description">Описание</label><textarea className="input" id="group-description" name="description" placeholder="Специальность или другая полезная информация" maxLength={300} /></div>
      <div className="field"><label htmlFor="period-number">Номер текущего периода</label><input className="input" id="period-number" name="periodNumber" type="number" min={1} max={24} value={number} onChange={(event) => setNumber(Math.max(1, Number(event.target.value) || 1))} required /><span className="field-hint">Будет показано как «{formatPeriodLabel(system, number)}»</span></div>
      <div className="field"><label htmlFor="period-start">Начало периода</label><input className="input" id="period-start" name="startsOn" type="date" defaultValue={defaultStart} required /></div>
      <div className="field"><label htmlFor="period-end">Окончание периода</label><input className="input" id="period-end" name="endsOn" type="date" defaultValue={defaultEnd} required /></div>
    </div>
    {state.error && <p role="alert" className="form-error">{state.error}</p>}
    <button className="button primary" type="submit" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={18} /> : <School size={18} />}{pending ? "Создаём группу…" : "Создать группу"}</button>
  </form>;
}
