import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

type PatientOption = {
  id: string;
  name: string;
  contact?: string | null;
};

type ProfessionalOption = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  // coluna (lista) na qual a reposição foi criada – ainda não vai pro Supabase,
  // mas mantemos para o estado interno do board, se precisar.
  defaultListId?: number;

  // Usado no board.tsx
  defaultPatientId?: string;

  // Usado no PatientDetailsModal
  patientId?: string;
  patientName?: string;

  // lista de pacientes (pode não vir quando o modal é aberto pelo card)
  patients?: PatientOption[];

  // profissionais responsáveis pela reposição
  professionals?: ProfessionalOption[];

  onCreated?: (row: any) => void;
};

// arredonda a hora atual pro próximo múltiplo de 10 min
function nextRoundedTime(minutesStep = 10) {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = Math.ceil(d.getMinutes() / minutesStep) * minutesStep;
  d.setMinutes(m);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export default function AddReplacementModal({
  open,
  onClose,
  defaultListId,
  defaultPatientId,
  patientId,
  patientName,
  patients = [],
  professionals = [],
  onCreated,
}: Props) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedProfessionalId, setSelectedProfessionalId] =
    useState<string>("");
  const [kind, setKind] = useState<"FULL" | "PARTIAL">("FULL");
  const [scheduledFor, setScheduledFor] = useState<string>(
    nextRoundedTime(10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // estado interno para os profissionais, para podermos buscar do Supabase
  const [internalProfessionals, setInternalProfessionals] =
    useState<ProfessionalOption[]>(professionals);

  // sempre que o pai mudar a prop professionals, sincronizamos
  useEffect(() => {
    setInternalProfessionals(professionals);
  }, [professionals]);

  // se não veio professionals pela prop, buscamos do Supabase quando abrir
  useEffect(() => {
    const shouldFetch = open && professionals.length === 0;
    if (!shouldFetch) return;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("professionals")
          .select("*");

        if (error) {
          console.error("Erro ao carregar profissionais dentro do modal:", error);
          return;
        }

        if (!cancelled) {
          const mapped =
            data?.map((p: any) => ({
              id: p.id,
              name: p.name,
            })) ?? [];
          setInternalProfessionals(mapped);
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar profissionais:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, professionals.length]);

  // lista de pacientes efetiva: ou a lista vinda por props, ou um fallback
  const effectivePatients: PatientOption[] =
    patients.length > 0
      ? patients
      : patientId
      ? [
          {
            id: patientId,
            name: patientName || "Paciente",
          },
        ]
      : [];

  useEffect(() => {
    if (!open) return;

    const initialId = defaultPatientId ?? patientId ?? "";

    setSelectedPatientId(initialId);
    setSelectedProfessionalId("");
    setKind("FULL");
    setScheduledFor(nextRoundedTime(10));
    setIsSubmitting(false);
    setErrorMsg(null);
  }, [open, defaultPatientId, patientId]);

  if (!open) return null;

  const minutes = kind === "FULL" ? 50 : 10;

  const canSave =
    !!selectedPatientId &&
    !!selectedProfessionalId &&
    !!scheduledFor &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        patient_id: selectedPatientId,
        professional_id: selectedProfessionalId,
        kind,
        minutes,
        scheduled_for: new Date(scheduledFor).toISOString(),
      };

      const { data, error } = await supabase
        .from("replacements")
        .insert(payload)
        .select("*")
        .single();

      if (error) {
        console.error("Erro Supabase ao criar reposição:", error);
        throw error;
      }

      onCreated?.({ ...data, list_id: defaultListId ?? null });
      onClose();
    } catch (err: any) {
      console.error("Erro geral ao salvar reposição:", err);
      setErrorMsg(
        `Erro ao salvar reposição. ${
          err?.message ? `(${err.message})` : "Tente novamente."
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // trava o select quando o paciente já vem definido
  const patientLocked = !!(defaultPatientId || patientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* Modal escuro e opaco */}
      <div className="w-full max-w-4xl rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold">
              Nova reposição
              {patientName ? ` – ${patientName}` : ""}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Agende uma nova reposição para o paciente.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-6">
          {/* Paciente */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-200">
              Paciente
            </label>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              disabled={patientLocked}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
            >
              <option value="">Selecione um paciente</option>
              {effectivePatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.contact ? ` • ${p.contact}` : ""}
                </option>
              ))}
            </select>
            {patientLocked && (
              <p className="text-xs text-slate-500">
                Paciente definido pelo card selecionado.
              </p>
            )}
          </div>

          {/* Profissional responsável */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-200">
              Profissional responsável
            </label>
            <select
              value={selectedProfessionalId}
              onChange={(e) => setSelectedProfessionalId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="">Selecione um profissional</option>
              {internalProfessionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de reposição */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Tipo de reposição
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setKind("FULL")}
                className={
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium " +
                  (kind === "FULL"
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700")
                }
              >
                Consulta completa (50 min)
              </button>
              <button
                type="button"
                onClick={() => setKind("PARTIAL")}
                className={
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium " +
                  (kind === "PARTIAL"
                    ? "border-sky-500 bg-sky-600 text-white"
                    : "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700")
                }
              >
                Consulta parcial (10 min)
              </button>
            </div>
            {kind === "PARTIAL" && (
              <p className="text-xs text-slate-500">
                Será registrada uma fração de 10 minutos; você poderá adicionar
                outras depois.
              </p>
            )}
          </div>

          {/* Data / horário */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-200">
              Data e horário
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-rose-400">{errorMsg}</p>
          )}

          {/* Rodapé */}
          <div className="mt-4 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!canSave}
              className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Criando..." : "Criar reposição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
