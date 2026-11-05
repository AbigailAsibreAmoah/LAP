import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/*
 * The La Porte doorway, built procedurally in Three.js (no external models):
 * a navy architrave with a gold fillet and keystone, two lacquered burgundy leaves
 * with raised panels and brass levers, and Paris beyond: the Eiffel Tower against a
 * low golden sun, revealed as the leaves swing open.
 *
 * Two variants:
 *  - 'room': the doorway set in a plaster wall, with light shadow-mapped through the
 *    opening so the pool on the floor genuinely widens as the leaves open (homepage hero).
 *  - 'standalone': the doorway alone on a transparent canvas for dark sections. The view
 *    beyond and the leaves are stencil-clipped to the arch, since there is no wall to hide them.
 *
 * Loaded lazily (see Doorway3D) so the public site never waits on three.js.
 */

export type DoorwayVariant = 'room' | 'standalone';

// Brand tokens from global.css, kept as exact values.
const NAVY = '#141b34';
const BURGUNDY = '#6e1630';
const GOLD = '#c49a5a';
const IVORY = '#f7f1e8';

// Opening: 2 wide, straight jambs to 2.4, semicircular head (r = 1) → 3.4 at the crown.
const HALF = 1;
const SPRING = 2.4;
const WALL_D = 0.5;
const OPEN_ANGLE = 1.22; // ≈ 70°

// The painted view beyond the threshold: a plane in world units, textured at TEX_PX per unit.
const BACK = { w: 9, h: 8, cy: 2.5, z: -4.2 };
const TEX_PX = 128;
const HORIZON_Y = 0.95;
const TOWER_BASE_Y = 0.85;
const TOWER_TOP_Y = 3.75;

const MASK_REF = 1;
const masked = {
  stencilWrite: true,
  stencilRef: MASK_REF,
  stencilFunc: THREE.EqualStencilFunc,
  stencilFail: THREE.KeepStencilOp,
  stencilZFail: THREE.KeepStencilOp,
  stencilZPass: THREE.KeepStencilOp,
};

function archPath(path: THREE.Path | THREE.Shape, inset: number) {
  const r = HALF - inset;
  path.moveTo(-r, 0);
  path.lineTo(r, 0);
  path.lineTo(r, SPRING);
  path.absarc(0, SPRING, r, 0, Math.PI, false);
  path.lineTo(-r, 0);
  return path;
}

function useGeometries() {
  return useMemo(() => {
    // Wall with the arch cut out of it.
    const wall = new THREE.Shape();
    wall.moveTo(-5, 0);
    wall.lineTo(5, 0);
    wall.lineTo(5, 6.2);
    wall.lineTo(-5, 6.2);
    wall.lineTo(-5, 0);
    wall.holes.push(archPath(new THREE.Path(), 0));
    const wallGeo = new THREE.ExtrudeGeometry(wall, { depth: WALL_D, bevelEnabled: false, curveSegments: 48 });
    wallGeo.translate(0, 0, -WALL_D);

    // Architrave: ring between the opening and an outer arch.
    const ring = (outer: number, inner: number) => {
      const s = new THREE.Shape();
      const R = HALF + outer;
      s.moveTo(-R, 0);
      s.lineTo(-R, SPRING);
      s.absarc(0, SPRING, R, Math.PI, 0, true);
      s.lineTo(R, 0);
      s.lineTo(HALF + inner, 0);
      s.lineTo(HALF + inner, SPRING);
      s.absarc(0, SPRING, HALF + inner, 0, Math.PI, false);
      s.lineTo(-(HALF + inner), 0);
      s.lineTo(-R, 0);
      return s;
    };
    const frameGeo = new THREE.ExtrudeGeometry(ring(0.24, 0), { depth: 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 48 });
    // Without a wall, the architrave itself carries the depth of the reveal.
    const deepFrameGeo = new THREE.ExtrudeGeometry(ring(0.24, 0), { depth: WALL_D + 0.12, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 48 });
    deepFrameGeo.translate(0, 0, -WALL_D);
    const filletGeo = new THREE.ExtrudeGeometry(ring(0.055, 0.025), { depth: 0.02, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 48 });
    const archShape = new THREE.Shape();
    archPath(archShape, 0);
    const maskGeo = new THREE.ShapeGeometry(archShape, 48);

    // Keystone: a tapered block at the crown.
    const key = new THREE.Shape();
    key.moveTo(-0.11, 0);
    key.lineTo(0.11, 0);
    key.lineTo(0.16, 0.42);
    key.lineTo(-0.16, 0.42);
    key.lineTo(-0.11, 0);
    const keyGeo = new THREE.ExtrudeGeometry(key, { depth: 0.18, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 3 });

    // One leaf, hinge at x = 0, quarter-arc head; mirrored for the other side.
    const gap = 0.012;
    const w = HALF - gap;
    const leaf = new THREE.Shape();
    leaf.moveTo(0, 0);
    leaf.lineTo(w, 0);
    leaf.lineTo(w, SPRING + HALF - gap * 2);
    leaf.absarc(HALF, SPRING, HALF - gap * 2, Math.PI / 2, Math.PI, false);
    leaf.lineTo(0, 0);
    const leafGeo = new THREE.ExtrudeGeometry(leaf, { depth: 0.07, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: 32 });

    const panel = (x0: number, y0: number, x1: number, y1: number) => {
      const s = new THREE.Shape();
      s.moveTo(x0, y0);
      s.lineTo(x1, y0);
      s.lineTo(x1, y1);
      s.lineTo(x0, y1);
      s.lineTo(x0, y0);
      return new THREE.ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 });
    };
    const panels = [panel(0.2, 0.28, 0.78, 1.22), panel(0.2, 1.42, 0.78, 2.52)];

    return { wallGeo, frameGeo, deepFrameGeo, filletGeo, maskGeo, keyGeo, leafGeo, panels };
  }, []);
}

/** Canvas row for a world height on the backdrop plane. */
function texY(y: number) {
  return (BACK.cy + BACK.h / 2 - y) * TEX_PX;
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The tower as a backlit iron silhouette: exponential legs, the great arch, three decks and a spire. */
function paintTower(W: number, H: number, cx: number, base: number, ht: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const hw = (f: number) => (0.25 * Math.pow(1 - f, 2.2) + 0.012) * ht;
  const legW = (f: number) => 0.075 * ht * (1 - f * 1.1);
  const y = (f: number) => base - f * ht;
  const side = (from: number, to: number, x: (f: number) => number, steps = 40) => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= steps; i++) {
      const f = from + ((to - from) * i) / steps;
      pts.push([x(f), y(f)]);
    }
    return pts;
  };
  const fillBetween = (from: number, to: number, x: (f: number) => number, apex?: number) => {
    g.beginPath();
    for (const [px, py] of side(from, to, x)) g.lineTo(cx - px, py);
    if (apex !== undefined) g.lineTo(cx, y(apex));
    for (const [px, py] of side(from, to, x).reverse()) g.lineTo(cx + px, py);
    g.closePath();
    g.fill();
  };

  // Silhouette
  const body = g.createLinearGradient(0, base, 0, base - ht);
  body.addColorStop(0, '#5b3a1f');
  body.addColorStop(1, '#7a5230');
  g.fillStyle = body;
  fillBetween(0, 0.94, hw);

  // Ironwork: diagonal lattice and horizontal tiers, kept inside the silhouette.
  g.save();
  g.globalCompositeOperation = 'source-atop';
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(255, 210, 150, 0.2)';
  g.beginPath();
  for (let x0 = cx - 1.3 * ht; x0 < cx + 1.3 * ht; x0 += 5) {
    g.moveTo(x0, base);
    g.lineTo(x0 + ht, base - ht);
    g.moveTo(x0, base);
    g.lineTo(x0 - ht, base - ht);
  }
  g.stroke();
  g.strokeStyle = 'rgba(40, 22, 10, 0.22)';
  g.beginPath();
  for (let f = 0.02; f < 0.94; f += 0.028) {
    g.moveTo(cx - ht, y(f));
    g.lineTo(cx + ht, y(f));
  }
  g.stroke();
  g.restore();

  // Openings between the legs.
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  const a = hw(0) - legW(0);
  g.beginPath();
  g.moveTo(cx - a, base + 1);
  g.bezierCurveTo(cx - a * 0.92, y(0.11), cx - a * 0.5, y(0.165), cx, y(0.168));
  g.bezierCurveTo(cx + a * 0.5, y(0.165), cx + a * 0.92, y(0.11), cx + a, base + 1);
  g.closePath();
  g.fill();
  const inner = (f: number) => Math.max(0, hw(f) - legW(f));
  fillBetween(0.232, 0.44, inner);
  fillBetween(0.462, 0.6, inner, 0.64);

  // Decks and spire.
  g.globalCompositeOperation = 'source-over';
  const deck = (f0: number, f1: number, over: number, color: string) => {
    const w = hw(f0) + over * ht;
    g.fillStyle = color;
    g.fillRect(cx - w, y(f1), 2 * w, y(f0) - y(f1));
    g.fillStyle = 'rgba(255, 214, 150, 0.45)';
    g.fillRect(cx - w, y(f1), 2 * w, 1.2);
  };
  deck(0.198, 0.232, 0.014, '#4f321b');
  deck(0.44, 0.462, 0.008, '#56371e');
  deck(0.895, 0.912, 0.006, '#5f3e22');
  g.fillStyle = '#5f3e22';
  g.beginPath();
  g.moveTo(cx - 0.01 * ht, y(0.94));
  g.lineTo(cx + 0.01 * ht, y(0.94));
  g.lineTo(cx + 0.004 * ht, y(0.985));
  g.lineTo(cx - 0.004 * ht, y(0.985));
  g.closePath();
  g.fill();
  g.fillRect(cx - 0.8, y(1), 1.6, y(0.985) - y(1));
  return c;
}

/** Paris at golden hour, painted once to a canvas: sky, low sun, the tower, rooftops and haze. */
function useBeyondTexture() {
  return useMemo(() => {
    const W = BACK.w * TEX_PX;
    const H = BACK.h * TEX_PX;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const cx = W / 2;
    const hz = texY(HORIZON_Y);

    const sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#cf955a');
    sky.addColorStop(0.45, '#eebf83');
    sky.addColorStop(0.82, '#fadfb2');
    sky.addColorStop(1, '#fff2da');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, hz);

    // Low sun just off to the right of the tower, so the ironwork stays legible against it.
    const sun = g.createRadialGradient(cx + 150, hz - 150, 0, cx + 150, hz - 150, 420);
    sun.addColorStop(0, 'rgba(255, 250, 236, 0.95)');
    sun.addColorStop(0.25, 'rgba(255, 236, 196, 0.6)');
    sun.addColorStop(1, 'rgba(255, 236, 196, 0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W, hz);

    // Long, soft clouds.
    for (const [x, yy, r, alpha] of [
      [cx - 260, hz - 330, 260, 0.35],
      [cx + 230, hz - 410, 300, 0.28],
      [cx - 60, hz - 520, 340, 0.22],
    ] as const) {
      g.save();
      g.translate(x, yy);
      g.scale(1, 0.1);
      const cloud = g.createRadialGradient(0, 0, 0, 0, 0, r);
      cloud.addColorStop(0, `rgba(255, 246, 228, ${alpha})`);
      cloud.addColorStop(1, 'rgba(255, 246, 228, 0)');
      g.fillStyle = cloud;
      g.fillRect(-r, -r, 2 * r, 2 * r);
      g.restore();
    }

    const ground = g.createLinearGradient(0, hz, 0, H);
    ground.addColorStop(0, '#efd5a8');
    ground.addColorStop(0.35, '#e2bf8a');
    ground.addColorStop(1, '#cfa671');
    g.fillStyle = ground;
    g.fillRect(0, hz, W, H - hz);

    const base = texY(TOWER_BASE_Y);
    g.save();
    g.shadowColor = 'rgba(255, 232, 190, 0.85)';
    g.shadowBlur = 22;
    g.drawImage(paintTower(W, H, cx, base, base - texY(TOWER_TOP_Y)), 0, 0);
    g.restore();

    // Haussmann rooftops along the horizon, and the trees of the Champ de Mars at the tower's feet.
    const rand = rng(7);
    g.fillStyle = 'rgba(190, 142, 92, 0.5)';
    for (let x = 0; x < W; ) {
      const w = 18 + rand() * 30;
      const h = 8 + rand() * 20;
      const top = hz + 6 - h;
      g.beginPath();
      g.moveTo(x, hz + 8);
      g.lineTo(x, top + 5);
      g.lineTo(x + 4, top);
      g.lineTo(x + w - 4, top);
      g.lineTo(x + w, top + 5);
      g.lineTo(x + w, hz + 8);
      g.closePath();
      g.fill();
      x += w + rand() * 6;
    }
    g.fillStyle = '#8f7445';
    for (let x = cx - 330; x < cx + 330; x += 7 + rand() * 6) {
      const r = 6 + rand() * 6;
      g.beginPath();
      g.ellipse(x, hz + 6 - r * 0.4, r * 1.3, r, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillRect(cx - 330, hz + 4, 660, 10);

    // Aerial haze: the far ground and the tower's foot soften into the light.
    const haze = g.createLinearGradient(0, hz - 60, 0, hz + 30);
    haze.addColorStop(0, 'rgba(255, 241, 218, 0)');
    haze.addColorStop(0.7, 'rgba(255, 241, 218, 0.22)');
    haze.addColorStop(1, 'rgba(255, 241, 218, 0)');
    g.fillStyle = haze;
    g.fillRect(0, hz - 60, W, 90);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function Leaf({ side, geo, panels, angle, materials }: { side: 1 | -1; geo: THREE.BufferGeometry; panels: THREE.BufferGeometry[]; angle: React.MutableRefObject<number>; materials: Materials }) {
  const hinge = useRef<THREE.Group>(null);
  useFrame(() => {
    if (hinge.current) hinge.current.rotation.y = side * angle.current;
  });
  return (
    <group ref={hinge} position={[-side * HALF, 0, -0.32]}>
      <group scale={[side, 1, 1]}>
        <mesh geometry={geo} material={materials.lacquer} castShadow receiveShadow />
        {panels.map((p, i) => (
          <mesh key={i} geometry={p} material={materials.lacquer} position={[0, 0, 0.075]} castShadow />
        ))}
        {panels.map((p, i) => (
          <mesh key={`b${i}`} geometry={p} material={materials.lacquer} position={[0, 0, -0.03]} />
        ))}
        {/* brass lever and rose on the meeting stile */}
        <group position={[0.86, 1.18, 0.12]}>
          <mesh material={materials.leafBrass} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.045, 0.05, 0.05, 32]} />
          </mesh>
          <mesh material={materials.leafBrass} position={[-0.09, 0, 0.05]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.018, 0.16, 6, 16]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

type Materials = ReturnType<typeof useMaterials>;
function useMaterials(clip: boolean) {
  return useMemo(() => {
    const clipped = clip ? masked : {};
    return {
      plaster: new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.92 }),
      floor: new THREE.MeshStandardMaterial({ color: '#e8dccb', roughness: 0.78 }),
      frame: new THREE.MeshPhysicalMaterial({ color: NAVY, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
      lacquer: new THREE.MeshPhysicalMaterial({ color: BURGUNDY, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.18, ...clipped }),
      brass: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28 }),
      leafBrass: new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: 0.28, ...clipped }),
      mask: new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        stencilWrite: true,
        stencilRef: MASK_REF,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp,
      }),
    };
  }, [clip]);
}

type Framing = { lookY: number; camY: number; z: number; dolly: number };
function framingFor(variant: DoorwayVariant, width: number): Framing {
  if (variant === 'standalone') return { lookY: 1.9, camY: 1.95, z: 8.9, dolly: 1.1 };
  // Narrow (phone) stages pull back and look lower so the doorway sits above the overlaid card.
  const compact = width < 560;
  return { lookY: compact ? 1.3 : 1.75, camY: compact ? 1.6 : 1.95, z: compact ? 13.2 : 10.2, dolly: 1.6 };
}

/**
 * Drives the door angle and a gentle camera settle as it opens, rendering only while something moves.
 * The view is fixed otherwise: the pointer never moves the camera.
 */
function Director({ open, still, variant, angle }: { open: boolean; still: boolean; variant: DoorwayVariant; angle: React.MutableRefObject<number> }) {
  const { camera, invalidate, size } = useThree();
  const dolly = useRef(still ? 0 : 1);
  const f = framingFor(variant, size.width);
  const look = useMemo(() => new THREE.Vector3(0, f.lookY, 0), [f.lookY]);

  useEffect(() => invalidate(), [open, f.z, invalidate]);

  useFrame((_, dt) => {
    const d = Math.min(dt, 1 / 30);
    const targetAngle = open ? OPEN_ANGLE : 0;
    const targetDolly = open ? 0 : 1;
    const k = still ? 1 : 1 - Math.exp(-d * (open ? 1.5 : 3));
    angle.current += (targetAngle - angle.current) * k;
    dolly.current += (targetDolly - dolly.current) * (still ? 1 : 1 - Math.exp(-d * 1.1));

    const tx = 0;
    const ty = f.camY;
    const tz = f.z + dolly.current * f.dolly;
    const kc = still ? 1 : 1 - Math.exp(-d * 3);
    camera.position.x += (tx - camera.position.x) * kc;
    camera.position.y += (ty - camera.position.y) * kc;
    camera.position.z += (tz - camera.position.z) * kc;
    camera.lookAt(look);

    const moving =
      Math.abs(targetAngle - angle.current) > 0.0005 ||
      Math.abs(targetDolly - dolly.current) > 0.0005 ||
      Math.abs(tx - camera.position.x) > 0.0005 ||
      Math.abs(ty - camera.position.y) > 0.0005 ||
      Math.abs(tz - camera.position.z) > 0.0005;
    if (moving) invalidate();
  });
  return null;
}

/** Reports ready only once a frame has actually been drawn, so the reveal never fades in an empty canvas. */
function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    requestAnimationFrame(() => onReady?.());
  });
  return null;
}

function Doorway({ open, still, variant }: { open: boolean; still: boolean; variant: DoorwayVariant }) {
  const room = variant === 'room';
  const g = useGeometries();
  const m = useMaterials(!room);
  const beyond = useBeyondTexture();
  const angle = useRef(still && open ? OPEN_ANGLE : 0);
  const spot = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, 0, 3.4);
    return o;
  }, []);

  useEffect(() => {
    if (spot.current) spot.current.target = target;
  }, [target]);

  return (
    <>
      <Director open={open} still={still} variant={variant} angle={angle} />

      {/* Soft room light in front, a cool fill, and reflections for lacquer and brass. */}
      <hemisphereLight args={['#fffaf2', '#cbbba2', 1.6]} />
      <directionalLight position={[-4, 6, 6]} intensity={2.6} color="#fff4e2" />
      <directionalLight position={[5, 3, 4]} intensity={0.6} color="#e4e9ff" />
      {/* A warm room for reflections: lacquer and brass need something to mirror. */}
      <Environment resolution={128} frames={1}>
        <color attach="background" args={['#cbbca4']} />
        <Lightformer form="rect" intensity={3} color="#fff3df" position={[0, 5, 6]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#f2cd8c" position={[0, 1.5, -6]} scale={[4, 4, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#e8ecf8" position={[-7, 2, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
      </Environment>

      {/* Warm evening light beyond the threshold, cast through the opening onto the floor. */}
      {room && (
        <>
          <spotLight
            ref={spot}
            position={[0, 2.9, -2.8]}
            angle={0.55}
            penumbra={0.6}
            intensity={160}
            distance={14}
            decay={1.6}
            color="#ffd79a"
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0004}
            shadow-normalBias={0.02}
          />
          <primitive object={target} />
        </>
      )}
      <pointLight position={[0, 1.6, -1.4]} intensity={6} distance={4} decay={2} color="#ffd9a3" />

      {/* Paris beyond. Standalone, it is clipped to the arch by a stencil drawn first. */}
      {!room && <mesh geometry={g.maskGeo} material={m.mask} position={[0, 0, 0.1]} renderOrder={-2} />}
      <mesh position={[0, BACK.cy, BACK.z]} renderOrder={-1}>
        <planeGeometry args={[BACK.w, BACK.h]} />
        <meshBasicMaterial map={beyond} toneMapped={false} fog={false} {...(room ? {} : masked)} />
      </mesh>

      {room ? (
        <>
          <mesh geometry={g.wallGeo} material={m.plaster} castShadow receiveShadow />
          <mesh geometry={g.frameGeo} material={m.frame} position={[0, 0, -0.04]} castShadow receiveShadow />
        </>
      ) : (
        <mesh geometry={g.deepFrameGeo} material={m.frame} position={[0, 0, -0.04]} />
      )}
      <mesh geometry={g.filletGeo} material={m.brass} position={[0, 0, 0.09]} />
      <mesh geometry={g.keyGeo} material={m.brass} position={[0, SPRING + HALF + 0.05, -0.02]} castShadow />

      <Leaf side={1} geo={g.leafGeo} panels={g.panels} angle={angle} materials={m} />
      <Leaf side={-1} geo={g.leafGeo} panels={g.panels} angle={angle} materials={m} />

      {room && (
        <>
          <mesh rotation-x={-Math.PI / 2} position={[0, 0, 1]} material={m.floor} receiveShadow>
            <planeGeometry args={[30, 16]} />
          </mesh>
          {/* threshold step */}
          <mesh material={m.plaster} position={[0, 0.03, -0.22]} castShadow receiveShadow>
            <boxGeometry args={[2.3, 0.06, 0.72]} />
          </mesh>
        </>
      )}
    </>
  );
}

export default function DoorwayScene({ open, still, variant = 'room', onReady }: { open: boolean; still: boolean; variant?: DoorwayVariant; onReady?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const room = variant === 'room';
  const start = framingFor(variant, host.current?.clientWidth ?? 1024);

  return (
    <div ref={host} style={{ position: 'absolute', inset: 0 }}>
      <Canvas
        frameloop="demand"
        shadows={room}
        dpr={[1, 1.75]}
        camera={{ position: [0, start.camY, start.z + (still ? 0 : start.dolly)], fov: 30, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, stencil: true, toneMapping: THREE.NeutralToneMapping, powerPreference: 'high-performance' }}
        onCreated={({ scene }) => {
          scene.background = null;
        }}
        style={{ position: 'absolute', inset: 0 }}
      >
        {room && <fog attach="fog" args={[IVORY, 14, 30]} />}
        <FirstFrame onReady={onReady} />
        <Doorway open={open} still={still} variant={variant} />
      </Canvas>
    </div>
  );
}
