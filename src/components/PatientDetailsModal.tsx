import { useMemo, useState } from "react";
import { useBoard, Patient } from "../store/board";

function fmt(dtISO: string) {
  const d = new Date(dtISO);
  const dia = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${dia} ${hora}`;
}

function nextRoundedTime(step = 10) {
  const d = new Date();
  d.setSeconds(0, 0);
  const min = d.getMinutes();
  const rounded = Math.ceil(min / step) * step;
  d.setMinutes(rounded);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

export default function PatientDetailsModal({
  open,
  onClose,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
}) {
  const add10 = useBoard((s) => s.addPartial10);
  const full50 = useBoard((s) => s.completeFull50);
  const getActive = useBoard((s) => s.getActiveReplacement);
  const getPending = useBoard((s) => s.getPendingMinutes);

  const active = patient ? getActive(patient) : null;
  const pending = patient ? getPending(patient) : 0;
  const done = active ? active.completedFractions.reduce((s, f) => s + f.duration, 0) : 0;
  const pct = useMemo(
    () => (active ? Math.round((done / (active.totalDuration || 50)) * 100) : 0),
    [active, done]
  );

  // 🔒 Se já houve qualquer parcial, não pode concluir direto 50
  const hasPartial = (active?.completedFractions?.length || 0) > 0;

  // Campos de data/hora escolhidos pelo usuário para adicionar +10
  const initial = nextRoundedTime();
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  if (!open || !patient) return null;

  const onAdd10 = () => {
    if (!date || !time) return;
    const iso = new Date(`${date}T${time}:00`).toISOString();
    add10(patient.id, iso);
  };

  const onCloseSession = () => {
    // será bloqueado no store se já houver parcial, mas também desabilitamos no UI
    full50(patient.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[min(92vw,640px)] rounded-xl bg-white p-5 shadow-xl dark:bg-tdark-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-trello-text dark:text-tdark-text">
            {patient.name}
          </h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <div className="text-sm text-trello-muted dark:text-tdark-muted mb-3">
          Contato: {patient.contact || "—"} • Prof.: {patient.mainProfessional || "—"}
        </div>

        {/* Progresso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
            <span>Progresso da sessão</span>
            <span>{done} / 50 min</span>
          </div>
          <div className="h-2 rounded bg-slate-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-sky-600 dark:bg-sky-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            Restantes: {pending} min
          </div>
        </div>

        {/* Frações (histórico) */}
        <div className="mb-4">
          <div className="font-medium text-trello-text dark:text-tdark-text mb-2">
            Reposições parciais (10 em 10)
          </div>
          {active?.completedFractions?.length ? (
            <ul className="space-y-1 text-sm">
              {active.completedFractions.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 dark:bg-white/5"
                >
                  <span className="text-slate-700 dark:text-slate-200">{fmt(f.at)}</span>
                  <span className="text-slate-600 dark:text-slate-300">+{f.duration} min</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Nenhuma fração registrada.
            </div>
          )}
        </div>

        {/* Adicionar fração com DATA/HORA escolhidas */}
        <div className="mb-4 grid grid-cols-2 gap-3">
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
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCloseSession}
            disabled={hasPartial}  // 🔒 desabilita se já houver parcial
            title={hasPartial ? "Indisponível: já existem parciais registradas" : ""}
            className={`rounded px-3 py-2 text-sm border
              ${hasPartial
                ? "border-slate-300 text-slate-400 cursor-not-allowed dark:border-slate-700"
                : "border-slate-300 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-white/10"}
            `}
          >
            Concluir sessão (50 min)
          </button>
          <button onClick={onAdd10} className="btn-primary">
            Adicionar +10 min
          </button>
        </div>
      </div>
    </div>
  );
}
