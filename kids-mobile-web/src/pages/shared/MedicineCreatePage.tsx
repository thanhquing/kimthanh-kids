import { TopBar } from "@/components/mobile/MobileShell";
import { Field, TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { medicineKeys, useCreateMedicine } from "@/api/medicine";
import { useMyChildren } from "@/api/students";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

export function MedicineCreatePage() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const children = useMyChildren();
  const createMutation = useCreateMedicine();
  const [studentId, setStudentId] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState("");
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [reason, setReason] = useState("");
  const selectedStudentId = studentId || children.data?.[0]?.id || "";

  async function onSubmit() {
    if (!selectedStudentId || !medicineName.trim() || !dosage.trim() || !schedule.trim()) return;
    await createMutation.mutateAsync({
      studentId: selectedStudentId,
      medicineName: medicineName.trim(),
      dosage: dosage.trim(),
      schedule: schedule.trim(),
      startDate,
      endDate,
      reason: reason.trim() || undefined,
    });
    await queryClient.invalidateQueries({ queryKey: medicineKeys.list("parent") });
    toast(t("medicine.createSaved"));
  }

  return (
    <>
      <TopBar title={t("medicine.createTitle")} backTo="/parent/medicine" />
      <div className="card mt-3 space-y-3 p-4">
        {children.isLoading ? <div className="text-sm text-slate-500">{t("common.loading")}</div> : null}
        {children.isError ? <div className="text-sm text-red-600">{t("medicine.childrenError")}</div> : null}
        <Field label={t("medicine.chooseChild")}>
          <select className="field" value={selectedStudentId} onChange={(event) => setStudentId(event.target.value)}>
            {(children.data ?? []).map((child) => (
              <option key={child.id} value={child.id}>{child.fullName} - {child.classroom?.name ?? t("students.noClass")}</option>
            ))}
          </select>
        </Field>
        <Field label={t("medicine.name")}>
          <input className="field" value={medicineName} onChange={(event) => setMedicineName(event.target.value)} />
        </Field>
        <Field label={t("medicine.dosage")}>
          <input className="field" value={dosage} onChange={(event) => setDosage(event.target.value)} />
        </Field>
        <Field label={t("medicine.schedule")}>
          <input className="field" value={schedule} onChange={(event) => setSchedule(event.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("medicine.startDate")}>
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label={t("medicine.endDate")}>
            <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
        <TextAreaField label={t("medicine.reason")} value={reason} onChange={setReason} />
        <button
          type="button"
          className="btn-primary w-full disabled:opacity-60"
          disabled={!selectedStudentId || !medicineName.trim() || !dosage.trim() || !schedule.trim() || createMutation.isPending}
          onClick={onSubmit}
        >
          {createMutation.isPending ? t("medicine.createSaving") : t("medicine.createSubmit")}
        </button>
      </div>
    </>
  );
}
