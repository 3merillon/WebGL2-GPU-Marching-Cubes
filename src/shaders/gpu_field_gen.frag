#version 300 es
precision highp float;
out float outField;

uniform float u_time;
uniform int u_numBlobs;
uniform vec4 u_blobParams[100];

uniform int u_tilesX;
uniform int u_tilesY;
uniform int u_gridSize;

void main() {
    // Figure out which tile (slice) and which position in the tile
    ivec2 fragXY = ivec2(gl_FragCoord.xy);
    int tileW = u_gridSize;
    int tileH = u_gridSize;

    int tileX = fragXY.x / tileW;
    int tileY = fragXY.y / tileH;
    int z = tileY * u_tilesX + tileX;

    int x = fragXY.x % tileW;
    int y = fragXY.y % tileH;

    if (x >= u_gridSize || y >= u_gridSize || z >= u_gridSize)
        discard;

    float fx = float(x) / float(u_gridSize - 1);
    float fy = float(y) / float(u_gridSize - 1);
    float fz = float(z) / float(u_gridSize - 1);

    float field = 0.0;
    for (int i = 0; i < u_numBlobs; i++) {
        if (i >= 100) break;
        vec3 blobPos = u_blobParams[i].xyz;
        float strength = u_blobParams[i].w;
        float dx = fx - blobPos.x;
        float dy = fy - blobPos.y;
        float dz = fz - blobPos.z;
        float distSq = dx*dx + dy*dy + dz*dz;
        float val = strength / (0.000001 + distSq) - 12.0;
        if (val > 0.0) field += val;
    }
    float floorVal = 2.0 / (0.0001 + fy*fy) - 12.0;
    if (floorVal > 0.0) {
        field += floorVal;
    }
    outField = field;
}