import './App.css'
import HexScene from './HexScene'
import FeatureDialog from './components/FeatureDialog'
import CircularDependencyGraph from './components/CircularDependencyGraph'
import './components/circular-graph.css'
import { useState, useCallback } from 'react'
import FileTree from './components/FileTree'
import type { PrismItem } from './hexscene/types'

function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaults, setDialogDefaults] = useState<{ name?: string; desc?: string } | undefined>(undefined)
  const [pendingHexKey, setPendingHexKey] = useState<string | null>(null)
  const [selectedPrism, setSelectedPrism] = useState<PrismItem | null>(null)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined)

  const openDialog = useCallback((hexKey: string, defaults?: { name?: string; desc?: string }) => {
    setPendingHexKey(hexKey)
    setDialogDefaults(defaults)
    setDialogOpen(true)
  }, [])

  const handlePrismClick = useCallback((item: PrismItem, event: MouseEvent) => {
    setSelectedPrism(item)
    setClickPosition({ x: event.clientX, y: event.clientY })
  }, [])


  return (
    <div className="app-root">
      <HexScene onRequestFeature={openDialog} onActivatedPrismClick={handlePrismClick} />
      <div className="sidebar">
        <div className="sidebar-title">EXPLORER</div>
        <div className="tree-container">
          <FileTree />
        </div>
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
      />
    </div>
  )
}

export default App
