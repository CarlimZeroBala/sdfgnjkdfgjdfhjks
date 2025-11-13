import React, { useEffect, useMemo, useState } from "react";
import { useBoard } from "../store/board";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultListId?: number; // normalmente 1 = "Reposições Pendentes"
};

function nextRoundedTime(minutesStep = 10) {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = Math.ceil(d.getMinutes() / minutesStep) * minutesStep;
  d.setMinutes(m);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

export default function AddPatientModal({ open, onClose, defaultListId = 1 }: Props) {
  const professionals = useBoard((s) => s.catalog.professionals);
  const patients = useBoard((s) => s.catalog.patients);
  const addPatientByIds = useBoard((s) => s.addPatientByIds);

  const [professionalId, setProfessionalId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [mode, setMode] = useState<"full" | "partial">("partial");

  // campos visíveis apenas quando "Parcial"
  const t = nextRoundedTime();
  const [date, setDate] = useState(t.date);
  const [time, setTime] = useState(t.time);

  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === patientId) || null,
    [patientId, patients]
  );

  useEffect(() => {
    if (!open) {
      setProfessionalId("");
      setPatientId("");
      setMode("partial");
      const n = nextRoundedTime();
      setDate(n.date);
      setTime(n.time);
    }
  }, [open]);

  const canSave =
    professionalId &&
    patientId &&
    (mode === "full" || (mode === "partial" && date && time));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    const partialAt =
      mode === "partial" ? new Date(`${date}T${time}:00`).toISOString() : undefined;

    addPatientByIds({
      listId: defaultListId,
      professionalId,
      patientId,
      mode,
      partialAt, // só se parcial
    });

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
      <div className="w-[min(92vw,560px)] rounded-xl bg-white p-5 shadow-xl dark:bg-tdark-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-trello-text dark:text-tdark-text">
            Criar Card de Paciente
          </h2>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Paciente */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Paciente
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:ring
                         bg-white text-trello-text dark:border-slate-600 dark:bg-tdark-list dark:text-tdark-text"
              required
            >
              <option value="" disabled hidden>
                Selecione um paciente...
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Contato: {selectedPatient?.contact || "—"}
            </p>
          </div>

          {/* Profissional */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Profissional Principal
            </label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:ring
                         bg-white text-trello-text dark:border-slate-600 dark:bg-tdark-list dark:text-tdark-text"
              required
            >
              <option value="" disabled hidden>
                Selecione um profissional...
              </option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.specialty}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de reposição */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tipo de reposição
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "full" | "partial")}
              className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:ring
                         bg-white text-trello-text dark:border-slate-600 dark:bg-tdark-list dark:text-tdark-text"
            >
              <option value="full">Completa (50 min)</option>
              <option value="partial">Parcial (10 min)</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {mode === "full"
                ? "A sessão será marcada como concluída com 50 minutos."
                : "Será registrada a primeira fração de 10 minutos; você poderá adicionar mais depois."}
            </p>
          </div>

          {/* Data/Hora — apenas se Parcial */}
          {mode === "partial" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Data da parcial (+10)
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:ring
                             bg-white text-trello-text dark:border-slate-600 dark:bg-tdark-list dark:text-tdark-text"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Hora da parcial (+10)
                </label>
                <input
                  type="time"
                  value={time}
                  step={60}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2 outline-none focus:ring
                             bg-white text-trello-text dark:border-slate-600 dark:bg-tdark-list dark:text-tdark-text"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button type="submit" disabled={!canSave} className="btn-primary disabled:opacity-60">
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
