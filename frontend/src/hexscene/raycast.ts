import * as THREE from 'three'
import { Layout, HexOps } from '../lib/hexagons'

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

export function hexAtClientXY(renderer: THREE.WebGLRenderer, camera: THREE.Camera, layout: Layout, clientX: number, clientY: number) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -(((clientY - rect.top) / rect.height) * 2 - 1)
  raycaster.setFromCamera(mouse, camera)
  if (!raycaster.ray.intersectPlane(plane, hit)) return null
  return HexOps.pixelToHex(layout, hit.x, hit.z)
}
