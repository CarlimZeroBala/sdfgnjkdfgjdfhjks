import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import type { Patient } from "../store/board";

type ReplacementKind = "full" | "partial";

type Props = {
  open: boolean;
  onClose: () => void;

  // coluna onde a reposição entra (id da lista do board) – usado só no front
  defaultListId?: number;

  // lista de pacientes para o select (caso não venha um patientId fixo)
  patients?: Patient[];

  // se vier, a reposição será criada PARA ESSE paciente (não mostra select)
  patientId?: string;

  // callback pra atualizar o estado local (Zustand) com o registro criado
  onCreated?: (replacementRow: any) => void;
};

function nextRoundedTime(minutesStep = 10) {
  const d = new Date();
  d.setSeconds(0, 0);
  const m = Math.ceil(d.getMinutes() / minutesStep) * minutesStep;
  d.setMinutes(m);
  return d.toISOString();
}

export default function AddReplacementModal({
  open,
  onClose,
  defaultListId,
  patients,
  patientId,
  onCreated,
}: Props) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    patientId ?? ""
  );
  const [kind, setKind] = useState<ReplacementKind>("full");
  const [minutes, setMinutes] = useState<number>(50); // 50 = consulta completa, 10 = parcial inicial
  const [scheduledAt, setScheduledAt] = useState<string>(
    nextRoundedTime(10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // reset sempre que abrir / mudar patientId
  useEffect(() => {
    if (!open) return;
    setSelectedPatientId(patientId ?? "");
    setKind("full");
    setMinutes(50);
    setScheduledAt(nextRoundedTime(10));
    setIsSubmitting(false);
    setErrorMsg(null);
  }, [open, patientId]);

  const scheduledDate = useMemo(() => {
    const d = new Date(scheduledAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString();
  }, [scheduledAt]);

  const effectivePatientId = patientId ?? selectedPatientId;

  if (!open) return null;

  const canSave =
    !!effectivePatientId &&
    !!scheduledDate &&
    minutes > 0 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const status = minutes >= 50 ? "done" : "in_progress";

      const payload = {
        patient_id: effectivePatientId,
        kind,
        minutes,
        scheduled_for: scheduledDate,
        status,
        // defaultListId é só pro front; não existe coluna list_id no banco
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

      onCreated?.(data);
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

  // nome do paciente quando já está fixo (caso do PatientDetailsModal)
  const fixedPatientName =
    patientId && patients && patients.length === 1
      ? patients[0].name
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* MODAL ESCURO, OPACO */}
      <div className="w-full max-w-3xl rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-semibold">Nova reposição</h2>
            <p className="mt-1 text-sm text-slate-400">
              Crie uma reposição completa ou parcial para um paciente.
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

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Paciente */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Paciente
            </label>

            {patientId && fixedPatientName ? (
              <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm">
                {fixedPatientName}
              </div>
            ) : (
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">Selecione um paciente...</option>
                {patients?.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}

            {!patientId && (
              <p className="mt-1 text-xs text-slate-500">
                O card será criado na coluna selecionada e vinculado a esse
                paciente.
              </p>
            )}
          </div>

          {/* Tipo / minutos */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Tipo de reposição
            </label>

            <div className="flex flex-wrap gap-3">
              {/* Consulta completa (50 min) */}
              <button
                type="button"
                onClick={() => {
                  setKind("full");
                  setMinutes(50);
                }}
                className={
                  "rounded-lg border px-4 py-2 text-sm " +
                  (kind === "full"
                    ? "border-sky-500 bg-sky-600/20 text-sky-200"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700")
                }
              >
                Consulta completa (50 min)
              </button>

              {/* Consulta parcial: começa com 10 min, o resto soma no detalhe */}
              <button
                type="button"
                onClick={() => {
                  setKind("partial");
                  setMinutes(10);
                }}
                className={
                  "rounded-lg border px-4 py-2 text-sm " +
                  (kind === "partial"
                    ? "border-sky-500 bg-sky-600/20 text-sky-200"
                    : "border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700")
                }
              >
                Consulta parcial (10 min)
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Para parciais, será registrada a primeira fração de 10 minutos;
              você poderá adicionar mais depois.
            </p>
          </div>

          {/* Data/Hora */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-200">
              Data e horário
            </label>
            <input
              type="datetime-local"
              value={new Date(scheduledAt).toISOString().slice(0, 16)}
              onChange={(e) => {
                const localValue = e.target.value; // "2025-11-13T18:30"
                const d = new Date(localValue);
                setScheduledAt(d.toISOString());
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
              required
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
              {isSubmitting ? "Salvando..." : "Criar reposição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
