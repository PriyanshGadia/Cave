/**
 * Procedural Web Audio API Sound Effects Synthesizer
 * Zero-asset, zero-latency, zero-bandwidth sci-fi sound design
 */

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Subtle sci-fi UI blip on button hover
  public playHoverBlip() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Click confirmation sound
  public playClickBeep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Biometric scanner sweep drone
  public playScannerSweep() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, this.ctx.currentTime + 0.8);
    osc.frequency.linearRampToValueAtTime(440, this.ctx.currentTime + 1.6);

    gain.gain.setValueAtTime(0.025, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.6);
  }

  // Access granted chord
  public playAccessGranted() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const freqs = [440, 554.37, 659.25, 880]; // A Major sci-fi harmonic
    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + idx * 0.06 + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + idx * 0.06);
      osc.stop(this.ctx.currentTime + idx * 0.06 + 0.45);
    });
  }

  // Lock disengagement deep 40Hz clank with metallic impact
  public playMechanicalClank() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    // Sub-bass 40Hz clank
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, this.ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.45);

    subGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start();
    subOsc.stop(this.ctx.currentTime + 0.45);

    // High metal strike transient
    const metalOsc = this.ctx.createOscillator();
    const metalGain = this.ctx.createGain();
    metalOsc.type = 'square';
    metalOsc.frequency.setValueAtTime(720, this.ctx.currentTime);
    metalOsc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.12);

    metalGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    metalGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);

    metalOsc.connect(metalGain);
    metalGain.connect(this.ctx.destination);
    metalOsc.start();
    metalOsc.stop(this.ctx.currentTime + 0.12);
  }

  // High-pressure pneumatic steam venting hiss
  public playSteamVent() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1800, this.ctx.currentTime);
    bandpass.Q.setValueAtTime(1.2, this.ctx.currentTime);
    bandpass.frequency.linearRampToValueAtTime(900, this.ctx.currentTime + 2.0);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.2);

    noiseSource.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    noiseSource.start();
    noiseSource.stop(this.ctx.currentTime + 2.2);
  }

  // Hydraulic blast door opening rumble
  public playDoorRumble() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const bufferSize = this.ctx.sampleRate * 2.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(80, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(280, this.ctx.currentTime + 0.8);
    filter.frequency.exponentialRampToValueAtTime(35, this.ctx.currentTime + 2.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.16, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.2);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start();
    whiteNoise.stop(this.ctx.currentTime + 2.2);
  }
}

export const soundFx = new SoundSynthesizer();
