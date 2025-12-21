import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import './App.css'

function App() {
  return (
    <div className="app">
      <Canvas
        camera={{ position: [0, 1, 8], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <div className="message">
        <h1>For You</h1>
        <p>A glass rose that will never fade</p>
      </div>
    </div>
  )
}

export default App
