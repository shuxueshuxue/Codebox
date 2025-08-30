import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'

type Node = {
  id: string
  label: string
  group?: number
  fileType?: 'js' | 'ts' | 'py' | 'go' | 'css' | 'html'
}

type Link = {
  source: string
  target: string
  value?: number
}

type GraphData = {
  nodes: Node[]
  links: Link[]
}

type Props = {
  data: GraphData
  width?: number
  height?: number
  onNodeClick?: (node: Node) => void
  onClose?: () => void
}

export default function DependencyGraph({ data, width = 800, height = 600, onNodeClick, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const radius = Math.min(width, height) * 0.3
    const centerX = width / 2
    const centerY = height / 2

    // @@@ Circular layout - arrange nodes in a circle, with center node at center
    const peripheralNodes = data.nodes.filter(n => n.group !== 1)
    const centerNode = data.nodes.find(n => n.group === 1) || data.nodes[0]
    
    const angleStep = (2 * Math.PI) / peripheralNodes.length
    const nodes = [
      { ...centerNode, x: centerX, y: centerY, fx: centerX, fy: centerY }
    ]
    
    peripheralNodes.forEach((node, i) => {
      const angle = i * angleStep - Math.PI / 2
      nodes.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        fx: centerX + radius * Math.cos(angle),
        fy: centerY + radius * Math.sin(angle)
      })
    })

    const links = data.links.map(link => ({
      ...link,
      source: nodes.find(n => n.id === link.source),
      target: nodes.find(n => n.id === link.target)
    }))

    // Create defs for filters and gradients
    const defs = svg.append('defs')
    
    // Add glow filter for center node
    const filter = defs.append('filter')
      .attr('id', 'glow')
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%')

    filter.append('feGaussianBlur')
      .attr('stdDeviation', '4')
      .attr('result', 'coloredBlur')

    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Create container groups
    const g = svg.append('g')

    // Draw background circles
    g.append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius + 60)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(100, 200, 200, 0.15)')
      .attr('stroke-width', 2)

    // Draw grid circles
    ;[0.33, 0.66, 1].forEach(factor => {
      g.append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', radius * factor)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(100, 200, 200, 0.1)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,5')
    })

    // Draw straight links from center to peripheral nodes
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'link')
      .attr('x1', (d: any) => d.source ? d.source.x : centerX)
      .attr('y1', (d: any) => d.source ? d.source.y : centerY)
      .attr('x2', (d: any) => d.target ? d.target.x : centerX)
      .attr('y2', (d: any) => d.target ? d.target.y : centerY)
      .attr('stroke', 'rgba(100, 200, 200, 0.4)')
      .attr('stroke-width', 2)

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .enter().append('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        setSelectedNode(d.id)
        if (onNodeClick) onNodeClick(d)
      })
      .on('mouseenter', function(event, d) {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .attr('fill', d.group === 1 ? 'rgba(100, 200, 200, 0.9)' : 'rgba(100, 200, 200, 0.5)')
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).select('rect')
          .transition()
          .duration(200)
          .attr('fill', d.group === 1 ? 'rgba(100, 200, 200, 0.7)' : 'rgba(100, 200, 200, 0.3)')
      })

    // Node backgrounds (glassmorphic rectangles)
    node.append('rect')
      .attr('x', -45)
      .attr('y', -25)
      .attr('width', 90)
      .attr('height', 50)
      .attr('rx', 8)
      .attr('fill', d => d.group === 1 ? 'rgba(100, 200, 200, 0.7)' : 'rgba(100, 200, 200, 0.3)')
      .attr('stroke', 'rgba(100, 200, 200, 0.6)')
      .attr('stroke-width', d => d.group === 1 ? 2 : 1)
      .attr('filter', d => d.group === 1 ? 'url(#glow)' : 'none')

    // Add file icon
    node.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', '20px')
      .text('📄')

    // Node labels
    node.append('text')
      .text(d => d.label)
      .attr('text-anchor', 'middle')
      .attr('y', 12)
      .attr('fill', 'white')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace')
      .style('pointer-events', 'none')
      .style('user-select', 'none')

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom as any)

    // Animate entrance
    node.style('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 50)
      .style('opacity', 1)

    link.style('opacity', 0)
      .transition()
      .duration(800)
      .delay(300)
      .style('opacity', 1)

  }, [data, width, height, selectedNode, onNodeClick])

  return (
    <div className="dependency-graph-container" style={{
      background: 'rgba(30, 30, 40, 0.85)',
      backdropFilter: 'blur(20px)',
      borderRadius: '20px',
      border: '1px solid rgba(100, 200, 200, 0.2)',
      boxShadow: '0 0 50px rgba(100, 200, 200, 0.15)'
    }}>
      <svg ref={svgRef} width={width} height={height} style={{
        background: 'transparent'
      }} />
      <button 
        className="close-btn" 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          border: '1px solid rgba(100, 200, 200, 0.3)',
          background: 'rgba(100, 200, 200, 0.1)',
          color: 'rgba(100, 200, 200, 0.8)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      {selectedNode && (
        <div className="node-info" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(100, 200, 200, 0.1)',
          border: '1px solid rgba(100, 200, 200, 0.3)',
          padding: '8px 16px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {data.nodes.find(n => n.id === selectedNode)?.label}
        </div>
      )}
    </div>
  )
}