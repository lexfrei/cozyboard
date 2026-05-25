function midi(n: number): number {
  return 440 * Math.pow(2, (n - 69) / 12)
}

const STEPS_PER_BAR = 16
const BARS = 4
const TOTAL_STEPS = STEPS_PER_BAR * BARS
const BPM = 140
const SEC_PER_STEP = 60 / BPM / 4

// Am - F - C - G — classic keygen mood, 4 bars.
const BASS_PER_BAR = [45, 41, 36, 43] // A2, F2, C2, G2

// Arpeggio in each bar (one note per 16th step inside the bar, 16 entries each).
const ARP: number[][] = [
  // Am (A C E + octave)
  [69, 72, 76, 81, 76, 72, 76, 81, 84, 81, 76, 72, 76, 81, 84, 88],
  // F  (F A C + octave)
  [65, 69, 72, 77, 72, 69, 72, 77, 81, 77, 72, 69, 72, 77, 81, 84],
  // C  (C E G + octave)
  [60, 64, 67, 72, 67, 64, 67, 72, 76, 72, 67, 64, 67, 72, 76, 79],
  // G  (G B D + octave)
  [67, 71, 74, 79, 74, 71, 74, 79, 83, 79, 74, 71, 74, 79, 83, 86],
]

class ChiptunePlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private nextStepTime = 0
  private step = 0

  playing = false

  async start(): Promise<void> {
    if (this.playing) return
    const ctx = new AudioContext()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume()
      } catch {
        /* autoplay still blocked — caller should retry on next user gesture */
      }
    }
    const master = ctx.createGain()
    master.gain.value = 0.06
    master.connect(ctx.destination)
    this.ctx = ctx
    this.master = master
    this.nextStepTime = ctx.currentTime + 0.05
    this.step = 0
    this.playing = true
    this.tick()
  }

  stop(): void {
    if (!this.playing) return
    this.playing = false
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    if (this.ctx !== null) {
      void this.ctx.close()
    }
    this.ctx = null
    this.master = null
  }

  private tick(): void {
    if (!this.playing || this.ctx === null) return
    const horizon = this.ctx.currentTime + 0.2
    while (this.nextStepTime < horizon) {
      this.playStep(this.step, this.nextStepTime)
      this.step = (this.step + 1) % TOTAL_STEPS
      this.nextStepTime += SEC_PER_STEP
    }
    this.timer = setTimeout(() => {
      this.tick()
    }, 25)
  }

  private playStep(step: number, time: number): void {
    const bar = Math.floor(step / STEPS_PER_BAR)
    const inBar = step % STEPS_PER_BAR

    // Bass: hit on beats 1 and 9 (first 16th of each half-bar).
    if (inBar === 0 || inBar === 8) {
      const bassNote = BASS_PER_BAR[bar]
      if (bassNote !== undefined) {
        this.tone(time, midi(bassNote), 0.35, 'triangle', 0.32)
      }
    }

    // Lead arpeggio: every 16th.
    const arp = ARP[bar]
    if (arp !== undefined) {
      const note = arp[inBar]
      if (note !== undefined) {
        this.tone(time, midi(note), 0.12, 'square', 0.18)
      }
    }

    // Hi-hat-ish noise on every off-beat eighth.
    if (inBar % 4 === 2) {
      this.noise(time, 0.04, 0.04)
    }
  }

  private tone(
    time: number,
    freq: number,
    duration: number,
    type: OscillatorType,
    vol: number,
  ): void {
    if (this.ctx === null || this.master === null) return
    const osc = this.ctx.createOscillator()
    const env = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    env.gain.setValueAtTime(0, time)
    env.gain.linearRampToValueAtTime(vol, time + 0.005)
    env.gain.exponentialRampToValueAtTime(0.001, time + duration)
    osc.connect(env)
    env.connect(this.master)
    osc.start(time)
    osc.stop(time + duration + 0.01)
  }

  private noise(time: number, duration: number, vol: number): void {
    if (this.ctx === null || this.master === null) return
    const bufferSize = Math.floor(this.ctx.sampleRate * duration)
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const env = this.ctx.createGain()
    env.gain.setValueAtTime(vol, time)
    env.gain.exponentialRampToValueAtTime(0.001, time + duration)
    const hp = this.ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 6000
    src.connect(hp)
    hp.connect(env)
    env.connect(this.master)
    src.start(time)
    src.stop(time + duration + 0.01)
  }
}

export const player = new ChiptunePlayer()
