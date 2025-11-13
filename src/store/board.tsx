import { create } from "zustand";

export type Fraction = { id: string; at: string; duration: number }; // 10 min nas parciais
export type Replacement = {
  id: string;
  scheduledAt?: string;
  totalDuration: number;          // sempre 50
  completedFractions: Fraction[]; // soma até 50
  closed?: boolean;               // sessão encerrada
};
export type Patient = {
  id: string;
  name: string;
  contact?: string;
  mainProfessional?: string;
  replacements: Replacement[];
};
export type List = { id: number; title: string; patients: Patient[] };
export type Board = { year: number; lists: List[] };

const uid = () => crypto.randomUUID();

type Catalog = {
  patients: { id: string; name: string; contact: string }[];
  professionals: { id: string; name: string; specialty: string }[];
};

type State = {
  board: Board;
  filter: string;
  catalog: Catalog;

  setFilter: (q: string) => void;

  addPatientByIds: (args: {
    listId: number;
    professionalId: string;
    patientId: string;
    mode: "full" | "partial";
    partialAt?: string; // obrigatório quando mode = partial
  }) => void;

  addPartial10: (patientId: string, atISO: string) => void;
  completeFull50: (patientId: string, atISO?: string) => void;

  movePatient: (patientId: string, toListId: number, toIndex: number) => void;

  getActiveReplacement: (p: Patient) => Replacement | null;
  getPendingMinutes: (p: Patient) => number;
  getFractions: (p: Patient) => Fraction[];
};

export const useBoard = create<State>((set, get) => ({
  board: {
    year: new Date().getFullYear(),
    lists: [
      { id: 1, title: "Reposições Pendentes", patients: [] },
      { id: 2, title: "Sem Pendências", patients: [] },
    ],
  },
  filter: "",
  catalog: {
    patients: [
      { id: "p1", name: "Ana Souza", contact: "ana@exemplo.com" },
      { id: "p2", name: "Bruno Lima", contact: "(11) 99999-0000" },
      { id: "p3", name: "Carla Mendes", contact: "carla@exemplo.com" },
      { id: "p4", name: "Carlos", contact: "3" },
    ],
    professionals: [
      { id: "r1", name: "Mariana", specialty: "Fono" },
      { id: "r2", name: "Pedro", specialty: "TO" },
      { id: "r3", name: "Luiza", specialty: "Psico" },
    ],
  },

  setFilter: (q) => set({ filter: q }),

  addPatientByIds: ({ listId, professionalId, patientId, mode, partialAt }) =>
    set((state) => {
      const { catalog, board } = state;
      const patientInfo = catalog.patients.find((p) => p.id === patientId);
      const profInfo = catalog.professionals.find((r) => r.id === professionalId);
      if (!patientInfo || !profInfo) return state;

      // base da reposição
      const base: Replacement = {
        id: uid(),
        totalDuration: 50,
        completedFractions: [],
        closed: false,
      };

      if (mode === "full") {
        // conclui toda a sessão imediatamente (50 min)
        base.completedFractions.push({
          id: uid(),
          at: new Date().toISOString(),
          duration: 50,
        });
        base.closed = true;
      } else {
        // parcial: exige partialAt e registra primeira fração de 10 min
        if (!partialAt) return state;
        base.completedFractions.push({
          id: uid(),
          at: partialAt,
          duration: 10,
        });
      }

      const lists = board.lists.map((l) =>
        l.id === listId
          ? {
              ...l,
              patients: [
                ...l.patients,
                {
                  id: uid(),
                  name: patientInfo.name,
                  contact: patientInfo.contact,
                  mainProfessional: profInfo.name,
                  replacements: [base],
                },
              ],
            }
          : l
      );

      return { board: { ...board, lists } };
    }),

  getActiveReplacement: (p) => {
    if (!p.replacements?.length) return null;
    const last = p.replacements[p.replacements.length - 1];
    if (last.closed) return null;
    return last;
  },

  getFractions: (p) => get().getActiveReplacement(p)?.completedFractions ?? [],

  getPendingMinutes: (p) => {
    const r = get().getActiveReplacement(p);
    if (!r) return 0;
    const done = r.completedFractions.reduce((s, f) => s + f.duration, 0);
    return Math.max(0, r.totalDuration - done);
  },

  addPartial10: (patientId, atISO) =>
    set((state) => {
      if (!atISO) return state;
      const b: Board = structuredClone(state.board);
      for (const list of b.lists) {
        const p = list.patients.find((pp) => pp.id === patientId);
        if (!p) continue;

        const r = get().getActiveReplacement(p);
        if (!r) break;

        const done = r.completedFractions.reduce((s, f) => s + f.duration, 0);
        const remaining = Math.max(0, r.totalDuration - done);
        if (remaining === 0) break;

        const add = Math.min(10, remaining);
        r.completedFractions.push({ id: uid(), at: atISO, duration: add });

        if (done + add >= r.totalDuration) r.closed = true;
        break;
      }
      return { board: b };
    }),

  completeFull50: (patientId, atISO) =>
    set((state) => {
      const b: Board = structuredClone(state.board);
      for (const list of b.lists) {
        const p = list.patients.find((pp) => pp.id === patientId);
        if (!p) continue;

        const r = get().getActiveReplacement(p);
        if (!r) break;

        // bloqueia se já houver qualquer parcial
        if (r.completedFractions.length > 0) break;

        const remaining = 50;
        r.completedFractions.push({
          id: uid(),
          at: atISO ?? new Date().toISOString(),
          duration: remaining,
        });
        r.closed = true;
        break;
      }
      return { board: b };
    }),

  movePatient: (patientId, toListId, toIndex) =>
    set((state) => {
      const b: Board = structuredClone(state.board);
      const fromList = b.lists.find((l) => l.patients.some((p) => p.id === patientId));
      if (!fromList) return { board: b };
      const i = fromList.patients.findIndex((p) => p.id === patientId);
      const patient = fromList.patients.splice(i, 1)[0];
      const toList = b.lists.find((l) => l.id === toListId);
      if (!toList || !patient) return { board: b };
      toList.patients.splice(toIndex, 0, patient);
      return { board: b };
    }),
}));
