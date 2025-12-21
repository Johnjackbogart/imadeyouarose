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

  // Simplified 2-octave fbm for better performance
  float fbm2(vec3 p) {
    float s = 0.0;
    s += 0.65 * vnoise(p);
    p = p * 2.02 + 13.7;
    s += 0.35 * vnoise(p);
    return s;
  }

  // Rose SDF (same geometry as IridescentRose)
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
    // Forward differences - 3 samples instead of 6
    vec2 e = vec2(0.002, 0.0);
    float d = mapDetail(p);
    vec3 n = d - vec3(
      mapDetail(p - e.xyy),
      mapDetail(p - e.yxy),
      mapDetail(p - e.yyx)
    );
    return normalize(n);
  }

  vec3 envCold(vec3 rd) {
    float t = clamp(0.5 * (rd.y + 1.0), 0.0, 1.0);
    vec3 sky = mix(vec3(0.01, 0.02, 0.05), vec3(0.12, 0.16, 0.34), t);

    vec3 glowDir = normalize(vec3(-0.4, 0.7, 0.25));
    float glow = pow(max(dot(rd, glowDir), 0.0), 120.0);
    sky += glow * vec3(0.55, 0.75, 1.25);

    float band = smoothstep(-0.25, 0.55, rd.y) * smoothstep(0.9, -0.2, rd.y);
    sky += band * 0.06 * vec3(0.55, 0.35, 0.95);

    return sky;
  }

  vec3 plasmaPalette(float x) {
    // Cold blue/purple spectrum
    vec3 a = vec3(0.15, 0.35, 0.95);
    vec3 b = vec3(0.55, 0.35, 0.95);
    vec3 c = vec3(0.25, 0.65, 1.15);
    return 0.55 + 0.45 * cos(6.28318 * (x + vec3(0.0, 0.33, 0.67))) * 0.35 +
      mix(a, b, 0.5 + 0.5 * sin(6.28318 * x)) * 0.45 +
      c * 0.10;
  }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  vec3 stormWings(vec3 ro, vec3 rd, vec2 fragCoord) {
    float t = iTime + hash12(fragCoord) / 60.0;
    // "Stormy torus" inspiration: rotating fold matrix
    mat2 R = mat2(cos(sin(t * 0.5) * 0.785 + vec4(0.0, 33.0, 11.0, 0.0)));

    vec3 acc = vec3(0.0);
    float d = 0.0;
    float occ = 0.0;

    // Centered around bloom
    vec3 C = vec3(0.0, 0.22, 0.0);

    for (int i = 0; i < 32; i++) {
      vec3 p = ro + rd * d;
      vec3 q = p - C;

      // Two counter-rotating "wings"
      vec3 q1 = q;
      vec3 q2 = q;
      q1.xz *= rot(t * 0.75);
      q2.xz *= rot(-t * 0.68);

      // Fold / mirror (storm-cell reflection vibe)
      float m = 1.0;
      if (q1.y < -0.65) {
        q1.y = -q1.y - 1.05;
        m = 0.65;
      }
      if (q2.y < -0.65) {
        q2.y = -q2.y - 1.05;
        m *= 0.7;
      }

      // Shared turbulence field
      vec3 k1 = q1;
      vec3 k2 = q2;

      // Use R from snippet as additional rotation in yz
      k1.yz *= R;
      k2.yz *= R;

      float n1 = fbm2(k1 * 2.15 + vec3(0.35 * t, 0.10 * t, -0.25 * t));
      float n2 = fbm2(k2 * 2.05 + vec3(-0.30 * t, 0.13 * t, 0.22 * t));

      // "Wing" shaping: torus + rippling twist band
      float a1 = atan(k1.z, k1.x);
      float a2 = atan(k2.z, k2.x);

      // Make them feel like wings (thicker on sides, thinner near top)
      float thickness1 = 0.09 + 0.05 * smoothstep(0.0, 1.0, sin(a1 * 2.0) * 0.5 + 0.5);
      float thickness2 = 0.09 + 0.05 * smoothstep(0.0, 1.0, sin(a2 * 2.0 + 1.2) * 0.5 + 0.5);

      // Vertical flutter in opposite phase
      k1.y += 0.18 * sin(a1 * 3.0 + t * 2.8) * (0.35 + 0.65 * n1);
      k2.y += 0.18 * sin(a2 * 3.0 - t * 2.6 + 1.3) * (0.35 + 0.65 * n2);

      float sd1 = sdTorus(k1, vec2(1.05, thickness1));
      float sd2 = sdTorus(k2, vec2(1.05, thickness2));

      // Field-like thickness modulation (stormy)
      sd1 += (n1 - 0.5) * 0.08;
      sd2 += (n2 - 0.5) * 0.08;

      float sd = min(sd1, sd2);

      // Step size: small near volume, larger far away
      float w = 0.012 + 0.055 * clamp(abs(sd) + 0.15, 0.0, 1.0);

      // Volumetric density around torus
      float dens = exp(-abs(sd) * 14.0);
      float fil = pow(max(0.0, sin(10.0 * (a1 + t) + 8.0 * n1)), 6.0);
      float fil2 = pow(max(0.0, sin(10.0 * (a2 - t) + 8.0 * n2)), 6.0);
      float lightning = max(fil, fil2);

      vec3 hue = plasmaPalette(0.10 * float(i) + 0.13 * t + 0.35 * (n1 + n2));
      hue = mix(hue, vec3(0.75, 0.90, 1.65), 0.45 * lightning);

      float weight = (0.55 + 0.45 * lightning) * (0.85 + 0.25 * sin(t + float(i) * 0.35));

      acc += hue * dens * weight * m;
      occ += dens * (0.6 + 0.4 * lightning) * m;

      d += w;
      if (d > 7.0) break;
    }

    // Compress and glow like the original snippet
    acc = tanh(acc * acc * 0.45);
    acc *= 1.4;

    return acc;
  }

  void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    vec3 ro = vec3(0.0, 0.18, uCamDist);
    float yaw = uYaw + 0.12 * sin(iTime * 0.20);
    float pitch = uPitch;
    ro.xz = rot(yaw) * ro.xz;
    ro.y += pitch;

    vec3 ta = vec3(0.0, 0.20, 0.0);
    vec3 ww = normalize(ta - ro);
    vec3 uu = normalize(cross(vec3(0, 1, 0), ww));
    vec3 vv = cross(ww, uu);

    vec3 rd = normalize(uu * uv.x + vv * uv.y + ww * uZoom);

    vec3 col = vec3(0.0);
    float alpha = 0.0;

    // Sphere tracing with smooth gradients - no pixelation
    vec3 hp = vec3(0.0);
    float tHit = 0.0;
    bool hit = false;
    float maxT = max(4.0, length(ro) + 1.5);
    
    // Optimized sphere tracing
    for (int i = 0; i < 48; i++) {
      vec3 p = ro + rd * tHit;
      if (tHit > maxT) break;

      float d = mapDetail(p);
      
      if (abs(d) < 0.002) {
        hp = p;
        hit = true;
        break;
      }

      // Larger steps for faster convergence
      tHit += d * 0.85;
    }

    vec3 aura = stormWings(ro, rd, fragCoord);

    // Strong vignette mask to avoid visible quad edges
    float vignette = smoothstep(1.12, 0.38, length(uv));

    if (hit) {
      vec3 n = calcNormal(hp);
      vec3 V = normalize(ro - hp);

      vec3 L = normalize(vec3(0.35, 0.7, 0.2));
      float diff = max(dot(n, L), 0.0);

      vec3 H = normalize(L + V);
      float spec = pow(max(dot(n, H), 0.0), 140.0);

      float fres = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 4.5);

      float y = hp.y - 0.25;
      float a = atan(hp.z, hp.x);

      // Roughness variation: wet steel streaks across petals
      float micro = fbm2(vec3(3.0 * a, 2.2 * y, iTime * 0.1));
      micro = smoothstep(0.25, 0.95, micro);

      float wet = 0.55 + 0.45 * micro;
      float specBoost = mix(0.8, 1.25, wet);

      vec3 baseSteel = vec3(0.035, 0.055, 0.10);
      vec3 tint = vec3(0.12, 0.10, 0.28);
      baseSteel = mix(baseSteel, tint, 0.35 * smoothstep(-0.2, 0.5, y));

      vec3 envR = envCold(reflect(-V, n));

      // Subtle petal banding to keep shape readable
      float pet = 0.5 + 0.5 * sin(7.0 * (a + 2.1 * y));
      float ridge = smoothstep(0.35, 0.98, pet);

      vec3 roseCol = baseSteel;
      roseCol *= (0.18 + 0.95 * diff);
      roseCol *= (0.85 + 0.25 * ridge);

      roseCol += envR * (0.25 + 0.85 * fres) * (0.55 + 0.45 * wet);
      roseCol += spec * vec3(0.55, 0.75, 1.15) * 1.35 * specBoost;

      // Cold rim glow
      roseCol += vec3(0.12, 0.35, 0.95) * pow(fres, 1.2) * 0.28;

      // Subtle film grain for visual interest without pixelation
      float grain = hash12(fragCoord + iTime * 60.0);
      roseCol += (grain - 0.5) * 0.008;

      col = roseCol;
      alpha = 1.0;
    }

    // Aura compositing
    col += aura * vignette;
    alpha = max(alpha, clamp(dot(aura, vec3(0.35, 0.35, 0.35)) * 0.9, 0.0, 0.9) * vignette);

    // Tonemap-ish
    col = col / (1.0 + col);
    col = pow(col, vec3(0.95));

    gl_FragColor = vec4(col, alpha);
  }
`;

type StormRoseProps = {
  position?: [number, number, number];
  scale?: number;
  zoom?: number;
  camDist?: number;
};

export default function StormRose({
  position = [0, 0.8, 0],
  scale = 0.6,
  zoom = 1.35,
  camDist = 2.85,
}: StormRoseProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size, gl, camera } = useThree();
  // Larger plane to avoid clipping the storm effect (2x original)
  const planeSize = 2;
  const quadScale = scale * (2 / 1);
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
      // Multiply zoom by planeSize to keep rose at same visual size
      uniforms.uZoom.value = zoom * cameraZoom * planeSize;

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
    <mesh ref={meshRef} position={position} scale={quadScale * planeSize}>
      <planeGeometry args={[2, 2]} />
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
