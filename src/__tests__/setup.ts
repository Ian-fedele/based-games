import '@testing-library/jest-dom/vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock requestAnimationFrame
window.requestAnimationFrame = (cb) => setTimeout(cb, 16) as unknown as number
window.cancelAnimationFrame = (id) => clearTimeout(id)

// Mock AudioContext
class MockOscillator {
  type = 'sine'
  frequency = {
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  }
  connect = () => {}
  start = () => {}
  stop = () => {}
}

class MockGainNode {
  gain = {
    value: 1,
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  }
  connect = () => {}
}

class MockBiquadFilter {
  type = 'lowpass'
  frequency = {
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
  }
  connect = () => {}
}

class MockAudioContext {
  currentTime = 0
  sampleRate = 44100
  destination = {}
  createOscillator = () => new MockOscillator()
  createGain = () => new MockGainNode()
  createBiquadFilter = () => new MockBiquadFilter()
  createBuffer = (channels: number, length: number, sampleRate: number) => ({
    getChannelData: () => new Float32Array(length),
  })
  createBufferSource = () => ({
    buffer: null,
    connect: () => {},
    start: () => {},
  })
}

Object.defineProperty(window, 'AudioContext', { value: MockAudioContext })
Object.defineProperty(window, 'webkitAudioContext', { value: MockAudioContext })

// Mock Image
class MockImage {
  src = ''
  width = 64
  height = 64
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
}
Object.defineProperty(window, 'Image', { value: MockImage })

// Mock canvas getContext
HTMLCanvasElement.prototype.getContext = (() => {
  return null
}) as any

HTMLCanvasElement.prototype.toBlob = function (cb: (blob: Blob | null) => void) {
  cb(new Blob(['fake'], { type: 'image/png' }))
}
