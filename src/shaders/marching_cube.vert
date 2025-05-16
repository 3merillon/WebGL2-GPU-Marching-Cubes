#version 300 es
precision highp float;
in vec3 position;
in vec3 normal;
uniform mat4 u_worldviewproj;
uniform mat4 u_worldview;
uniform mat4 u_world;
out vec4 v_color;
out vec3 v_normal;
out vec3 v_eyeDir;
void main(void) {
  v_color = vec4(position.x + 0.5, position.y + 0.5, position.z + 0.5, 1.0);
  v_normal = (u_world * vec4(normalize(normal), 0.0)).xyz;
  v_eyeDir = -normalize((u_worldview * vec4(position, 1.0)).xyz);
  gl_Position = u_worldviewproj * vec4(position, 1.0);
}
