import * as THREE from 'three';

const vertexShader = /* glsl */ `
  attribute float ribbonAcross;
  attribute float ribbonAlong;

  varying float vAcross;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vAcross = ribbonAcross;
    vAlong = ribbonAlong;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying float vAcross;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  uniform vec3 uCameraPosition;
  uniform float uRainbowIntensity;
  uniform float uOilSlickIntensity;
  uniform float uFiberDensity;
  uniform int uLook;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 2.7);
    float widthHue = vAcross * 0.5 + 0.5;
    float fibers = 0.5 + 0.5 * sin((widthHue * uFiberDensity + vAlong * 0.65) * 6.2831853);
    float micro = smoothstep(0.18, 0.88, fibers);
    vec3 rainbow = hsv2rgb(vec3(widthHue + fresnel * 0.18, 0.92, 1.0));
    vec3 oil = hsv2rgb(vec3(widthHue * 0.7 + fresnel * 0.55 + vAlong * 0.05, 0.78, 1.0));
    vec3 base = mix(vec3(0.88, 0.92, 1.0), rainbow, uRainbowIntensity);

    if (uLook == 1) {
      base = mix(base, oil, uOilSlickIntensity);
      base *= 0.72 + micro * 0.38;
    } else if (uLook == 2) {
      base = mix(vec3(0.86, 0.82, 0.72), vec3(1.0), fresnel * 0.5);
    } else if (uLook == 3) {
      base = mix(vec3(0.05, 0.75, 1.0), rainbow, 0.7) * (0.75 + micro * 0.5);
    }

    float light = 0.28 + max(dot(n, normalize(vec3(-0.3, 0.75, 0.6))), 0.0) * 0.8;
    vec3 specular = vec3(pow(max(dot(reflect(-viewDir, n), normalize(vec3(-0.3, 0.75, 0.6))), 0.0), 34.0));
    gl_FragColor = vec4(base * light + specular * 0.55 + base * fresnel * 0.4, 1.0);
  }
`;

export function createRibbonMaterial(options: {
  look: number;
  rainbowIntensity: number;
  oilSlickIntensity: number;
  fiberDensity: number;
}) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    uniforms: {
      uCameraPosition: { value: new THREE.Vector3() },
      uRainbowIntensity: { value: options.rainbowIntensity },
      uOilSlickIntensity: { value: options.oilSlickIntensity },
      uFiberDensity: { value: options.fiberDensity },
      uLook: { value: options.look },
    },
  });
}
