import * as THREE from 'three'
import { MapControls } from 'three/examples/jsm/controls/MapControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export function createScene(container: HTMLDivElement, width?: number, height?: number) {
  const w = width ?? (container.clientWidth || window.innerWidth)
  const h = height ?? (container.clientHeight || window.innerHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xfff7e6)

  // Orthographic top-down camera
  const aspect = w / h
  const frustumSize = 120
  const camera = new THREE.OrthographicCamera((-frustumSize * aspect) / 2, (frustumSize * aspect) / 2, frustumSize / 2, -frustumSize / 2, 0.1, 2000)
  camera.userData.frustumSize = frustumSize
  camera.position.set(0, 150, 0)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  const controls = new MapControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.enableRotate = false
  controls.screenSpacePanning = true
  // Allow pan with left/right, wheel to zoom (orthographic zoom)
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.PAN,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }
  ;(controls as any).minZoom = 0.2
  ;(controls as any).maxZoom = 8

  const ambient = new THREE.AmbientLight(0xffffff, 0.2)
  scene.add(ambient)
  const hemi = new THREE.HemisphereLight(0xfff0cc, 0xe6ecff, 0.8)
  scene.add(hemi)
  const dir = new THREE.DirectionalLight(0xffd5a5, 1.2)
  dir.position.set(40, 80, 20)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  scene.add(dir)
  const dir2 = new THREE.DirectionalLight(0xbfd7ff, 0.6)
  dir2.position.set(-30, 30, -40)
  dir2.castShadow = true
  dir2.shadow.mapSize.set(1024, 1024)
  scene.add(dir2)

  const pmrem = new THREE.PMREMGenerator(renderer)
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture

  const ground = new THREE.GridHelper(500, 50, 0xd8d2c0, 0xeee6d6)
  ground.position.y = -0.01
  scene.add(ground)
  const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ color: 0xfff3d0, roughness: 1, metalness: 0 }))
  groundPlane.rotation.x = -Math.PI / 2
  groundPlane.position.y = -0.02
  groundPlane.receiveShadow = true
  scene.add(groundPlane)

  const cleanup = () => {
    controls.dispose()
    renderer.dispose()
    envRT.dispose()
    pmrem.dispose()
    container.removeChild(renderer.domElement)
  }

  return { scene, camera, renderer, controls, cleanup }
}
