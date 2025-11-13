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
import { useMemo, useState } from "react";
import { useBoard } from "../store/board";
import List from "../components/List";
import BoardHeader from "../components/BoardHeader";

export default function Board({ onLogout }: { onLogout: () => void }) {
  const board = useBoard((s) => s.board);
  const filter = useBoard((s) => s.filter);
  const movePatient = useBoard((s) => s.movePatient);

  // Sensores: evita drag em cliques rápidos e exige pequeno movimento/atraso
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 6 }, // precisa mover 6px
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 120, tolerance: 5 }, // 120ms de toque
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // Estado para overlay e realce de lista alvo
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overListId, setOverListId] = useState<number | null>(null);

  const activePatient = useMemo(() => {
    if (!activeId) return null;
    for (const l of board.lists) {
      const p = l.patients.find((x) => x.id === activeId);
      if (p) return p;
    }
    return null;
  }, [activeId, board.lists]);

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const toListId = Number(e.over?.id || NaN);
    setOverListId(Number.isFinite(toListId) ? toListId : null);
  }

  function onDragEnd(e: DragEndEvent) {
    const patientId = String(e.active.id);
    const toListId = Number(e.over?.id);
    setActiveId(null);
    setOverListId(null);
    if (!toListId || !patientId) return;
    // aqui mantemos a inserção no topo (índice 0). Ajuste se quiser reorder fino
    movePatient(patientId, toListId, 0);
  }

  return (
    <div className="h-full flex flex-col bg-[radial-gradient(800px_400px_at_20%_10%,rgba(9,30,66,.06),transparent),#E4F0F6] dark:bg-tdark-page">
      <BoardHeader onLogout={onLogout} />
      <main className="flex-1 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex items-start gap-3">
            {board.lists.map((list) => (
              <List
                key={list.id}
                id={list.id}
                title={list.title}
                isOver={overListId === list.id}
                patients={list.patients.filter((p) => {
                  const q = filter.toLowerCase();
                  return [p.name, p.contact, p.mainProfessional].some((v) =>
                    (v || "").toLowerCase().includes(q)
                  );
                })}
              />
            ))}
          </div>

          {/* Item fantasma durante o arrasto */}
          <DragOverlay dropAnimation={{ duration: 180 }}>
            {activePatient ? (
              <div className="card p-2 shadow-lg scale-[1.02] opacity-95 dark:bg-tdark-card">
                <div className="font-semibold text-trello-text dark:text-tdark-text">
                  {activePatient.name}
                </div>
                {activePatient.contact && (
                  <div className="text-sm text-trello-muted dark:text-tdark-muted">
                    {activePatient.contact}
                  </div>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </div>
  );
}
