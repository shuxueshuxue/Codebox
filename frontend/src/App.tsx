import './App.css'
import './components/inline-graph.css'
import HexScene from './HexScene'
import FeatureDialog from './components/FeatureDialog'
import InlineDependencyGraph from './components/InlineDependencyGraph'
import { useState, useCallback } from 'react'
import FileTree from './components/FileTree'
import type { PrismItem } from './hexscene/types'

function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaults, setDialogDefaults] = useState<{ name?: string; desc?: string } | undefined>(undefined)
  const [pendingHexKey, setPendingHexKey] = useState<string | null>(null)
  const [selectedPrism, setSelectedPrism] = useState<PrismItem | null>(null)

  const openDialog = useCallback((hexKey: string, defaults?: { name?: string; desc?: string }) => {
    setPendingHexKey(hexKey)
    setDialogDefaults(defaults)
    setDialogOpen(true)
  }, [])

  const selectPrism = useCallback((prismItem: PrismItem) => {
    setSelectedPrism(prev => prev?.key === prismItem.key ? null : prismItem)
  }, [])

  return (
    <div className="app-root">
      <HexScene onRequestFeature={openDialog} onActivatedPrismClick={selectPrism} />
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

      <div className="graph-panel">
        <InlineDependencyGraph
          prismItem={selectedPrism}
          onNodeClick={(node) => console.log('Node clicked:', node)}
        />
      </div>
    </div>
  )
}

export default App
