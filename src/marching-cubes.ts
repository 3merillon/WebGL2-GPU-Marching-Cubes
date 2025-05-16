import { mat4, vec3 } from 'gl-matrix';
import { edgeTable, triTable } from './marching-cubes-tables';
import type { ImmSim } from './immediate-sim';
import type { Camera } from './camera';

export class MarchingCubesEffect {
  private resolution: number;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private attribs: any;
  private uniforms: any;
  private imm: ImmSim;
  private camera: Camera;

  private size: number;
  private delta: number;
  private yd: number;
  private zd: number;
  private size3: number;
  private field: Float32Array;
  private normal_cache: Float32Array;
  private vlist: Float32Array;
  private nlist: Float32Array;

  private proj: mat4 = mat4.create();
  private view: mat4 = mat4.create();
  private world: mat4 = mat4.create();
  private worldview: mat4 = mat4.create();
  private viewproj: mat4 = mat4.create();
  private worldviewproj: mat4 = mat4.create();

  constructor(
    resolution: number,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    attribs: any,
    uniforms: any,
    imm: ImmSim,
    camera: Camera
  ) {
    this.resolution = resolution;
    this.gl = gl;
    this.program = program;
    this.attribs = attribs;
    this.uniforms = uniforms;
    this.imm = imm;
    this.camera = camera;

    this.size = resolution;
    this.delta = 2.0 / this.size;
    this.yd = this.size;
    this.zd = this.size * this.size;
    this.size3 = this.size * this.size * this.size;
    this.field = new Float32Array(this.size3);
    this.normal_cache = new Float32Array(this.size3 * 3);
    this.vlist = new Float32Array(12 * 3);
    this.nlist = new Float32Array(12 * 3);
  }

  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  private VIntX(
    q: number,
    pout: Float32Array,
    nout: Float32Array,
    offset: number,
    isol: number,
    x: number,
    y: number,
    z: number,
    valp1: number,
    valp2: number
  ) {
    const mu = (isol - valp1) / (valp2 - valp1);
    const gx = x + mu;
    pout[offset + 0] = (gx / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 1] = (y  / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 2] = (z  / (this.size - 1)) * 2.0 - 1.0;

    const nidx0 = q * 3;
    const nidx1 = (q + 1) * 3;
    nout[offset + 0] = this.lerp(this.normal_cache[nidx0 + 0], this.normal_cache[nidx1 + 0], mu);
    nout[offset + 1] = this.lerp(this.normal_cache[nidx0 + 1], this.normal_cache[nidx1 + 1], mu);
    nout[offset + 2] = this.lerp(this.normal_cache[nidx0 + 2], this.normal_cache[nidx1 + 2], mu);
  }

  private VIntY(
    q: number,
    pout: Float32Array,
    nout: Float32Array,
    offset: number,
    isol: number,
    x: number,
    y: number,
    z: number,
    valp1: number,
    valp2: number
  ) {
    const mu = (isol - valp1) / (valp2 - valp1);
    const gy = y + mu;
    pout[offset + 0] = (x  / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 1] = (gy / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 2] = (z  / (this.size - 1)) * 2.0 - 1.0;

    const nidx0 = q * 3;
    const nidx1 = (q + this.yd) * 3;
    nout[offset + 0] = this.lerp(this.normal_cache[nidx0 + 0], this.normal_cache[nidx1 + 0], mu);
    nout[offset + 1] = this.lerp(this.normal_cache[nidx0 + 1], this.normal_cache[nidx1 + 1], mu);
    nout[offset + 2] = this.lerp(this.normal_cache[nidx0 + 2], this.normal_cache[nidx1 + 2], mu);
  }

  private VIntZ(
    q: number,
    pout: Float32Array,
    nout: Float32Array,
    offset: number,
    isol: number,
    x: number,
    y: number,
    z: number,
    valp1: number,
    valp2: number
  ) {
    const mu = (isol - valp1) / (valp2 - valp1);
    const gz = z + mu;
    pout[offset + 0] = (x  / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 1] = (y  / (this.size - 1)) * 2.0 - 1.0;
    pout[offset + 2] = (gz / (this.size - 1)) * 2.0 - 1.0;

    const nidx0 = q * 3;
    const nidx1 = (q + this.zd) * 3;
    nout[offset + 0] = this.lerp(this.normal_cache[nidx0 + 0], this.normal_cache[nidx1 + 0], mu);
    nout[offset + 1] = this.lerp(this.normal_cache[nidx0 + 1], this.normal_cache[nidx1 + 1], mu);
    nout[offset + 2] = this.lerp(this.normal_cache[nidx0 + 2], this.normal_cache[nidx1 + 2], mu);
  }

  /*private compNorm(q: number) {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const maxIdx = this.size3 - 1;
    if (this.normal_cache[q*3] === 0.0) {
      this.normal_cache[q*3    ] = this.field[clamp(q-1, 0, maxIdx)]  - this.field[clamp(q+1, 0, maxIdx)];
      this.normal_cache[q*3 + 1] = this.field[clamp(q-this.yd, 0, maxIdx)] - this.field[clamp(q+this.yd, 0, maxIdx)];
      this.normal_cache[q*3 + 2] = this.field[clamp(q-this.zd, 0, maxIdx)] - this.field[clamp(q+this.zd, 0, maxIdx)];
    }
  }*/
  private compNorm(q: number) {
    if (this.normal_cache[q*3] !== 0.0) return;

    const x = q % this.size;
    const y = Math.floor(q / this.size) % this.size;
    const z = Math.floor(q / (this.size * this.size));

    const minX = Math.max(x - 1, 0);
    const maxX = Math.min(x + 1, this.size - 1);
    const minY = Math.max(y - 1, 0);
    const maxY = Math.min(y + 1, this.size - 1);
    const minZ = Math.max(z - 1, 0);
    const maxZ = Math.min(z + 1, this.size - 1);

    const idxX0 = z * this.size * this.size + y * this.size + minX;
    const idxX1 = z * this.size * this.size + y * this.size + maxX;
    const idxY0 = z * this.size * this.size + minY * this.size + x;
    const idxY1 = z * this.size * this.size + maxY * this.size + x;
    const idxZ0 = minZ * this.size * this.size + y * this.size + x;
    const idxZ1 = maxZ * this.size * this.size + y * this.size + x;

    this.normal_cache[q*3    ] = this.field[idxX0] - this.field[idxX1];
    this.normal_cache[q*3 + 1] = this.field[idxY0] - this.field[idxY1];
    this.normal_cache[q*3 + 2] = this.field[idxZ0] - this.field[idxZ1];
  }

  private polygonize(x: number, y: number, z: number, q: number, isol: number) {
    let cubeindex = 0;
    const field0 = this.field[q]
    const field1 = this.field[q+1]
    const field2 = this.field[q+this.yd]
    const field3 = this.field[q+1+this.yd]
    const field4 = this.field[q+this.zd]
    const field5 = this.field[q+1+this.zd]
    const field6 = this.field[q+this.yd+this.zd]
    const field7 = this.field[q+1+this.yd+this.zd]

    if (field0 < isol) cubeindex |= 1;
    if (field1 < isol) cubeindex |= 2;
    if (field2 < isol) cubeindex |= 8;
    if (field3 < isol) cubeindex |= 4;
    if (field4 < isol) cubeindex |= 16;
    if (field5 < isol) cubeindex |= 32;
    if (field6 < isol) cubeindex |= 128;
    if (field7 < isol) cubeindex |= 64;

    const bits = edgeTable[cubeindex];
    if (bits == 0) return 0;

    if (bits & 1)    {this.compNorm(q);       this.compNorm(q+1);       this.VIntX(q,      this.vlist, this.nlist, 0,  isol, x,  y,  z, field0, field1); }
    if (bits & 2)    {this.compNorm(q+1);     this.compNorm(q+1+this.yd);    this.VIntY(q+1,  this.vlist, this.nlist, 3,  isol, x+1, y,  z, field1, field3); }
    if (bits & 4)    {this.compNorm(q+this.yd);    this.compNorm(q+1+this.yd);    this.VIntX(q+this.yd, this.vlist, this.nlist, 6,  isol, x,  y+1, z, field2, field3); }
    if (bits & 8)    {this.compNorm(q);       this.compNorm(q+this.yd);      this.VIntY(q,      this.vlist, this.nlist, 9,  isol, x,  y,  z, field0, field2); }
    if (bits & 16)   {this.compNorm(q+this.zd);    this.compNorm(q+1+this.zd);    this.VIntX(q+this.zd,    this.vlist, this.nlist, 12, isol, x,  y,  z+1, field4, field5); }
    if (bits & 32)   {this.compNorm(q+1+this.zd);  this.compNorm(q+1+this.yd+this.zd); this.VIntY(q+1+this.zd,  this.vlist, this.nlist, 15, isol, x+1, y,  z+1, field5, field7); }
    if (bits & 64)   {this.compNorm(q+this.yd+this.zd); this.compNorm(q+1+this.yd+this.zd); this.VIntX(q+this.yd+this.zd, this.vlist, this.nlist, 18, isol, x,  y+1, z+1, field6, field7); }
    if (bits & 128)  {this.compNorm(q+this.zd);    this.compNorm(q+this.yd+this.zd);   this.VIntY(q+this.zd,    this.vlist, this.nlist, 21, isol, x,  y,  z+1, field4, field6); }
    if (bits & 256)  {this.compNorm(q);       this.compNorm(q+this.zd);      this.VIntZ(q,        this.vlist, this.nlist, 24, isol, x,  y,  z, field0, field4); }
    if (bits & 512)  {this.compNorm(q+1);     this.compNorm(q+1+this.zd);    this.VIntZ(q+1,    this.vlist, this.nlist, 27, isol, x+1, y,  z, field1, field5); }
    if (bits & 1024) {this.compNorm(q+1+this.yd);  this.compNorm(q+1+this.yd+this.zd); this.VIntZ(q+1+this.yd, this.vlist, this.nlist, 30, isol, x+1, y+1, z, field3, field7); }
    if (bits & 2048) {this.compNorm(q+this.yd);    this.compNorm(q+this.yd+this.zd);   this.VIntZ(q+this.yd,   this.vlist, this.nlist, 33, isol, x,  y+1, z, field2, field6); }

    cubeindex <<= 4; // offset into triTable
    let i = 0;
    while (triTable[cubeindex + i] != -1) {
      this.imm.posnormtriv(this.vlist, this.nlist,
        3 * triTable[cubeindex + i + 0],
        3 * triTable[cubeindex + i + 1],
        3 * triTable[cubeindex + i + 2]
      );
      i += 3;
    }
  }

  render(time: number, numblobs: number, aspect: number, camera: Camera, inputField?: Float32Array) {
    this.gl.clearColor(0.2, 0.15, 0.12, 1.0);

    mat4.perspective(this.proj, Math.PI/3, aspect, 0.1, 500);

    const cam = this.camera;
    const forward = [
        -Math.sin(cam.yaw) * Math.cos(cam.pitch),
        Math.sin(cam.pitch),
        -Math.cos(cam.yaw) * Math.cos(cam.pitch)
    ];
    const lookAt: vec3 = vec3.fromValues(
      cam.position[0] + forward[0],
      cam.position[1] + forward[1],
      cam.position[2] + forward[2]
    );
    mat4.lookAt(this.view, cam.position, lookAt, [0,1,0]);
    mat4.identity(this.world);

    mat4.multiply(this.viewproj, this.proj, this.view);
    mat4.multiply(this.worldview, this.world, this.view);
    mat4.multiply(this.worldviewproj, this.world, this.viewproj);

    this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    this.gl.useProgram(this.program);

    this.gl.uniformMatrix4fv(this.uniforms.u_worldviewproj, false, this.worldviewproj);
    this.gl.uniformMatrix4fv(this.uniforms.u_worldview, false, this.worldview);
    this.gl.uniformMatrix4fv(this.uniforms.u_world, false, this.world);
    this.gl.uniform3fv(this.uniforms.u_lightDir, [-1.0, 1.0, 1.0]);
    this.gl.uniform4fv(this.uniforms.u_lightColor, [0.8, 0.7, 0.6, 1.0]);
    this.gl.uniform4fv(this.uniforms.u_ambientUp, [0.05, 0.1, 0.2, 1.0]);
    this.gl.uniform4fv(this.uniforms.u_ambientDown, [0.15, 0.075, 0.01, 1.0]);

    this.field = inputField || createField(this.size, numblobs, time);
    for (let i = 0; i < this.size3; i++) this.normal_cache[i * 3] = 0.0;

    const isol = 80.0;
    this.imm.begin(this.gl.TRIANGLES, this.program);

    const size2 = this.size / 2.0;
    for (let z = 0; z < this.size - 1; z++) {
      const z_offset = this.size * this.size * z;
      for (let y = 0; y < this.size - 1; y++) {
        const y_offset = z_offset + this.size * y;
        for (let x = 0; x < this.size - 1; x++) {
          const q = y_offset + x;
          this.polygonize(x, y, z, q, isol);
        }
      }
    }
    this.imm.end();
  }
}

export function createField(gridSize: number, numBlobs: number, time: number = 0): Float32Array {
  const size = gridSize;
  const field = new Float32Array(size * size * size);
  const denom = size - 1;

  const blobParams = new Float32Array(numBlobs * 4);
  for (let i = 0; i < numBlobs; i++) {
    const idx = i * 4;
    blobParams[idx + 0] = Math.sin(i + 1.26 * time * (1.03 + 0.5*Math.cos(0.21 * i))) * 0.27 + 0.5;
    blobParams[idx + 1] = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.77;
    blobParams[idx + 2] = Math.cos(i + 1.32 * time * 0.1*Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;
    const strength = 1.2 / ((Math.sqrt(numBlobs)- 1) / 4 + 1);
    blobParams[idx + 3] = strength;
  }

  // --- Blob field logic ---
  for (let z = 0; z < size; z++) {
    const fz = z / denom;
    for (let y = 0; y < size; y++) {
      const fy = y / denom;
      for (let x = 0; x < size; x++) {
        const fx = x / denom;
        let val = 0.0;
        for (let i = 0; i < numBlobs; i++) {
          const blobx = blobParams[i * 4 + 0];
          const bloby = blobParams[i * 4 + 1];
          const blobz = blobParams[i * 4 + 2];
          const strength = blobParams[i * 4 + 3];
          const dx = fx - blobx;
          const dy = fy - bloby;
          const dz = fz - blobz;
          const distSq = dx*dx + dy*dy + dz*dz;
          const v = strength / (0.000001 + distSq) - 12.0;
          if (v > 0.0) val += v;
        }
        // Floor
        const floorVal = 2.0 / (0.0001 + fy*fy) - 12.0;
        if (floorVal > 0.0) val += floorVal;

        field[z * size * size + y * size + x] = val;
      }
    }
  }

  return field;
}
