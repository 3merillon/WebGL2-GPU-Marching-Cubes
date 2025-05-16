import type { Camera } from './camera';
import { createTriTableTexture, createEdgeTableTexture } from './gpu-marching-cubes-tables';
import gpuMcVertSrc from './shaders/gpu_mc.vert?raw';
import gpuMcFragSrc from './shaders/gpu_mc.frag?raw';
import { mat4, vec3 } from 'gl-matrix';

export class GpuMarchingCubesRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private vertexCount: number;
  private triTableTex: WebGLTexture;
  private edgeTableTex: WebGLTexture;
  private gridSize: number;
  private tilesX: number;
  private fieldTex2D: WebGLTexture | null = null;

  constructor(gl: WebGL2RenderingContext, gridSize: number = 32, tilesX: number = 8) {
    this.gl = gl;
    this.gridSize = gridSize;
    this.tilesX = tilesX;

    const vert = this.compileShader(gl.VERTEX_SHADER, gpuMcVertSrc);
    const frag = this.compileShader(gl.FRAGMENT_SHADER, gpuMcFragSrc);
    this.program = this.createProgram(vert, frag);

    this.triTableTex = createTriTableTexture(gl);
    this.edgeTableTex = createEdgeTableTexture(gl);

    const N = gridSize - 1;
    const numVoxels = N * N * N;
    const maxTrisPerVoxel = 5;
    const vertsPerTri = 3;
    this.vertexCount = numVoxels * maxTrisPerVoxel * vertsPerTri;

    const indices = new Uint32Array(this.vertexCount * 3);
    let ptr = 0;
    for (let v = 0; v < numVoxels; ++v) {
      for (let t = 0; t < maxTrisPerVoxel; ++t) {
        for (let k = 0; k < vertsPerTri; ++k) {
          indices[ptr++] = v;
          indices[ptr++] = t;
          indices[ptr++] = k;
        }
      }
    }

    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const vbo = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribIPointer(0, 1, gl.UNSIGNED_INT, 12, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribIPointer(1, 1, gl.UNSIGNED_INT, 12, 4);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribIPointer(2, 1, gl.UNSIGNED_INT, 12, 8);

    gl.bindVertexArray(null);
  }

  setFieldTexture(tex: WebGLTexture, tilesX: number) {
    this.fieldTex2D = tex;
    this.tilesX = tilesX;
  }

  render(_time: number, _numblobs: number, aspect: number, camera: Camera) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.114, 0.172, 0.125, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    // Matrices
    const proj = mat4.create();
    const view = mat4.create();
    const world = mat4.create();
    mat4.perspective(proj, Math.PI/3, aspect, 0.1, 500);

    const forward = [
      -Math.sin(camera.yaw) * Math.cos(camera.pitch),
      Math.sin(camera.pitch),
      -Math.cos(camera.yaw) * Math.cos(camera.pitch)
    ];
    const lookAt: vec3 = vec3.fromValues(
      camera.position[0] + forward[0],
      camera.position[1] + forward[1],
      camera.position[2] + forward[2]
    );
    mat4.lookAt(view, camera.position, lookAt, [0,1,0]);
    mat4.identity(world);

    const worldviewproj = mat4.create();
    mat4.multiply(worldviewproj, proj, view);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "u_worldviewproj"), false, worldviewproj);
    gl.uniform1i(gl.getUniformLocation(this.program, "gridSize"), this.gridSize);
    gl.uniform1f(gl.getUniformLocation(this.program, "isoLevel"), 80.0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.triTableTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "triTableTex"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.edgeTableTex);
    gl.uniform1i(gl.getUniformLocation(this.program, "edgeTableTex"), 1);

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.fieldTex2D);
    gl.uniform1i(gl.getUniformLocation(this.program, "fieldTex2D"), 2);
    gl.uniform1i(gl.getUniformLocation(this.program, "tilesX"), this.tilesX);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

    gl.bindVertexArray(null);
  }

  private compileShader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader compile error');
    return shader;
  }

  private createProgram(vert: WebGLShader, frag: WebGLShader): WebGLProgram {
    const gl = this.gl;
    const program = gl.createProgram()!;
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) ?? 'Program link error');
    return program;
  }
}