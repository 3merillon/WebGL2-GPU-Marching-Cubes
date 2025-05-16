import { vec3 } from 'gl-matrix';

export class Camera {
  position: vec3 = vec3.fromValues(0, 0, 1.7);
  yaw: number = 0;
  pitch: number = 0;
  speed: number = 2.0;
  keys: Record<string, boolean> = {};
  mouseDrag: boolean = false;
  lastMouse: [number, number] = [0, 0];

  // Touch state
  touchActive: boolean = false;
  touchLastYaw: number = 0;
  touchLastPitch: number = 0;
  touchLastPos: vec3 = vec3.create();

  // For pinch/pan
  lastTouchDist: number = 0;
  lastTouchMid: [number, number] = [0, 0];
}

export function setupCameraControls(canvas: HTMLCanvasElement, camera: Camera) {
  // --- Prevent browser gestures on canvas
  canvas.style.touchAction = 'none';

  // Mouse controls
  canvas.addEventListener('mousedown', e => {
    camera.mouseDrag = true;
    camera.lastMouse = [e.clientX, e.clientY];
  });
  document.addEventListener('mouseup', () => camera.mouseDrag = false);
  document.addEventListener('mousemove', e => {
    if (!camera.mouseDrag) return;
    const sensitivity = 0.005;
    const dx = e.clientX - camera.lastMouse[0];
    const dy = e.clientY - camera.lastMouse[1];
    camera.lastMouse = [e.clientX, e.clientY];
    camera.yaw   -= dx * sensitivity;
    camera.pitch -= dy * sensitivity;
    const maxPitch = Math.PI/2 - 0.005;
    camera.pitch = Math.max(-maxPitch, Math.min(maxPitch, camera.pitch));
  });
  window.addEventListener('keydown', e => camera.keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup',   e => camera.keys[e.key.toLowerCase()] = false);

  // --- Touch controls ---
  function getTouchPos(touch: Touch): [number, number] {
    // Map touch coordinates to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    // Use devicePixelRatio to map to canvas pixels, if needed
    const dpr = window.devicePixelRatio || 1;
    return [
      (touch.clientX - rect.left) * dpr,
      (touch.clientY - rect.top) * dpr
    ];
  }

  canvas.addEventListener('touchstart', e => {
    if (e.target !== canvas) return;
    e.preventDefault();
    camera.touchActive = true;
    if (e.touches.length === 1) {
      // Single finger: look
      camera.touchLastYaw = camera.yaw;
      camera.touchLastPitch = camera.pitch;
      camera.lastMouse = getTouchPos(e.touches[0]);
    }
    if (e.touches.length === 2) {
      // Two fingers: pinch/pan
      const p0 = getTouchPos(e.touches[0]);
      const p1 = getTouchPos(e.touches[1]);
      camera.lastTouchDist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
      camera.lastTouchMid = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];
      camera.touchLastPos = vec3.clone(camera.position);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (e.target !== canvas) return;
    e.preventDefault();
    if (!camera.touchActive) return;
    if (e.touches.length === 1) {
      // Look around
      const pos = getTouchPos(e.touches[0]);
      const dx = pos[0] - camera.lastMouse[0];
      const dy = pos[1] - camera.lastMouse[1];
      const sensitivity = 0.0025;
      camera.yaw = camera.touchLastYaw - dx * sensitivity;
      camera.pitch = camera.touchLastPitch - dy * sensitivity;
      const maxPitch = Math.PI/2 - 0.01;
      camera.pitch = Math.max(-maxPitch, Math.min(maxPitch, camera.pitch));
    } else if (e.touches.length === 2) {
      // Pinch/pan
      const p0 = getTouchPos(e.touches[0]);
      const p1 = getTouchPos(e.touches[1]);
      const dist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
      const mid: [number, number] = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];

      // Dolly (move forward/back)
      const dollyDelta = (dist - camera.lastTouchDist) * 0.01;
      if (Math.abs(dollyDelta) > 0.001) {
        const forward: vec3 = vec3.fromValues(
          -Math.sin(camera.yaw) * Math.cos(camera.pitch),
          Math.sin(camera.pitch),
          -Math.cos(camera.yaw) * Math.cos(camera.pitch)
        );
        vec3.scaleAndAdd(camera.position, camera.touchLastPos, forward, dollyDelta * camera.speed);
      } else {
        vec3.copy(camera.position, camera.touchLastPos);
      }

      // Pan/strafe (move right/up relative to camera)
      const panX = mid[0] - camera.lastTouchMid[0];
      const panY = mid[1] - camera.lastTouchMid[1];
      if (Math.abs(panX) > 0.5 || Math.abs(panY) > 0.5) {
        const panSensitivity = 0.00125 * camera.speed;
        const right: vec3 = vec3.fromValues(
          Math.cos(camera.yaw),
          0,
          -Math.sin(camera.yaw)
        );
        const up: vec3 = vec3.fromValues(0, 1, 0);
        vec3.scaleAndAdd(camera.position, camera.position, right, -panX * panSensitivity);
        vec3.scaleAndAdd(camera.position, camera.position, up, panY * panSensitivity);
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (e.target !== canvas) return;
    e.preventDefault();
    camera.touchActive = e.touches.length > 0;

    if (e.touches.length === 1) {
      // Start new single-finger drag
      const pos = getTouchPos(e.touches[0]);
      camera.touchLastYaw = camera.yaw;
      camera.touchLastPitch = camera.pitch;
      camera.lastMouse = pos;
    } else if (e.touches.length === 2) {
      // Start new pinch/pan
      const p0 = getTouchPos(e.touches[0]);
      const p1 = getTouchPos(e.touches[1]);
      camera.lastTouchDist = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
      camera.lastTouchMid = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];
      camera.touchLastPos = vec3.clone(camera.position);
    } else if (e.touches.length === 0) {
      // All fingers lifted
      camera.touchLastYaw = camera.yaw;
      camera.touchLastPitch = camera.pitch;
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', e => {
    if (e.target !== canvas) return;
    e.preventDefault();
    camera.touchActive = false;
    // Reset touch state
    camera.touchLastYaw = camera.yaw;
    camera.touchLastPitch = camera.pitch;
  }, { passive: false });
}

export function updateCamera(camera: Camera, dt: number) {
  const forward: vec3 = vec3.fromValues(
    -Math.sin(camera.yaw) * Math.cos(camera.pitch),
    Math.sin(camera.pitch),
    -Math.cos(camera.yaw) * Math.cos(camera.pitch)
  );
  const right: vec3 = vec3.fromValues(
    Math.cos(camera.yaw),
    0,
    -Math.sin(camera.yaw)
  );

  let move: vec3 = vec3.create();
  if (camera.keys['w']) vec3.scaleAndAdd(move, move, forward,  camera.speed * dt);
  if (camera.keys['s']) vec3.scaleAndAdd(move, move, forward, -camera.speed * dt);
  if (camera.keys['a']) vec3.scaleAndAdd(move, move, right,   -camera.speed * dt);
  if (camera.keys['d']) vec3.scaleAndAdd(move, move, right,    camera.speed * dt);
  if (camera.keys['q']) move[1] -= camera.speed * dt;
  if (camera.keys['e']) move[1] += camera.speed * dt;
  vec3.add(camera.position, camera.position, move);
}