#version 300 es
precision highp float;
precision highp sampler2D;

layout(location = 0) in uint voxelIndex;
layout(location = 1) in uint triIdx;
layout(location = 2) in uint triVertIdx;

uniform int gridSize;
uniform float isoLevel;
uniform mat4 u_worldviewproj;
uniform mat4 u_world;
uniform sampler2D fieldTex2D;
uniform sampler2D triTableTex;
uniform int tilesX;

out vec3 v_normal;
out vec3 v_eyeDir;
flat out vec3 v_flatNormal;

float fetchField(int x, int y, int z) {
    int tileX = z % tilesX;
    int tileY = z / tilesX;
    int u = tileX * gridSize + x;
    int v = tileY * gridSize + y;
    return texelFetch(fieldTex2D, ivec2(u, v), 0).r;
}

vec3 calculateNormal(ivec3 pos, int N) {
    float gx, gy, gz;
    if (pos.x > 0 && pos.x < N) {
        gx = fetchField(pos.x-1, pos.y, pos.z) - fetchField(pos.x+1, pos.y, pos.z);
    } else if (pos.x == 0) {
        gx = fetchField(pos.x, pos.y, pos.z) - fetchField(pos.x+1, pos.y, pos.z);
    } else {
        gx = fetchField(pos.x-1, pos.y, pos.z) - fetchField(pos.x, pos.y, pos.z);
    }
    if (pos.y > 0 && pos.y < N) {
        gy = fetchField(pos.x, pos.y-1, pos.z) - fetchField(pos.x, pos.y+1, pos.z);
    } else if (pos.y == 0) {
        gy = fetchField(pos.x, pos.y, pos.z) - fetchField(pos.x, pos.y+1, pos.z);
    } else {
        gy = fetchField(pos.x, pos.y-1, pos.z) - fetchField(pos.x, pos.y, pos.z);
    }
    if (pos.z > 0 && pos.z < N) {
        gz = fetchField(pos.x, pos.y, pos.z-1) - fetchField(pos.x, pos.y, pos.z+1);
    } else if (pos.z == 0) {
        gz = fetchField(pos.x, pos.y, pos.z) - fetchField(pos.x, pos.y, pos.z+1);
    } else {
        gz = fetchField(pos.x, pos.y, pos.z-1) - fetchField(pos.x, pos.y, pos.z);
    }
    return vec3(gx, gy, gz);
}

void main() {
    int N = gridSize - 1;
    int v = int(voxelIndex);
    int z = v / (N*N);
    int y = (v / N) % N;
    int x = v % N;

    float f[8];
    f[0] = fetchField(x,   y,   z  );
    f[1] = fetchField(x+1, y,   z  );
    f[2] = fetchField(x+1, y+1, z  );
    f[3] = fetchField(x,   y+1, z  );
    f[4] = fetchField(x,   y,   z+1);
    f[5] = fetchField(x+1, y,   z+1);
    f[6] = fetchField(x+1, y+1, z+1);
    f[7] = fetchField(x,   y+1, z+1);

    int cubeindex = 0;
    if (f[0] < isoLevel) cubeindex |= 1;
    if (f[1] < isoLevel) cubeindex |= 2;
    if (f[2] < isoLevel) cubeindex |= 4;
    if (f[3] < isoLevel) cubeindex |= 8;
    if (f[4] < isoLevel) cubeindex |= 16;
    if (f[5] < isoLevel) cubeindex |= 32;
    if (f[6] < isoLevel) cubeindex |= 64;
    if (f[7] < isoLevel) cubeindex |= 128;

    int t = int(triIdx) * 3;
    int tx0 = (t + 0) % 16;
    int tx1 = (t + 1) % 16;
    int tx2 = (t + 2) % 16;
    int ty = cubeindex;
    int edge0 = int(texelFetch(triTableTex, ivec2(tx0, ty), 0).r * 255.0 + 0.5);
    int edge1 = int(texelFetch(triTableTex, ivec2(tx1, ty), 0).r * 255.0 + 0.5);
    int edge2 = int(texelFetch(triTableTex, ivec2(tx2, ty), 0).r * 255.0 + 0.5);

    if (edge0 == 255 || edge1 == 255 || edge2 == 255) {
        gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // offscreen
        v_normal = vec3(0, 0, 1);
        v_flatNormal = vec3(0,0,1);
        return;
    }

    const ivec2 edgeVerts[12] = ivec2[12](
        ivec2(0,1), ivec2(1,2), ivec2(2,3), ivec2(3,0),
        ivec2(4,5), ivec2(5,6), ivec2(6,7), ivec2(7,4),
        ivec2(0,4), ivec2(1,5), ivec2(2,6), ivec2(3,7)
    );
    ivec3 cornerOffsets[8] = ivec3[8](
        ivec3(0,0,0), ivec3(1,0,0), ivec3(1,1,0), ivec3(0,1,0),
        ivec3(0,0,1), ivec3(1,0,1), ivec3(1,1,1), ivec3(0,1,1)
    );

    vec3 triPos[3];
    for (int i = 0; i < 3; ++i) {
        int edge = (i == 0) ? edge0 : (i == 1) ? edge1 : edge2;
        ivec2 ev = edgeVerts[edge];
        ivec3 p0 = ivec3(x,y,z) + cornerOffsets[ev.x];
        ivec3 p1 = ivec3(x,y,z) + cornerOffsets[ev.y];
        float v0 = f[ev.x];
        float v1 = f[ev.y];
        float t0 = (isoLevel - v0) / (v1 - v0 + 1e-8);
        vec3 pos0 = vec3(p0) / float(N) * 2.0 - 1.0;
        vec3 pos1 = vec3(p1) / float(N) * 2.0 - 1.0;
        triPos[i] = mix(pos0, pos1, t0);
    }

    vec3 e1 = triPos[1] - triPos[0];
    vec3 e2 = triPos[2] - triPos[0];
    v_flatNormal = normalize(cross(e1, e2));

    int currentEdge = (triVertIdx == 0u) ? edge0 : (triVertIdx == 1u) ? edge1 : edge2;
    ivec2 ev = edgeVerts[currentEdge];
    ivec3 p0 = ivec3(x,y,z) + cornerOffsets[ev.x];
    ivec3 p1 = ivec3(x,y,z) + cornerOffsets[ev.y];
    float v0 = f[ev.x];
    float v1 = f[ev.y];
    float t0 = (isoLevel - v0) / (v1 - v0 + 1e-8);
    vec3 pos0 = vec3(p0) / float(N) * 2.0 - 1.0;
    vec3 pos1 = vec3(p1) / float(N) * 2.0 - 1.0;
    vec3 pos = mix(pos0, pos1, t0);

    vec3 n0 = calculateNormal(p0, N);
    vec3 n1 = calculateNormal(p1, N);
    v_normal = normalize(mix(n0, n1, t0));
    v_eyeDir = -normalize((u_world * vec4(pos, 1.0)).xyz);

    gl_Position = u_worldviewproj * vec4(pos, 1.0);
}