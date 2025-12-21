import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec4 iMouse;
  uniform float uZoom;
  uniform float uCamDist;
  uniform float uYaw;
  uniform float uPitch;

  varying vec2 vUv;

  #define PI 3.14159265359

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  mat2 rot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  // Rose SDF
  float roseRadius(float y, float a) {
    float open = smoothstep(-0.35, 0.28, y);
    float close = smoothstep(0.62, 0.18, y);
    float base = mix(0.10, 0.44, open) * close;

    float pet = 0.12 * sin(7.0 * (a + 2.1 * y));
    pet *= smoothstep(0.05, 0.75, open);

    float ripple = 0.03 * sin(14.0 * (a - 1.2 * y));
    ripple *= (1.0 - open) * smoothstep(0.65, 0.05, y);

    return base * (1.0 + pet) + ripple;
  }

  float mapDetail(vec3 p) {
    float y = p.y - 0.25;
    float a = atan(p.z, p.x);
    float r = length(p.xz);

    float rad = roseRadius(y, a);
    float bloom = r - rad;
    bloom = max(bloom, abs(y) - 0.62);

    vec3 b = p - vec3(0.0, 0.25, 0.0);
    float rr = length(b);
    float swirl = atan(b.z, b.x) + 1.4 * b.y;
    float bud = rr - (0.30 + 0.025 * sin(8.0 * swirl) * smoothstep(0.0, 0.35, rr));
    bloom = min(bloom, bud);

    float tipIndent = length(vec2(r, y - .60)) - 0.51;
    bloom = max(bloom, -tipIndent);

    vec3 s = p - vec3(0.0, -0.55, 0.0);
    float stem = max(length(s.xz) - 0.055, abs(s.y) - 0.75);

    return min(bloom, stem);
  }

  float mapProxy(vec3 p) {
    return mapDetail(p) - 0.03;
  }

  vec3 calcNormal(vec3 p) {
    vec2 e = vec2(2.2e-3, 0.0);
    float d = mapDetail(p);
    vec3 n = d - vec3(
      mapDetail(p - e.xyy),
      mapDetail(p - e.yxy),
      mapDetail(p - e.yyx)
    );
    return normalize(n);
  }

  vec3 env(vec3 rd) {
    float t = clamp(0.5 * (rd.y + 1.0), 0.0, 1.0);
    vec3 sky = mix(vec3(0.02, 0.01, 0.04), vec3(0.13, 0.15, 0.30), t);

    vec3 sunDir = normalize(vec3(0.35, 0.7, 0.2));
    float sun = pow(max(dot(rd, sunDir), 0.0), 520.0);
    sky += sun * vec3(1.2, 1.0, 0.95);

    float band = smoothstep(-0.25, 0.55, rd.y) * smoothstep(0.85, -0.15, rd.y);
    sky += band * 0.08 * (0.6 + 0.4 * sin(iTime * 0.22 + rd.x * 2.0)) * vec3(0.55, 0.25, 0.85);

    return sky;
  }

  vec3 vibeHue(float x) {
    return 0.55 + 0.45 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67)));
  }

  vec3 roseVibe(vec3 ro, vec3 rd, vec2 fragCoord) {
    float t = iTime + hash12(fragCoord) / 60.0;
    mat2 R = mat2(cos(sin(t * 0.5) * 0.785 + vec4(0.0, 33.0, 11.0, 0.0)));
    vec2 attract = vec2(0.18 + sin(t) * 0.25, 0.30 + sin(t + t) * 0.16);

    vec3 acc = vec3(0.0);
    float d = 0.0;
    float m = 1.0;

    for (int i = 0; i < 42; i++) {
      vec3 P = ro + rd * d;
      float roseD = mapProxy(P);
      float inside = smoothstep(0.10, -0.02, roseD);
      float edge = exp(-abs(roseD) * 18.0);

      vec3 k = P;
      float pd = 1.0 + 0.24 * d;
      k.xy *= pd;
      k.xz *= R;
      if (k.y < -0.65) {
        k.y = -k.y - 1.05;
        m = 0.55;
      }

      float l = length(k.xy - attract);
      vec3 cell = fract(k * 2.3) - 0.5;
      float lattice = 0.9 - length(abs(cell) - 0.16);
      float swirl = sin(1.6 * l + 0.8 * t);
      float field = max(lattice, swirl);

      float boundary = length(k) - 2.0;
      float g = max(field, boundary);

      float s = 0.017 + 0.072 * abs(g - float(i) / 180.0);
      s += 0.010 * clamp(abs(roseD), 0.0, 1.0);

      vec3 hue = vibeHue(0.07 * float(i) + 0.10 * t + 0.12 / (l + 0.10));
      float dens = (0.70 * inside + 0.30 * edge) / (0.80 + 1.05 * l);
      dens *= 1.0 / (98.0 * s + 1.0);

      acc += hue * dens;
      d += s;
      if (d > 9.0) break;
    }

    acc = tanh(acc * acc * 0.60) * m;
    return acc;
  }

  // Iridescent smoke inside sphere (bottom)
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);

    float n000 = hash13(i + vec3(0, 0, 0));
    float n100 = hash13(i + vec3(1, 0, 0));
    float n010 = hash13(i + vec3(0, 1, 0));
    float n110 = hash13(i + vec3(1, 1, 0));
    float n001 = hash13(i + vec3(0, 0, 1));
    float n101 = hash13(i + vec3(1, 0, 1));
    float n011 = hash13(i + vec3(0, 1, 1));
    float n111 = hash13(i + vec3(1, 1, 1));

    float nx00 = mix(n000, n100, f.x);
    float nx10 = mix(n010, n110, f.x);
    float nx01 = mix(n001, n101, f.x);
    float nx11 = mix(n011, n111, f.x);
    float nxy0 = mix(nx00, nx10, f.y);
    float nxy1 = mix(nx01, nx11, f.y);
    return mix(nxy0, nxy1, f.z);
  }

  float fbm2(vec3 p) {
    float s = 0.0;
    s += 0.60 * vnoise(p);
    p = p * 2.02 + 11.7;
    s += 0.28 * vnoise(p);
    p = p * 2.03 + 19.3;
    s += 0.12 * vnoise(p);
    return s;
  }

  float smokeDensity(vec3 p, vec3 sphC, float sphR) {
    vec3 q = p - sphC;

    float bottom = smoothstep(0.10 * sphR, -0.78 * sphR, q.y);
    bottom = pow(bottom, 1.8);

    float keepCenter = smoothstep(0.04 * sphR, 0.20 * sphR, q.y);
    keepCenter = mix(1.0, 0.35, keepCenter);

    float wall = smoothstep(0.995 * sphR, 0.74 * sphR, length(q));

    float t = iTime;
    mat2 R = mat2(cos(sin(t * 0.5) * 0.785 + vec4(0.0, 33.0, 11.0, 0.0)));

    vec3 k = q;
    k.xz *= R;
    if (k.y < -0.55 * sphR) k.y = -k.y - 0.90 * sphR;

    vec2 attract = vec2(0.12 + sin(t) * 0.18, 0.18 + sin(t + t) * 0.12);
    float l = length(k.xz - attract);

    vec3 g = fract(k * 3.4) - 0.5;
    float lattice = 0.9 - length(abs(g) - 0.18);
    float ripple = sin(2.0 * l + 0.8 * t + 1.7 * q.y);

    vec3 wp = q * 2.6 + vec3(0.28 * t, 0.06 * t, -0.20 * t);
    float n = fbm2(wp);
    float wisps = fbm2(wp * 1.7 + vec3(4.0, -2.0, 1.0));

    float blanket = smoothstep(0.30, 0.90, n);
    float structured = smoothstep(0.15, 0.85, 0.55 * lattice + 0.45 * ripple);

    float d = (0.70 * blanket + 0.30 * structured);
    d *= (0.70 + 0.30 * wisps);

    d *= bottom * wall * keepCenter;
    d = clamp(d, 0.0, 1.0);

    d = pow(d, 0.75);
    return d;
  }

  vec3 smokeColor(float d, vec3 q) {
    float a = atan(q.z, q.x);
    float hueDrive = 0.16 * iTime + 0.55 * d + 0.18 * q.y + 0.09 * a;
    vec3 iri = vibeHue(hueDrive);

    vec3 milky = vec3(0.86, 0.86, 0.90);
    vec3 base = mix(milky, iri, 0.65);

    base *= mix(0.85, 1.05, smoothstep(-0.85, -0.15, q.y));
    return base;
  }

  bool raySphere(vec3 ro, vec3 rd, vec3 c, float r, out float t0, out float t1) {
    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float cc = dot(oc, oc) - r * r;
    float h = b * b - cc;
    if (h < 0.0) return false;
    h = sqrt(h);
    t0 = -b - h;
    t1 = -b + h;
    if (t1 < 0.0) return false;
    t0 = max(t0, 0.0);
    return true;
  }

  void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 0.18, uCamDist);
    float yaw = uYaw + 0.18 * sin(iTime * 0.20);
    float pitch = uPitch;
    ro.xz = rot(yaw) * ro.xz;
    ro.y += pitch;

    vec3 ta = vec3(0.0, 0.20, 0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(vec3(0, 1, 0), ww));
    vec3 vv = cross(ww, uu);

    vec3 rdBg = normalize(uu * uv.x + vv * uv.y + ww * uZoom);

    float PIX = 3.0;
    vec2 fcR = floor(fragCoord / PIX) * PIX + 0.5;
    vec2 uvR = (fcR - 0.5 * iResolution.xy) / iResolution.y;
    vec3 rdRoseBase = normalize(uu * uvR.x + vv * uvR.y + ww * uZoom);

    vec3 vibe = roseVibe(ro, rdBg, fragCoord);
    vec3 col = vec3(0.0);
    float alpha = 0.0;

    vec3 hp = vec3(0.0);
    float tHit = 0.0;
    bool hit = false;
    float maxT = max(4.0, length(ro) + 1.5);
    for (int i = 0; i < 56; i++) {
      vec3 p = ro + rdRoseBase * tHit;
      if (tHit > maxT) break;

      float dp = mapProxy(p);
      if (dp > 0.40) {
        tHit += dp;
        continue;
      }

      float d = mapDetail(p);
      if (abs(d) < 0.0025) {
        hp = p;
        hit = true;
        break;
      }

      tHit += max(0.02, abs(d) * 0.9);
    }

    if (hit) {
      float VOX = 0.03;
      vec3 hq = floor(hp / VOX + 0.5) * VOX;

      vec3 n = calcNormal(hq);
      vec3 V = normalize(ro - hp);
      float NoV2 = clamp(dot(n, V), 0.0, 1.0);

      vec3 L = normalize(vec3(0.35, 0.7, 0.2));
      float diff = max(dot(n, L), 0.0);
      float levels = 5.0;
      diff = floor(diff * levels) / levels;

      float y = hp.y - 0.25;
      float a = atan(hp.z, hp.x);
      float pet = 0.5 + 0.5 * sin(7.0 * (a + 2.1 * y));
      float petBand = smoothstep(0.25, 0.95, pet);

      vec3 roseBase = vec3(0.95, 0.93, 0.98);
      vec3 roseTint = vec3(1.00, 0.62, 0.80);
      vec3 roseCol = mix(roseBase, roseTint, 0.22 * petBand);

      roseCol *= (0.28 + 0.90 * diff);
      float edge = pow(1.0 - NoV2, 2.8);
      roseCol *= (1.0 - 0.35 * edge);

      vec3 iri = vibeHue(0.12 * iTime + 0.10 * a + 0.25 * y);
      roseCol += iri * (0.24 * pow(1.0 - NoV2, 2.2));

      float dth = hash12(floor(fragCoord / PIX));
      roseCol += (dth - 0.5) / 180.0;
      roseCol += vibe * 0.15;

      col = roseCol;
      alpha = 1.0;
    }

    col = col / (1.0 + col);
    col = pow(col, vec3(0.95));

    gl_FragColor = vec4(col, alpha);
  }
`;

type IridescentRoseProps = {
  position?: [number, number, number];
  scale?: number;
  zoom?: number;
  camDist?: number;
};

export default function IridescentRose({
  position = [0, 0.8, 0],
  scale = 0.6,
  zoom = 1.35,
  camDist = 2.85,
}: IridescentRoseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, gl, camera } = useThree();
  const planeSize = 1;
  const quadScale = scale * (2 / planeSize);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const camToRose = useMemo(() => new THREE.Vector3(), []);

  const uniforms = useMemo(
    () => ({
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector4(0, 0, 0, 0) },
      uZoom: { value: zoom },
      uCamDist: { value: camDist },
      uYaw: { value: 0 },
      uPitch: { value: 0 },
    }),
    [zoom, camDist],
  );

  useEffect(() => {
    const dpr = gl.getPixelRatio();
    uniforms.iResolution.value.set(size.width * dpr, size.height * dpr, 1);
  }, [size.width, size.height, gl, uniforms]);

  useFrame((state) => {
    uniforms.iTime.value = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.getWorldPosition(worldPos);
      camToRose.copy(camera.position).sub(worldPos);
      const horiz = Math.max(
        0.001,
        Math.sqrt(camToRose.x * camToRose.x + camToRose.z * camToRose.z),
      );
      uniforms.uYaw.value = Math.atan2(-camToRose.x, camToRose.z);
      uniforms.uPitch.value = camToRose.y - 0.18;
      uniforms.uCamDist.value = horiz;
      const cameraZoom = (camera as THREE.PerspectiveCamera).zoom ?? 1;
      uniforms.uZoom.value = zoom * cameraZoom;

      uniforms.iMouse.value.set(
        (state.pointer.x * 0.5 + 0.5) * uniforms.iResolution.value.x,
        (state.pointer.y * 0.5 + 0.5) * uniforms.iResolution.value.y,
        0,
        0,
      );
      meshRef.current.quaternion.copy(camera.quaternion);
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={quadScale}>
      <planeGeometry args={[planeSize, planeSize]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}
