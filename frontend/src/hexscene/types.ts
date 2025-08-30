import * as THREE from 'three'
import { Hex } from '../lib/hexagons'

export type PrismItem = {
  hex: Hex
  key: string
  group: THREE.Group
  mesh: THREE.Mesh
  sprite: THREE.Sprite
  label?: string
  functionName?: string
  description?: string
  fileName?: string
  isActivated?: boolean
}
