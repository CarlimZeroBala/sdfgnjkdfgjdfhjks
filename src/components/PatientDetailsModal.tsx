import { useState, useMemo } from "react";
import { useBoard, Patient, Replacement, Fraction } from "../store/board";
import AddReplacementModal from "./AddReplacementModal";

/* ---------- Helpers ---------- */
function fmt(dt: string) {
  const d = new Date(dt);
  return (
    d.toLocaleDateString("pt-BR") +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtMaybe(dt?: string) {
  return dt ? fmt(dt) : "Sem data definida";
}

function sumFractions(r: Replacement | null) {
  if (!r) return 0;
  return r.completedFractions.reduce((s, f) => s + f.duration, 0);
}

function isFull(r: Replacement) {
  return sumFractions(r) >= (r.totalDuration || 50);
}

/* ---------- Wrapper sem hooks condicionais ---------- */
type Props = {
  open: boolean;
  onClose: () => void;
  patient: Patient | null;
};

export default function PatientDetailsModal({ open, onClose, patient }: Props) {
  if (!open || !patient) return null;
  return <PatientDetailsModalInner patient={patient} onClose={onClose} />;
}

/* ---------- Componente real do modal ---------- */
function PatientDetailsModalInner({
  patient,
  onClose,
}: {
  patient: Patient;
  onClose: () => void;
}) {
  const getActive = useBoard((s) => s.getActiveReplacement);
  const getPending = useBoard((s) => s.getPendingMinutes);
  const add10 = useBoard((s) => s.addPartial10);
  const add50 = useBoard((s) => s.completeFull50);

  const [tab, setTab] = useState<"current" | "history">("current");
  const [openReplacement, setOpenReplacement] = useState(false);

  const active = getActive(patient);
  const pending = getPending(patient);
  const done = sumFractions(active);

  const pct = useMemo(
    () =>
      active ? Math.round((done / (active.totalDuration || 50)) * 100) : 0,
    [active, done]
  );

  const fullSessions = patient.replacements.filter((r) => isFull(r));
  const partialSessions = patient.replacements.filter((r) => !isFull(r));

  const renderFractions = (fractions: Fraction[]) =>
    fractions.length ? (
      <ul className="mt-2 space-y-1 text-sm">
        {fractions.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 dark:bg-slate-800"
          >
            <span>{fmt(f.at)}</span>
            <span>+{f.duration} min</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-slate-500">Nenhuma fração registrada.</p>
    );

  return (
    <>
      {/* Modal do PACIENTE – só aparece quando NÃO estamos criando reposição */}
      {!openReplacement && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-[min(96vw,720px)] bg-white dark:bg-tdark-card rounded-xl p-6 shadow-xl">
            {/* HEADER */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{patient.name}</h2>
                <p className="text-sm text-slate-500">
                  Contato: {patient.contact || "—"}
                </p>
              </div>

              <button
                onClick={onClose}
                className="rounded px-3 py-1 text-sm hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* BOTÃO: NOVA REPOSIÇÃO */}
            <button
              onClick={() => setOpenReplacement(true)}
              className="mb-4 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
            >
              ➕ Nova reposição
            </button>

            {/* ABAS */}
            <div className="flex gap-3 border-b mb-4 pb-1">
              <button
                onClick={() => setTab("current")}
                className={`px-3 py-1 ${
                  tab === "current" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                Sessão ativa
              </button>
              <button
                onClick={() => setTab("history")}
                className={`px-3 py-1 ${
                  tab === "history" ? "border-b-2 border-blue-500" : ""
                }`}
              >
                Histórico
              </button>
            </div>

            {/* CONTEÚDO */}
            {tab === "current" ? (
              active ? (
                <>
                  <div className="border rounded-lg p-4">
                    <p>
                      <span className="font-medium">Agendada: </span>
                      {fmtMaybe(active.scheduledAt)}
                    </p>

                    <p className="mt-1">
                      <span className="font-medium">Total: </span>
                      {active.totalDuration} min
                    </p>

                    {/* PROGRESSO */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs">
                        <span>{done} min feitos</span>
                        <span>{pending} min pendentes</span>
                      </div>

                      <div className="h-2 bg-slate-200 rounded-full mt-1">
                        <div
                          className="h-full bg-green-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* AÇÕES */}
                    {!active.closed && (
                      <div className="flex gap-2 mt-4">
                        {pending > 0 && (
                          <button
                            onClick={() =>
                              add10(patient.id, new Date().toISOString())
                            }
                            className="bg-blue-600 text-white px-3 py-1 rounded"
                          >
                            +10 min
                          </button>
                        )}

                        {!isFull(active) && (
                          <button
                            onClick={() =>
                              add50(patient.id, new Date().toISOString())
                            }
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Completar sessão (50)
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <p className="font-medium">Frações</p>
                      {renderFractions(active.completedFractions)}
                    </div>
                  </div>
                </>
              ) : (
                <p>Nenhuma sessão ativa.</p>
              )
            ) : (
              <div className="max-h-[50vh] overflow-y-auto space-y-3">
                {/* COMPLETAS */}
                <div>
                  <h3 className="font-semibold">Sessões completas</h3>
                  {fullSessions.map((r) => (
                    <div key={r.id} className="p-3 border rounded-lg mt-2">
                      <p>Agendada: {fmtMaybe(r.scheduledAt)}</p>
                      <p>Total: {r.totalDuration} min</p>
                      <p className="font-medium mt-2">Frações:</p>
                      {renderFractions(r.completedFractions)}
                    </div>
                  ))}
                  {!fullSessions.length && <p>Nenhuma sessão completa.</p>}
                </div>

                {/* PARCIAIS */}
                <div>
                  <h3 className="font-semibold">Sessões parciais</h3>
                  {partialSessions.map((r) => (
                    <div key={r.id} className="p-3 border rounded-lg mt-2">
                      <p>Agendada: {fmtMaybe(r.scheduledAt)}</p>
                      <p className="font-medium mt-2">Frações:</p>
                      {renderFractions(r.completedFractions)}
                    </div>
                  ))}
                  {!partialSessions.length && (
                    <p>Nenhuma sessão parcial.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE NOVA REPOSIÇÃO
          Quando openReplacement = true, só este fica visível, sem o modal de paciente atrás */}
      <AddReplacementModal
        open={openReplacement}
        onClose={() => setOpenReplacement(false)}
        patientId={patient.id}
      />
    </>
  );
}
