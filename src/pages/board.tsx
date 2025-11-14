import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";

import { useBoard } from "../store/board";
import List from "../components/List";
import BoardHeader from "../components/BoardHeader";
import { supabase } from "../services/supabaseClient";
import AddPatientModal from "../components/AddPatientModal";
import AddReplacementModal from "../components/AddReplacementModal";

export default function Board({ onLogout }: { onLogout?: () => void }) {
  const board = useBoard((s) => s.board);
  const movePatient = useBoard((s) => s.movePatient);
  const addPatient = useBoard((s) => s.addPatient);
  const addReplacementFromDb = useBoard((s) => s.addReplacementFromDb);

  // todos os pacientes (para o select do modal de reposição geral)
  const allPatients = useBoard((s) =>
    s.board.lists.flatMap((l) => l.patients)
  );

  /* Sensores do DnD */
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 120, tolerance: 5 },
  });

  const sensors = useSensors(pointerSensor, touchSensor);

  /* Estado do drag overlay */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overListId, setOverListId] = useState<number | null>(null);

  /* Modais */
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [replacementListId, setReplacementListId] = useState<number | null>(
    null
  );

  /* Carregamento inicial do Supabase */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        // 1) Pacientes
        const { data: patientsRows, error: pErr } = await supabase
          .from("patients")
          .select("*");

        if (pErr) {
          console.error("Erro ao carregar pacientes do Supabase:", pErr);
          throw pErr;
        }

        patientsRows?.forEach((row: any) => {
          if (cancelled) return;

          addPatient({
            id: row.id,
            name: row.name,
            contact: row.phone ?? undefined, // phone -> contact no front
            mainProfessional: undefined, // ainda não temos no banco
            listId: undefined, // não existe list_id no schema
          });
        });

        // 2) Reposições
        const { data: replRows, error: rErr } = await supabase
          .from("replacements")
          .select("*");

        if (rErr) {
          console.error("Erro ao carregar reposições do Supabase:", rErr);
          throw rErr;
        }

        replRows?.forEach((row: any) => {
          if (cancelled) return;

          addReplacementFromDb({
            id: row.id,
            patient_id: row.patient_id,
            kind: row.kind ?? null,
            minutes: row.minutes ?? null,
            scheduled_for: row.scheduled_for ?? null,
            status: row.status ?? null,
            list_id: null,
          } as any);
        });
      } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [addPatient, addReplacementFromDb]);

  /* Overlay do paciente sendo arrastado */
  const activePatient = useMemo(() => {
    if (!activeId) return null;

    for (const list of board.lists) {
      const patient = list.patients.find((p) => p.id === activeId);
      if (patient) return patient;
    }

    return null;
  }, [activeId, board.lists]);

  /* Drag handlers */
  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const over = e.over;
    if (!over) {
      setOverListId(null);
      return;
    }

    let listId: number | null = null;

    if (typeof over.id === "number") {
      listId = over.id;
    } else {
      const maybeList = board.lists.find((l) =>
        l.patients.some((p) => p.id === over.id)
      );
      if (maybeList) listId = maybeList.id;
    }

    setOverListId(listId);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;

    setActiveId(null);
    setOverListId(null);

    if (!over) return;

    const patientId = String(active.id);

    let toListId: number | null = null;
    let toIndex = 0;

    if (typeof over.id === "number") {
      toListId = over.id;
      const list = board.lists.find((l) => l.id === toListId);
      toIndex = list ? list.patients.length : 0;
    } else {
      const list = board.lists.find((l) =>
        l.patients.some((p) => p.id === over.id)
      );
      if (list) {
        toListId = list.id;
        const idx = list.patients.findIndex((p) => p.id === over.id);
        toIndex = idx >= 0 ? idx : list.patients.length;
      }
    }

    if (!toListId) return;

    // só atualiza o estado local do board (não temos list_id no banco)
    movePatient(patientId, toListId, toIndex);
  }

  return (
    <div className="min-h-screen bg-trello-bg text-trello-text dark:bg-tdark-bg dark:text-tdark-text">
      {/* Header ocupa toda a largura e chama o modal de novo paciente */}
      <BoardHeader
        onLogout={onLogout || (() => {})}
        onNewPatient={() => setIsPatientModalOpen(true)}
      />

      <main className="px-4 pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pt-4">
            {board.lists.map((list) => (
              <List
                key={list.id}
                id={list.id}
                title={list.title}
                patients={list.patients}
                isOver={overListId === list.id}
                onNewReplacement={(listId) => setReplacementListId(listId)}
              />
            ))}
          </div>

          {/* Overlay de arrasto */}
          <DragOverlay>
            {activePatient ? (
              <div className="w-80 rounded-xl border border-trello-border bg-white p-4 shadow-lg dark:border-tdark-border dark:bg-tdark-card">
                <div className="mb-1 font-semibold text-trello-text dark:text-tdark-text">
                  {activePatient.name}
                </div>

                {activePatient.mainProfessional && (
                  <div className="mb-1 text-xs text-trello-muted dark:text-tdark-muted">
                    {activePatient.mainProfessional}
                  </div>
                )}

                {activePatient.contact && (
                  <div className="text-xs text-trello-muted dark:text-tdark-muted">
                    {activePatient.contact}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Modal: Novo paciente (controlado pelo Board) */}
      <AddPatientModal
        open={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onCreated={(row) => {
          addPatient({
            id: row.id,
            name: row.name,
            contact: row.phone ?? undefined,
            mainProfessional: undefined,
            listId: undefined,
          });
        }}
      />

      {/* Modal: Nova reposição (geral, por coluna) */}
      <AddReplacementModal
        open={replacementListId !== null}
        onClose={() => setReplacementListId(null)}
        defaultListId={replacementListId ?? undefined}
        patients={allPatients}
        onCreated={(row) => {
          addReplacementFromDb(row);
        }}
      />
    </div>
  );
}
