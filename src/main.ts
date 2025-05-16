import { Camera, setupCameraControls, updateCamera } from './camera';
import { ImmSim } from './immediate-sim';
import { MarchingCubesEffect, createField } from './marching-cubes';
import { setupUI, setupModeToggle } from './ui';
import { GpuMarchingCubesRenderer } from './gpu-marching-cubes';
import { GpuFieldGenerator } from './gpu-field-generator';
import { FPSCounter } from './fps-counter';

type Renderer = {
  render(time: number, numblobs: number, aspect: number, camera: Camera): void;
};

const canvas = document.getElementById('render_area') as HTMLCanvasElement;
let gl = canvas.getContext('webgl2') as WebGL2RenderingContext | null;
if (!gl) {
  alert('WebGL 2 is not supported in your browser.');
  throw new Error('WebGL 2 not supported');
}

const ext = gl.getExtension('EXT_color_buffer_float');
if (!ext) {
    alert('Your browser does not support EXT_color_buffer_float (required for GPU field generation).');
    throw new Error('EXT_color_buffer_float not supported');
}

let aspect = 1;
let program: WebGLProgram;
let attribs: any;
let uniforms: any;
let imm: ImmSim;
let cpuRenderer: MarchingCubesEffect;
let gpuRenderer: GpuMarchingCubesRenderer;
let renderer: Renderer;
let g_numBlobs = 10;
let g_resolution = 32;
let camera = new Camera();
let currentMode: 'cpu' | 'gpu' = 'cpu';
let gpuFieldGenerator: GpuFieldGenerator;
let fpsCounter: FPSCounter;

import marchingCubeVert from './shaders/marching_cube.vert?raw';
import marchingCubeFrag from './shaders/marching_cube.frag?raw';

// ========== WebGL helpers ==========

function createShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile error');
  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vsSource: string, fsSource: string) {
  const program = gl.createProgram()!;
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program) ?? 'Program link error');
  return program;
}

// ========== Resize Handling ==========

function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const width = Math.floor(window.innerWidth * dpr);
  const height = Math.floor(window.innerHeight * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    aspect = width / height;
    gl!.viewport(0, 0, width, height);
  }
}

// ========== Field Generation ==========

function updateField(time: number) {
  if (currentMode === 'gpu') {
    gpuFieldGenerator.generateField(g_numBlobs, time);
    gpuRenderer.setFieldTexture(gpuFieldGenerator.tiledTexture, gpuFieldGenerator.tilesX);
  } else {
    const field = createField(g_resolution, g_numBlobs, time);
    cpuRenderer.render(time, g_numBlobs, aspect, camera, field);
  }
}

// ========== Setup ==========

function setupWebGL() {
  resizeCanvasToDisplaySize(canvas);

  program = createProgram(gl!, marchingCubeVert, marchingCubeFrag);

  attribs = {
    position: gl!.getAttribLocation(program, "position"),
    normal: gl!.getAttribLocation(program, "normal"),
  };
  uniforms = {
    u_worldviewproj: gl!.getUniformLocation(program, "u_worldviewproj"),
    u_worldview: gl!.getUniformLocation(program, "u_worldview"),
    u_world: gl!.getUniformLocation(program, "u_world"),
    u_lightDir: gl!.getUniformLocation(program, "u_lightDir"),
    u_lightColor: gl!.getUniformLocation(program, "u_lightColor"),
    u_ambientUp: gl!.getUniformLocation(program, "u_ambientUp"),
    u_ambientDown: gl!.getUniformLocation(program, "u_ambientDown"),
  };

  imm = new ImmSim(gl!, attribs);

  cpuRenderer = new MarchingCubesEffect(g_resolution, gl!, program, attribs, uniforms, imm, camera);
  gpuRenderer = new GpuMarchingCubesRenderer(gl!, g_resolution);
  renderer = cpuRenderer;

  gl!.clearColor(0.2, 0.15, 0.12, 1);
  gl!.clearDepth(1.0);
  gl!.enable(gl!.DEPTH_TEST);

  setupCameraControls(canvas, camera);
}

function setup() {
  setupWebGL();
  fpsCounter = new FPSCounter();
  setupUI(setSetting);

  setupModeToggle(mode => {
    currentMode = mode;
    renderer = (mode === 'gpu') ? gpuRenderer : cpuRenderer;
    updateField(performance.now() * 0.001);
  });

  gpuFieldGenerator = new GpuFieldGenerator(gl!, g_resolution);
  updateField(performance.now() * 0.001);

  // --- Collapsible Menu Setup ---
  setupDashboardToggle();

  lastTime = performance.now();
  requestAnimationFrame(mainloop);

  window.addEventListener('resize', () => {
    resizeCanvasToDisplaySize(canvas);
  });
}

// Collapsible dashboard menu logic
function setupDashboardToggle() {
  const dashboard = document.getElementById('dashboard');
  const toggleBtn = document.getElementById('dashboardToggle');
  let collapsed = false;

  if (!dashboard || !toggleBtn) return;

  toggleBtn.addEventListener('click', () => {
    collapsed = !collapsed;
    dashboard.classList.toggle('collapsed', collapsed);
    toggleBtn.classList.toggle('collapsed', collapsed);
  });
}

let lastTime = performance.now();
function mainloop() {
  const now = performance.now();
  const dt = (now - lastTime) * 0.001;
  lastTime = now;
  const time = now * 0.001;

  updateCamera(camera, dt);
  updateField(time);

  if (currentMode === 'gpu') {
    renderer.render(time, g_numBlobs, aspect, camera);
  }

  fpsCounter.tick();
  requestAnimationFrame(mainloop);
}

function setSetting(type: 'blobs' | 'resolution', value: number) {
  if (type === 'blobs') {
    g_numBlobs = value;
    updateField(performance.now() * 0.001);
  } else if (type === 'resolution') {
    g_resolution = value;
    imm = new ImmSim(gl!, attribs);
    cpuRenderer = new MarchingCubesEffect(g_resolution, gl!, program, attribs, uniforms, imm, camera);

    gpuFieldGenerator?.dispose();
    gpuFieldGenerator = new GpuFieldGenerator(gl!, g_resolution);
    gpuRenderer = new GpuMarchingCubesRenderer(gl!, g_resolution, gpuFieldGenerator.tilesX);

    renderer = (currentMode === 'gpu') ? gpuRenderer : cpuRenderer;
    updateField(performance.now() * 0.001);
  }
}

window.addEventListener('DOMContentLoaded', setup);