import fullscreenQuadVert from './shaders/fullscreen_quad.vert?raw';
import gpuFieldGenTiledFrag from './shaders/gpu_field_gen.frag?raw';

export class GpuFieldGenerator {
    private gl: WebGL2RenderingContext;
    private program: WebGLProgram;
    private framebuffer: WebGLFramebuffer;
    public tiledTexture: WebGLTexture;
    public gridSize: number;
    public tilesX: number;
    public tilesY: number;
    public texWidth: number;
    public texHeight: number;
    private quadVAO: WebGLVertexArrayObject;

    constructor(gl: WebGL2RenderingContext, gridSize: number) {
        this.gl = gl;
        this.gridSize = gridSize;

        if (gridSize === 16)      { this.tilesX = 4; this.tilesY = 4; }
        else if (gridSize === 32) { this.tilesX = 8; this.tilesY = 4; }
        else if (gridSize === 64) { this.tilesX = 8; this.tilesY = 8; }
        else if (gridSize === 128){ this.tilesX = 8; this.tilesY = 16; }
        else throw new Error('Unsupported grid size for tiling');

        this.texWidth = this.tilesX * gridSize;
        this.texHeight = this.tilesY * gridSize;

        this.program = this.createProgram(
            this.compileShader(gl.VERTEX_SHADER, fullscreenQuadVert),
            this.compileShader(gl.FRAGMENT_SHADER, gpuFieldGenTiledFrag)
        );
        this.quadVAO = this.createQuadVAO();

        this.framebuffer = gl.createFramebuffer()!;
        this.tiledTexture = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, this.tiledTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, this.texWidth, this.texHeight, 0, gl.RED, gl.FLOAT, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    generateField(numBlobs: number, time: number): WebGLTexture {
        const gl = this.gl;
        const blobParams = new Float32Array(numBlobs * 4);
        for (let i = 0; i < numBlobs; i++) {
            const idx = i * 4;
            blobParams[idx + 0] = Math.sin(i + 1.26 * time * (1.03 + 0.5*Math.cos(0.21 * i))) * 0.27 + 0.5;
            blobParams[idx + 1] = Math.abs(Math.cos(i + 1.12 * time * Math.cos(1.22 + 0.1424 * i))) * 0.77;
            blobParams[idx + 2] = Math.cos(i + 1.32 * time * 0.1*Math.sin((0.92 + 0.53 * i))) * 0.27 + 0.5;
            const strength = 1.2 / ((Math.sqrt(numBlobs)- 1) / 4 + 1);
            blobParams[idx + 3] = strength;
        }

        gl.useProgram(this.program);
        gl.uniform1f(gl.getUniformLocation(this.program, "u_time"), time);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_numBlobs"), numBlobs);
        gl.uniform4fv(gl.getUniformLocation(this.program, "u_blobParams"), blobParams);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_tilesX"), this.tilesX);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_tilesY"), this.tilesY);
        gl.uniform1i(gl.getUniformLocation(this.program, "u_gridSize"), this.gridSize);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        gl.viewport(0, 0, this.texWidth, this.texHeight);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tiledTexture, 0);

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindVertexArray(this.quadVAO);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);

        return this.tiledTexture;
    }

    private createQuadVAO(): WebGLVertexArrayObject {
        const gl = this.gl;
        const vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);
        const vertexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        const vertices = new Float32Array([
            -1.0, -1.0,
            1.0, -1.0,
            -1.0,  1.0,
            1.0,  1.0
        ]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        const posLoc = gl.getAttribLocation(this.program, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindVertexArray(null);
        return vao;
    }

    private compileShader(type: number, source: string): WebGLShader {
        const gl = this.gl;
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Shader compilation error: ' + info);
        }
        return shader;
    }

    private createProgram(vertShader: WebGLShader, fragShader: WebGLShader): WebGLProgram {
        const gl = this.gl;
        const program = gl.createProgram()!;
        gl.attachShader(program, vertShader);
        gl.attachShader(program, fragShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Program link error: ' + info);
        }
        return program;
    }

    dispose() {
        const gl = this.gl;
        gl.deleteProgram(this.program);
        gl.deleteFramebuffer(this.framebuffer);
        gl.deleteTexture(this.tiledTexture);
        gl.deleteVertexArray(this.quadVAO);
    }
}