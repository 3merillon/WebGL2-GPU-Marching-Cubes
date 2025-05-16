#version 300 es
precision highp float;
in vec4 v_color;
in vec3 v_normal;
uniform vec4 u_ambientUp;
uniform vec4 u_ambientDown;
uniform vec3 u_lightDir;
uniform vec4 u_lightColor;
in vec3 v_eyeDir;
out vec4 outColor;
void main(void) {
  float light = max(0.0, dot(normalize(u_lightDir), v_normal)); 
  vec4 ambient = mix(u_ambientDown, u_ambientUp, (v_normal.y + 1.0)/2.0);
  // Gamma correction approximation
  vec4 finalColor = sqrt(ambient + light * u_lightColor);
  finalColor.w = 1.0;
  outColor = finalColor;
}