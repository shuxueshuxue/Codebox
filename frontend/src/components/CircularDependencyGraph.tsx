import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import type { PrismItem } from '../hexscene/types'
import type { Agent } from '../types/agent'

interface Props {
  prismItem: PrismItem | null
  position?: { x: number; y: number }
  onClose?: () => void
  assignedAgents?: Agent[]
}

// 不再使用假数据，完全依赖 prismItem.files

export default function CircularDependencyGraph({ prismItem, position, onClose, assignedAgents }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!prismItem || !svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const width = 700
    const height = 700
    const centerX = width / 2
    const centerY = height / 2
    const radius = 220

    svg.attr('width', width).attr('height', height)

    // Create main group
    const g = svg.append('g')

    // @@@ background-circles - Draw concentric circles for depth
    const circles = [radius * 1.4, radius * 1.2, radius, radius * 0.7, radius * 0.4]
    circles.forEach((r, i) => {
      const circle = g
        .append('circle')
        .attr('cx', centerX)
        .attr('cy', centerY)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', `rgba(100, 200, 200, ${0.25 - i * 0.04})`)
        .attr('stroke-width', i === 0 ? 3 : 1.5)
        .attr('stroke-dasharray', i === 0 ? 'none' : '10,5')

      // Add rotation animation for dashed circles
      if (i > 0) {
        circle.style('transform-origin', `${centerX}px ${centerY}px`).style('animation', `rotate ${20 + i * 5}s linear infinite ${i % 2 === 0 ? '' : 'reverse'}`)
      }
    })

    // Add pulsing outer ring
    const pulseRing = g
      .append('circle')
      .attr('cx', centerX)
      .attr('cy', centerY)
      .attr('r', radius * 1.4)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(100, 200, 200, 0.3)')
      .attr('stroke-width', 2)
      .style('transform-origin', `${centerX}px ${centerY}px`)

    // Pulse animation
    pulseRing
      .transition()
      .duration(2000)
      .attr('r', radius * 1.5)
      .attr('stroke-opacity', 0)
      .transition()
      .duration(0)
      .attr('r', radius * 1.4)
      .attr('stroke-opacity', 0.3)
      .on('end', function repeat() {
        d3.select(this)
          .transition()
          .duration(2000)
          .attr('r', radius * 1.5)
          .attr('stroke-opacity', 0)
          .transition()
          .duration(0)
          .attr('r', radius * 1.4)
          .attr('stroke-opacity', 0.3)
          .on('end', repeat)
      })

    // 使用 prismItem.files（若为空则显示空圈）
    const dependencies = (prismItem.files || []).slice()

    // @@@ node-positioning - Calculate positions in circle
    const count = Math.max(0, dependencies.length)
    const angleStep = count > 0 ? (2 * Math.PI) / count : 1
    const nodes = dependencies.map((dep, i) => {
      const angle = i * angleStep - Math.PI / 2
      return {
        name: dep,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    // Add center node
    const centerNode = {
      name: prismItem.functionName || 'main',
      x: centerX,
      y: centerY,
      isCenter: true,
    }

    // Draw connections with gradient
    const linkGradient = svg
      .append('defs')
      .selectAll('linearGradient')
      .data(nodes)
      .enter()
      .append('linearGradient')
      .attr('id', (d, i) => `gradient-${i}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%')

    linkGradient.append('stop').attr('offset', '0%').attr('stop-color', 'rgba(100, 200, 200, 0.8)')

    linkGradient.append('stop').attr('offset', '100%').attr('stop-color', 'rgba(100, 200, 200, 0.2)')

    // Draw connections
    const links = g
      .append('g')
      .selectAll('line')
      .data(nodes)
      .enter()
      .append('line')
      .attr('x1', centerX)
      .attr('y1', centerY)
      .attr('x2', (d) => d.x)
      .attr('y2', (d) => d.y)
      .attr('stroke', (d, i) => `url(#gradient-${i})`)
      .attr('stroke-width', 3)
      .attr('stroke-dasharray', '8, 4')
      .style('animation', 'dash 20s linear infinite')

    // Add some curved connection lines for visual interest
    const curvedLinks = g
      .append('g')
      .selectAll('path')
      .data(nodes.filter((_, i) => i % 2 === 0))
      .enter()
      .append('path')
      .attr('d', (d) => {
        const midX = (centerX + d.x) / 2
        const midY = (centerY + d.y) / 2
        const offset = 30
        return `M ${centerX} ${centerY} Q ${midX + offset} ${midY - offset} ${d.x} ${d.y}`
      })
      .attr('fill', 'none')
      .attr('stroke', 'rgba(100, 200, 200, 0.2)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3, 7')
      .style('animation', 'dash 15s linear infinite reverse')

    // Draw all nodes
    const allNodes = [...nodes, centerNode]
    const nodeGroups = g
      .append('g')
      .selectAll('g')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`)
      .style('cursor', 'pointer')

    // Node backgrounds
    nodeGroups
      .append('rect')
      .attr('x', -55)
      .attr('y', -28)
      .attr('width', 110)
      .attr('height', 56)
      .attr('rx', 10)
      .attr('fill', (d) => (d.isCenter ? 'rgba(100, 200, 200, 0.9)' : 'rgba(70, 170, 170, 0.5)'))
      .attr('stroke', (d) => (d.isCenter ? 'rgba(150, 250, 250, 0.9)' : 'rgba(100, 200, 200, 0.7)'))
      .attr('stroke-width', (d) => (d.isCenter ? 3 : 2))
      .attr('filter', (d) => (d.isCenter ? 'drop-shadow(0 0 15px rgba(100, 200, 200, 0.6))' : 'none'))

    // File icons
    nodeGroups.append('text').attr('text-anchor', 'middle').attr('y', -5).attr('font-size', '24px').text('📄')

    // Labels
    nodeGroups
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 14)
      .attr('fill', 'white')
      .attr('font-size', '12px')
      .attr('font-weight', (d) => (d.isCenter ? 'bold' : 'normal'))
      .attr('font-family', 'monospace')
      .text((d) => d.name)

    // @@@ hover-effects - Add interactivity
    nodeGroups
      .on('mouseenter', function () {
        d3.select(this)
          .select('rect')
          .transition()
          .duration(200)
          .attr('fill', (d) => (d.isCenter ? 'rgba(100, 200, 200, 1)' : 'rgba(50, 150, 150, 0.6)'))
      })
      .on('mouseleave', function () {
        d3.select(this)
          .select('rect')
          .transition()
          .duration(200)
          .attr('fill', (d) => (d.isCenter ? 'rgba(100, 200, 200, 0.8)' : 'rgba(50, 150, 150, 0.4)'))
      })

    // Entrance animation
    nodeGroups
      .style('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => i * 50)
      .style('opacity', 1)

    links.style('opacity', 0).transition().duration(800).delay(300).style('opacity', 1)
  }, [prismItem, version])

  // 允许将文件从 FileTree 拖拽到图上，直接写入 prismItem.files
  useEffect(() => {
    const el = svgRef.current
    if (!el || !prismItem) return
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const name = e.dataTransfer?.getData('text/plain')?.trim()
      if (!name) return
      if (!Array.isArray(prismItem.files)) prismItem.files = []
      if (!prismItem.files.includes(name)) {
        prismItem.files.push(name)
        setVersion((v) => v + 1)
      }
    }
    el.addEventListener('dragover', onDragOver)
    el.addEventListener('drop', onDrop)
    return () => {
      el.removeEventListener('dragover', onDragOver)
      el.removeEventListener('drop', onDrop)
    }
  }, [prismItem])

  if (!prismItem) return null

  return (
    <>
      {/* Radial gradient backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: position
            ? `radial-gradient(circle at ${position.x}px ${position.y}px, 
                rgba(255, 255, 255, 0.1) 0%, 
                rgba(255, 255, 255, 0.2) 200px,
                rgba(255, 255, 255, 0.3) 400px,
                rgba(255, 255, 255, 0.4) 100%)`
            : 'rgba(255, 255, 255, 0.3)',
          zIndex: 999,
          cursor: 'pointer',
        }}
        onClick={onClose}
      />

      {/* Title - minimal like Dark Souls */}
      <div
        style={{
          position: 'fixed',
          top: '80px',
          left: 'calc(280px + (100vw - 280px) / 2)',
          transform: 'translateX(-50%)',
          zIndex: 1001,
        }}>
        <h2
          style={{
            margin: 0,
            color: 'rgba(40, 50, 60, 0.9)',
            fontSize: '26px',
            fontFamily: 'Georgia, serif',
            fontWeight: '300',
            textAlign: 'center',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            textShadow: '0 0 20px rgba(100, 200, 200, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
            animation: 'titleFadeIn 2s ease-out',
            position: 'relative',
            paddingBottom: '4px',
          }}>
          {prismItem.functionName || 'Function'}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: '-5%',
              right: '-5%',
              height: '2px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(184, 134, 11, 0.5) 10%, rgba(218, 165, 32, 0.9) 30%, rgba(255, 215, 0, 1) 50%, rgba(218, 165, 32, 0.9) 70%, rgba(184, 134, 11, 0.5) 90%, transparent 100%)',
              boxShadow: '0 1px 0 rgba(255, 250, 205, 0.6), 0 -1px 0 rgba(139, 90, 0, 0.4), 0 0 15px rgba(255, 215, 0, 0.5)',
            }}
          />
        </h2>
      </div>

      {/* Graph container - centered on hexagon */}
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: (position?.x || window.innerWidth / 2) - 350,
          top: (position?.y || window.innerHeight / 2) - 350,
          width: 700,
          height: 700,
          background: 'transparent',
          zIndex: 1000,
          pointerEvents: 'none',
        }}>
        <svg
          ref={svgRef}
          style={{ pointerEvents: 'auto' }}
        />
        {assignedAgents && assignedAgents.length > 0 ? (
          <div
            style={{
              position: 'absolute',
              right: -110,
              top: 100,
              width: 260,
              background: 'rgba(255,255,255,0.96)',
              border: '1px solid #e5e5e5',
              borderRadius: 8,
              boxShadow: '0 6px 18px rgba(0,0,0,0.15)',
              padding: '6px 6px 8px 6px',
              color: '#333',
              pointerEvents: 'auto',
            }}>
            <div
              style={{
                fontWeight: 600,
                color: '#6b6b6b',
                fontSize: 12,
                padding: '4px 8px 8px 8px',
                borderBottom: '1px solid #eee',
              }}>
              任务 Agents
            </div>
            <div>
              {assignedAgents.map((a) => (
                <div
                  key={a.id}
                  className="assigned-item"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', height: 28 }}>
                  <div
                    className="assigned-item__icon"
                    style={{ width: 18, textAlign: 'center' }}>
                    🤖
                  </div>
                  <div
                    className="assigned-item__name"
                    style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 12 }}>
                    {a.name}
                  </div>
                  <div
                    className="assigned-item__role"
                    style={{ fontSize: 10, color: '#2563eb', border: '1px solid #c7dbff', background: '#edf3ff', borderRadius: 999, padding: '2px 6px' }}>
                    {a.role}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}
