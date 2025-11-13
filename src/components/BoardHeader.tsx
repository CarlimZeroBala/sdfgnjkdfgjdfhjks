
import { LogOut, Search, KanbanSquare, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBoard } from "../store/board";

function useTheme(){
  const [theme, setTheme] = useState<'light'|'dark'>(() => {
    const saved = localStorage.getItem('theme') as 'light'|'dark' | null
    if (saved) return saved
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    return prefersDark ? 'dark' : 'light'
  })
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  return { theme, setTheme }
}

export default function BoardHeader({ onLogout }: { onLogout: () => void }){
  const year = useBoard(s => s.board.year)
  const setFilter = useBoard(s => s.setFilter)
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-20 bg-[var(--trello-header)] text-white shadow">
      <div className="mx-auto max-w-[1400px] px-3 h-14 grid grid-cols-[1fr_minmax(280px,600px)_1fr] items-center gap-2">
        <div className="flex items-center gap-2">
          <KanbanSquare size={20}/>
          <span className="font-semibold">Gestor de Reposições</span>
          <span className="ml-2 bg-white/20 rounded px-2 py-1">{year}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-80" size={18}/>
          <input
            type="search"
            placeholder="Buscar paciente, contato ou profissional..."
            onChange={e => setFilter(e.target.value)}
            className="w-full h-9 pl-10 pr-3 rounded bg-white/25 placeholder-white/80 text-white outline-none focus:ring ring-white/40"
          />
        </div>
        <div className="flex justify-end items-center gap-2">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="border border-white/60 text-white hover:bg-white/15 rounded px-3 py-1.5 flex items-center gap-2"
            aria-label="Alternar tema"
            title="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={16}/> : <Moon size={16}/>}
            <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
          </button>
          <button onClick={onLogout} className="border border-white/60 text-white hover:bg-white/15 rounded px-3 py-1.5 flex items-center gap-2">
            <LogOut size={16}/> Sair
          </button>
        </div>
      </div>
    </header>
  )
}
