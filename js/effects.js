/**
 * effects.js
 * Post-processing effects: CRT filters, film grain, glitches
 */

class EffectsEngine {
  constructor() {
    this.initialized = false;
  }

  init() {
    this.applyGrain();
    this.applyCRT();
    this.bindTitleGlitch();
    this.initialized = true;
  }

  // Apply subtle film grain texture
  applyGrain() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 64;
      const y = Math.random() * 64;
      const opacity = Math.random() * 0.5;
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const grainUrl = canvas.toDataURL();
    document.body.style.backgroundImage = `url('${grainUrl}')`;
  }

  // Apply CRT screen effect (scanlines)
  applyCRT() {
    const style = document.createElement('style');
    style.textContent = `
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.15),
          rgba(0, 0, 0, 0.15) 1px,
          transparent 1px,
          transparent 2px
        );
        z-index: 9999;
      }
    `;
    document.head.appendChild(style);
  }

  bindTitleGlitch() {
    document.addEventListener('mouseover', (event) => {
      const header = event.target.closest('.exhibit-header');
      if (!header) return;

      const nextTarget = event.relatedTarget;
      if (nextTarget && header.contains(nextTarget)) return;

      header.classList.add('glitch');
    });

    document.addEventListener('mouseout', (event) => {
      const header = event.target.closest('.exhibit-header');
      if (!header) return;

      const nextTarget = event.relatedTarget;
      if (nextTarget && header.contains(nextTarget)) return;

      header.classList.remove('glitch');
    });
  }

  startBackgroundHum() {
    if (this.humStarted) return;
    this.humStarted = true;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = (Math.random() * 2 - 1) * 0.18;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.015;

    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);

    this.backgroundHum = {
      audioContext,
      source,
      gainNode
    };
  }

  // Glitch effect (visual distortion)
  applyGlitch(element) {
    element.style.animation = 'glitch 0.2s';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const effects = new EffectsEngine();
  effects.init();
});
