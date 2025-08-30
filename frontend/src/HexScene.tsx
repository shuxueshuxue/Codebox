import { useHexScene } from './hexscene/useHexScene'

import type { PrismItem } from './hexscene/types'

type Props = {
  width?: number
  height?: number
  onRequestFeature?: (hexKey: string, defaults?: { name?: string; desc?: string }) => void
  onActivatedPrismClick?: (item: PrismItem, event: MouseEvent) => void
}

export default function HexScene(props: Props) {
  const containerRef = useHexScene(props)
  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  )
}
