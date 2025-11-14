import { useDroppable } from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useBoard, Patient } from "../store/board";

import PatientDetailsModal from "./PatientDetailsModal";

/* ------------------------- Helpers ------------------------- */
function formatLocal(dtISO?: string) {
  if (!dtISO) return null;
  const d = new Date(dtISO);
  const dia = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dia} • ${hora}`;
}

function ProgressBadge({ p }: { p: Patient }) {
  const getPending = useBoard((s) => s.getPendingMinutes);
  const pending = getPending(p);
  const done = 50 - pending;

  return (
    <span className="ml-auto rounded px-2 py-0.5 text-xs bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
      {done}/50 min
    </span>
  );
}

/* ---------------------- Card do Paciente -------------------- */
function PatientCard({ p, onOpen }: { p: Patient; onOpen: () => void }) {
  const getPending = useBoard((s) => s.getPendingMinutes);
  const pending = getPending(p);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: p.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  const r = p.replacements?.[0];
  const firstDate =
    r?.scheduledAt || r?.completedFractions?.[0]?.at || undefined;

  const when = firstDate ? formatLocal(firstDate) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card w-full cursor-default p-2 text-left dark:bg-tdark-card
        transition-shadow duration-150 ${
          isDragging ? "dnd-dragging" : "hover:shadow-md"
        }`}
      onClick={() => {
        if (!isDragging) onOpen();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {/* Handle de arrasto */}
        <div
          className="mt-0.5 flex h-5 w-5 cursor-grab items-center justify-center rounded hover:bg-black/5 active:cursor-grabbing dark:hover:bg-white/10"
          {...attributes}
          {...listeners}
          aria-label="Arrastar card"
          title="Arrastar card"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-60">
            <circle cx="2" cy="2" r="1.3" />
            <circle cx="6" cy="2" r="1.3" />
            <circle cx="10" cy="2" r="1.3" />
            <circle cx="2" cy="6" r="1.3" />
            <circle cx="6" cy="6" r="1.3" />
            <circle cx="10" cy="6" r="1.3" />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-semibold text-trello-text dark:text-tdark-text">
              {p.name}
            </div>
            <ProgressBadge p={p} />
          </div>

          {p.contact && (
            <div className="text-sm text-trello-muted dark:text-tdark-muted">
              {p.contact}
            </div>
          )}

          {when && (
            <div className="mt-1 text-xs text-sky-700 dark:text-sky-300">
              Agendada: {when}
            </div>
          )}

          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Pendentes: {pending} min
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- LISTA -------------------------- */
type ListProps = {
  id: number;
  title: string;
  patients: Patient[];
  isOver?: boolean;
  onNewReplacement: (listId: number) => void;
};

export default function List({
  id,
  title,
  patients,
  isOver = false,
  onNewReplacement,
}: ListProps) {
  const { setNodeRef, isOver: overFromHook } = useDroppable({ id });

  const items = useMemo(() => patients.map((p) => p.id), [patients]);

  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const highlight = isOver || overFromHook;

  return (
    <>
      <div className="mr-1.5 w-[272px] flex-shrink-0">
        <div
          className={`flex max-h-[calc(100vh-56px-32px)] flex-col rounded-xl bg-trello-list shadow-card transition-colors dark:bg-tdark-list ${
            highlight ? "dnd-over" : ""
          }`}
        >
          {/* HEADER */}
          <div className="px-3 pt-2 pb-1 font-semibold text-trello-text dark:text-tdark-text">
            {title} ({patients.length})
          </div>

          {/* LISTA DOS CARDS */}
          <div
            ref={setNodeRef}
            className="space-y-2 overflow-y-auto px-2 pb-2"
          >
            <SortableContext items={items} strategy={verticalListSortingStrategy}>
              {patients.map((p) => (
                <PatientCard
                  key={p.id}
                  p={p}
                  onOpen={() => {
                    setSelected(p);
                    setOpenDetails(true);
                  }}
                />
              ))}
            </SortableContext>

            {highlight && (
              <div className="mt-2 h-10 rounded-md border-2 border-dashed border-sky-400/60 bg-sky-50/40 animate-pulse dark:bg-white/5" />
            )}

            {/* Botão de NOVA REPOSIÇÃO no layout antigo (estilo card) */}
            <button
              type="button"
              onClick={() => onNewReplacement(id)}
              className="mt-2 w-full rounded-xl border border-dashed border-slate-400/70 bg-transparent px-3 py-2 text-sm font-medium text-slate-100 text-left hover:bg-slate-800/50 dark:border-slate-500"
            >
              Nova reposição
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALHES DO PACIENTE */}
      <PatientDetailsModal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        patient={selected}
      />
    </>
  );
}
