import './App.css'
import HexScene from './HexScene'
import FeatureDialog from './components/FeatureDialog'
import CircularDependencyGraph from './components/CircularDependencyGraph'
import './components/circular-graph.css'
import { useState, useCallback, useMemo } from 'react'
import FileTree from './components/FileTree'
import type { PrismItem } from './hexscene/types'
import AgentPanel from './components/AgentPanel'
import type { Agent } from './types/agent'
import { makeFakeAgents } from './types/agent'

function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaults, setDialogDefaults] = useState<{ name?: string; desc?: string } | undefined>(undefined)
  const [pendingHexKey, setPendingHexKey] = useState<string | null>(null)
  const [selectedPrism, setSelectedPrism] = useState<PrismItem | null>(null)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined)
  const [agents, setAgents] = useState<Agent[]>(() => makeFakeAgents())
  // 任务分配：hexKey -> agentId[]
  const [taskAgents, setTaskAgents] = useState<Record<string, string[]>>({})
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [agentsFolded, setAgentsFolded] = useState(false)

  const openDialog = useCallback((hexKey: string, defaults?: { name?: string; desc?: string }) => {
    setPendingHexKey(hexKey)
    setDialogDefaults(defaults)
    setDialogOpen(true)
  }, [])

  const handlePrismClick = useCallback((item: PrismItem, event: MouseEvent) => {
    setSelectedPrism(item)
    setClickPosition({ x: event.clientX, y: event.clientY })
  }, [])

  const assignedIds = useMemo(() => new Set(Object.values(taskAgents).flat()), [taskAgents])

  const handleAssignAgentToTask = useCallback((hexKey: string, agentId: string) => {
    setTaskAgents((prev) => {
      const arr = prev[hexKey] ? [...prev[hexKey]] : []
      if (!arr.includes(agentId)) arr.push(agentId)
      return { ...prev, [hexKey]: arr }
    })
  }, [])

  return (
    <div className="app-root">
      <HexScene
        onRequestFeature={openDialog}
        onActivatedPrismClick={handlePrismClick}
        onAssignAgentToTask={handleAssignAgentToTask}
      />
      <div className={['sidebar', leftCollapsed ? 'collapsed' : ''].filter(Boolean).join(' ')}>
        <div className="sidebar-title">
          <span className="sidebar-title-text">EXPLORER</span>
          <button
            className="collapse-btn"
            title={leftCollapsed ? '展开' : '折叠'}
            onClick={() => setLeftCollapsed((v) => !v)}>
            {leftCollapsed ? '›' : '‹'}
          </button>
        </div>
        <div className="tree-container">
          <FileTree />
        </div>
      </div>
      <div className="rightbar">
        <AgentPanel
          agents={agents}
          onAgentsChange={setAgents}
          assignedAgentIds={assignedIds}
          folded={agentsFolded}
          onToggleFold={() => setAgentsFolded((v) => !v)}
        />
      </div>

      <FeatureDialog
        open={dialogOpen}
        defaultValues={dialogDefaults}
        onCancel={() => setDialogOpen(false)}
        onSubmit={(data) => {
          setDialogOpen(false)
          if (!pendingHexKey) return
          try {
            window.dispatchEvent(
              new CustomEvent('feature:confirm', {
                detail: { hexKey: pendingHexKey, name: data.name, desc: data.desc },
              })
            )
          } catch {}
          setPendingHexKey(null)
        }}
      />

      <CircularDependencyGraph
        prismItem={selectedPrism}
        position={clickPosition}
        onClose={() => setSelectedPrism(null)}
        assignedAgents={selectedPrism ? ((taskAgents[selectedPrism.key] || []).map((id) => agents.find((a) => a.id === id)).filter(Boolean) as any) : []}
      />
    </div>
  )
}

export default App
