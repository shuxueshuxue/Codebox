import { useEffect, useState } from 'react'
import DependencyGraph from './DependencyGraph'
import type { PrismItem } from '../hexscene/types'

type Props = {
  open: boolean
  prismItem?: PrismItem | null
  onClose: () => void
}

// @@@ Mock data generator - creates sample dependency graph
function generateMockDependencies(functionName: string) {
  const functions = [
    'authenticate', 'validateInput', 'fetchData', 'processResult',
    'updateCache', 'logEvent', 'sendNotification', 'handleError',
    'transformData', 'saveToDatabase', 'generateReport', 'cleanupTemp'
  ]
  
  const numNodes = Math.floor(Math.random() * 4) + 5
  const selectedFunctions = [functionName]
  
  while (selectedFunctions.length < numNodes) {
    const func = functions[Math.floor(Math.random() * functions.length)]
    if (!selectedFunctions.includes(func)) {
      selectedFunctions.push(func)
    }
  }
  
  const nodes = selectedFunctions.map((func, i) => ({
    id: `node-${i}`,
    label: func,
    group: func === functionName ? 1 : 0
  }))
  
  const links = []
  const numLinks = Math.floor(Math.random() * 5) + 3
  for (let i = 0; i < numLinks; i++) {
    const source = Math.floor(Math.random() * nodes.length)
    let target = Math.floor(Math.random() * nodes.length)
    while (target === source) {
      target = Math.floor(Math.random() * nodes.length)
    }
    links.push({
      source: nodes[source].id,
      target: nodes[target].id,
      value: Math.random()
    })
  }
  
  return { nodes, links }
}

export default function GraphModal({ open, prismItem, onClose }: Props) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })

  useEffect(() => {
    if (open && prismItem?.functionName) {
      const data = generateMockDependencies(prismItem.functionName)
      setGraphData(data)
    }
  }, [open, prismItem])

  if (!open) return null

  return (
    <div className="graph-modal-backdrop" onClick={onClose}>
      <div className="graph-modal" onClick={(e) => e.stopPropagation()}>
        <DependencyGraph
          data={graphData}
          width={800}
          height={600}
          onClose={onClose}
          onNodeClick={(node) => {
            console.log('Node clicked:', node)
          }}
        />
      </div>
    </div>
  )
}