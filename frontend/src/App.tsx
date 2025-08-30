import './App.css'
import HexScene from './HexScene'
import FeatureDialog from './components/FeatureDialog'
import { useState, useCallback } from 'react'
import FileTree from './components/FileTree'

function App() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogDefaults, setDialogDefaults] = useState<{ name?: string; desc?: string } | undefined>(undefined)
  const [pendingHexKey, setPendingHexKey] = useState<string | null>(null)

  const openDialog = useCallback((hexKey: string, defaults?: { name?: string; desc?: string }) => {
    setPendingHexKey(hexKey)
    setDialogDefaults(defaults)
    setDialogOpen(true)
  }, [])

  return (
    <div className="app-root">
      <HexScene onRequestFeature={openDialog} />
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
    </div>
  )
}

export default App
