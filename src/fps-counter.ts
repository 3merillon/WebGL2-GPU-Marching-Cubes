export class FPSCounter {
  private frames: number[] = [];
  private fpsElem: HTMLElement | null;

  constructor() {
    this.fpsElem = document.getElementById('fps');
  }

  tick() {
    const now = performance.now();
    this.frames.push(now);
    while (this.frames.length && this.frames[0] < now - 1000) this.frames.shift();
    if (this.fpsElem) this.fpsElem.textContent = String(this.frames.length);
  }
}