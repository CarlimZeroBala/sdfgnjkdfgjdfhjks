import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useState } from "react";
import { useBoard, Patient } from "../store/board";
import AddPatientModal from "./AddPatientModal";
import PatientDetailsModal from "./PatientDetailsModal";

function formatLocal(dtISO?: string) {
  if (!dtISO) return null;
  const d = new Date(dtISO);
  const dia = d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return `${dia} • ${hora}`;
}

function ProgressBadge({ p }: { p: Patient }) {
  const getPending = useBoard((s) => s.getPendingMinutes);
  const pending = getPending(p);
  const done = 50 - pending;
  return (
    <span className="ml-auto text-xs rounded px-2 py-0.5 bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">
      {done}/50 min
    </span>
  );
}

function PatientCard({ p, onOpen }: { p: Patient; onOpen: () => void }) {
  const getPending = useBoard((s) => s.getPendingMinutes);
  const pending = getPending(p);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id });

  const style = { transform: CSS.Transform.toString(transform), transition } as React.CSSProperties;

  const firstRep = p.replacements?.[0];
  const when = formatLocal(firstRep?.scheduledAt || firstRep?.completedFractions[0]?.at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card w-full text-left p-2 cursor-default dark:bg-tdark-card
                  transition-shadow duration-150 ${isDragging ? "dnd-dragging" : "hover:shadow-md"}`}
      onClick={() => {
        if (!isDragging) onOpen();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start gap-2">
        {/* Alça de arrasto (listeners/attributes aqui) */}
        <div
          className="mt-0.5 flex h-5 w-5 items-center justify-center rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Arrastar card"
          title="Arrastar card"
        >
          {/* ícone “grip” simples */}
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
            <div className="font-semibold text-trello-text dark:text-tdark-text">{p.name}</div>
            <ProgressBadge p={p} />
          </div>
          {p.contact && (
            <div className="text-sm text-trello-muted dark:text-tdark-muted">{p.contact}</div>
          )}
          {when && (
            <div className="text-xs mt-1 text-sky-700 dark:text-sky-300">Agendado: {when}</div>
          )}
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pendentes: {pending} min</div>
        </div>
      </div>
    </div>
  );
}

export default function List({
  id,
  title,
  patients,
  isOver = false,
}: {
  id: number;
  title: string;
  patients: Patient[];
  isOver?: boolean;
}) {
  const { setNodeRef, isOver: overFromHook } = useDroppable({ id });
  const items = useMemo(() => patients.map((p) => p.id), [patients]);

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const highlight = isOver || overFromHook;
  const canCreateHere = id === 1; // só na coluna "Reposições Pendentes"

  return (
    <>
      <div className="w-[272px] mr-1.5 flex-shrink-0">
        <div
          className={`rounded-xl max-h-[calc(100vh-56px-32px)] flex flex-col transition-colors
                      bg-trello-list dark:bg-tdark-list shadow-card
                      ${highlight ? "dnd-over" : ""}`}
        >
          <div className="px-3 pt-2 pb-1 font-semibold text-trello-text dark:text-tdark-text">
            {title} ({patients.length})
          </div>

          <div ref={setNodeRef} className="px-2 pb-2 overflow-y-auto space-y-2">
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
              <div className="mt-2 rounded-md border-2 border-dashed border-sky-400/60 bg-sky-50/40 dark:bg-white/5 h-10 animate-pulse" />
            )}
          </div>

          <div className="p-2 mt-auto">
            {canCreateHere && (
              <button
                onClick={() => setOpenCreate(true)}
                className="w-full border border-dashed border-slate-300 dark:border-slate-600
                           rounded-lg py-2 text-left px-3 text-trello-text dark:text-tdark-text text-sm
                           hover:bg-black/5 dark:hover:bg-white/5"
              >
                Novo paciente
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <AddPatientModal open={openCreate} onClose={() => setOpenCreate(false)} defaultListId={id} />
      <PatientDetailsModal
        open={openDetails}
        onClose={() => setOpenDetails(false)}
        patient={selected}
      />
    </>
  );
}
