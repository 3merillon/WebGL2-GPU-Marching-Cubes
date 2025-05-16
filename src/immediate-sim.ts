export class ImmSim {
  private gl: WebGL2RenderingContext;
  private attribs: any;
  private posBuf: WebGLBuffer;
  private normalBuf: WebGLBuffer;
  private uvBuf: WebGLBuffer;
  private colorBuf: WebGLBuffer;

  private maxCount = 4096;
  private posArray = new Float32Array(this.maxCount * 3);
  private normalArray = new Float32Array(this.maxCount * 3);
  private uvArray = new Float32Array(this.maxCount * 2);
  private colorArray = new Float32Array(this.maxCount * 4);

  private count = 0;
  private prim = 0;
  private primsize = 0;
  private hasPos = false;
  private hasNormal = false;
  private hasUV = false;
  private hasColor = false;
  private program: WebGLProgram | null = null;

  constructor(gl: WebGL2RenderingContext, attribs: any) {
    this.gl = gl;
    this.attribs = attribs;
    this.posBuf = gl.createBuffer()!;
    this.normalBuf = gl.createBuffer()!;
    this.uvBuf = gl.createBuffer()!;
    this.colorBuf = gl.createBuffer()!;
  }

  begin(primitive: number, p_program: WebGLProgram) {
    this.prim = primitive;
    switch (this.prim) {
      case this.gl.TRIANGLES: this.primsize = 3; break;
      case this.gl.LINES: this.primsize = 2; break;
      case this.gl.POINTS: this.primsize = 1; break;
      default: this.primsize = 1; break;
    }
    this.program = p_program;
    this.count = 0;
    this.hasPos = this.hasNormal = this.hasUV = this.hasColor = false;
  }

  end() {
    if (this.count === 0) return;
    for (let i = this.count * 3; i < this.posArray.length; i++) this.posArray[i] = 0.0;
    this.draw();
  }

  draw() {
    const gl = this.gl;
    if (this.hasPos) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.posArray, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.attribs.position);
      gl.vertexAttribPointer(this.attribs.position, 3, gl.FLOAT, false, 0, 0);
    }
    if (this.hasNormal && this.attribs.normal !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.normalArray, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.attribs.normal);
      gl.vertexAttribPointer(this.attribs.normal, 3, gl.FLOAT, false, 0, 0);
    }
    if (this.hasUV && this.attribs.uv !== undefined && this.attribs.uv !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvArray.subarray(0, this.count * 2), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.attribs.uv);
      gl.vertexAttribPointer(this.attribs.uv, 2, gl.FLOAT, false, 0, 0);
    }
    if (this.hasColor && this.attribs.color !== undefined && this.attribs.color !== -1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuf);
      gl.bufferData(gl.ARRAY_BUFFER, this.colorArray.subarray(0, this.count * 4), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.attribs.color);
      gl.vertexAttribPointer(this.attribs.color, 4, gl.FLOAT, false, 0, 0);
    }
    gl.drawArrays(this.prim, 0, this.count);
    this.count = 0;
  }

  pos(x: number, y: number, z: number) {
    this.posArray[this.count * 3 + 0] = x;
    this.posArray[this.count * 3 + 1] = y;
    this.posArray[this.count * 3 + 2] = z;
    this.hasPos = true;
  }
  posv(vec: [number, number, number]) {
    this.posArray[this.count * 3 + 0] = vec[0];
    this.posArray[this.count * 3 + 1] = vec[1];
    this.posArray[this.count * 3 + 2] = vec[2];
    this.hasPos = true;
  }
  posvoff(vec: number[], offset: number) {
    this.posArray[this.count * 3 + 0] = vec[0 + offset];
    this.posArray[this.count * 3 + 1] = vec[1 + offset];
    this.posArray[this.count * 3 + 2] = vec[2 + offset];
    this.hasPos = true;
  }

  posnormvoff(pos: number[], norm: number[], offset: number) {
    this.posArray[this.count * 3 + 0] = pos[0 + offset];
    this.posArray[this.count * 3 + 1] = pos[1 + offset];
    this.posArray[this.count * 3 + 2] = pos[2 + offset];
    this.normalArray[this.count * 3 + 0] = norm[0 + offset];
    this.normalArray[this.count * 3 + 1] = norm[1 + offset];
    this.normalArray[this.count * 3 + 2] = norm[2 + offset];
    this.hasPos = true;
    this.hasNormal = true;
  }

  posnormtriv(pos: Float32Array, norm: Float32Array, o1: number, o2: number, o3: number) {
    let c = this.count * 3;
    this.posArray[c + 0] = pos[o1 + 0];
    this.posArray[c + 1] = pos[o1 + 1];
    this.posArray[c + 2] = pos[o1 + 2];
    this.posArray[c + 3] = pos[o2 + 0];
    this.posArray[c + 4] = pos[o2 + 1];
    this.posArray[c + 5] = pos[o2 + 2];
    this.posArray[c + 6] = pos[o3 + 0];
    this.posArray[c + 7] = pos[o3 + 1];
    this.posArray[c + 8] = pos[o3 + 2];
    this.normalArray[c + 0] = norm[o1 + 0];
    this.normalArray[c + 1] = norm[o1 + 1];
    this.normalArray[c + 2] = norm[o1 + 2];
    this.normalArray[c + 3] = norm[o2 + 0];
    this.normalArray[c + 4] = norm[o2 + 1];
    this.normalArray[c + 5] = norm[o2 + 2];
    this.normalArray[c + 6] = norm[o3 + 0];
    this.normalArray[c + 7] = norm[o3 + 1];
    this.normalArray[c + 8] = norm[o3 + 2];
    this.hasPos = true;
    this.hasNormal = true;
    this.count += 3;
    if (this.count >= this.maxCount - 3) this.draw();
  }

  normal(x: number, y: number, z: number) {
    this.normalArray[this.count * 3] = x;
    this.normalArray[this.count * 3 + 1] = y;
    this.normalArray[this.count * 3 + 2] = z;
    this.hasNormal = true;
  }
  normalv(vec: [number, number, number]) {
    this.normalArray[this.count * 3] = vec[0];
    this.normalArray[this.count * 3 + 1] = vec[1];
    this.normalArray[this.count * 3 + 2] = vec[2];
    this.hasNormal = true;
  }

  uv(u: number, v: number) {
    this.uvArray[this.count * 2] = u;
    this.uvArray[this.count * 2 + 1] = v;
    this.hasUV = true;
  }
  uvv(vec: [number, number]) {
    this.uvArray[this.count * 2] = vec[0];
    this.uvArray[this.count * 2 + 1] = vec[1];
    this.hasUV = true;
  }

  color(r: number, g: number, b: number, a: number) {
    this.colorArray[this.count * 4 + 0] = r;
    this.colorArray[this.count * 4 + 1] = g;
    this.colorArray[this.count * 4 + 2] = b;
    this.colorArray[this.count * 4 + 3] = a;
    this.hasColor = true;
  }
  colorv(vec: [number, number, number, number]) {
    this.colorArray[this.count * 4 + 0] = vec[0];
    this.colorArray[this.count * 4 + 1] = vec[1];
    this.colorArray[this.count * 4 + 2] = vec[2];
    this.colorArray[this.count * 4 + 3] = vec[3];
    this.hasColor = true;
  }

  next() {
    this.count++;
    if (this.count >= this.maxCount - 3) {
      if ((this.count % this.primsize) === 0) this.draw();
    }
  }
}
