#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_eyeDir;
flat in vec3 v_flatNormal;
out vec4 outColor;

// Hardcoded uniforms from CPU shader
const vec4 u_ambientUp   = vec4(0.05, 0.1, 0.2, 1.0);
const vec4 u_ambientDown = vec4(0.19, 0.32, 0.11, 1.0);
const vec3 u_lightDir    = normalize(vec3(-1.0, 1.0, 1.0));
const vec4 u_lightColor  = vec4(0.8, 0.7, 0.6, 1.0);

void main(void) {
  vec3 normal = normalize(v_normal);

  float light = max(0.0, dot(u_lightDir, normal));
  float glare = max(0.0, dot(normal, normalize(v_eyeDir + u_lightDir)));
  glare = pow(glare, 6.0);

  // Interpolated ambient
  vec4 ambient = mix(u_ambientDown, u_ambientUp, (normal.y + 1.0) / 2.0);

  // Gamma correction approximation (sqrt)
  vec4 finalColor = sqrt(ambient + light * u_lightColor + glare);
  finalColor.w = 1.0;
  outColor = finalColor;
}