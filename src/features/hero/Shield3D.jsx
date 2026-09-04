import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import outline from './shieldOutline.json';

const BASE = import.meta.env.BASE_URL || '/';
const TEXTURE = `${BASE}brand/logo-mark-320.png`;

/**
 * The CityShield emblem as a real 3D object.
 *
 * The silhouette is traced from the artwork's own alpha channel
 * (scripts/brand/trace-silhouette.mjs), so the extruded contour is measured
 * rather than redrawn. The face carries the artwork itself as a texture -
 * projecting the real pixels is the single biggest fidelity lever, and far
 * more faithful than approximating that swirl procedurally.
 *
 * drei is deliberately not used: this needs Canvas, useFrame and a studio
 * environment, and pulling in the whole helper library for that would roughly
 * double the payload on a page that must stay fast on a mid-range phone.
 */

/* Studio reflections from three's bundled RoomEnvironment - no CDN, no HDRI
   download, works offline and on GitHub Pages. Chrome with no environment to
   reflect renders black. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

function ShieldMesh({ reduced }) {
  const group = useRef();
  const texture = useLoader(THREE.TextureLoader, TEXTURE);

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    outline.points.forEach(([x, y], i) => {
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
    shape.closePath();

    const { w, h } = outline.bounds;

    /* Map the front face straight onto the artwork's bounding box, so the
       texture lands square instead of following extrude's default UVs. */
    const uvGenerator = {
      generateTopUV(_geometry, vertices, indexA, indexB, indexC) {
        return [indexA, indexB, indexC].map((i) => {
          const x = vertices[i * 3];
          const y = vertices[i * 3 + 1];
          return new THREE.Vector2((x + w / 2) / w, (y + h / 2) / h);
        });
      },
      generateSideWallUV(_geometry, vertices, indexA, indexB, indexC, indexD) {
        return [indexA, indexB, indexC, indexD].map(
          (_, k) => new THREE.Vector2(k < 2 ? 0 : 1, k === 0 || k === 3 ? 0 : 1),
        );
      },
    };

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.038,
      bevelSegments: 4,
      curveSegments: 1,
      UVGenerator: uvGenerator,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, []);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
  }, [texture]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  /* Idle rotation plus pointer parallax. Damped toward the target rather than
     snapped, so it reads as mass rather than a cursor follower. */
  useFrame((state, delta) => {
    if (!group.current || reduced) return;
    const { x, y } = state.pointer;
    /* Bounded turn: past roughly 40 degrees the back face comes into view and
       the artwork is mirrored. An institutional mark should present itself,
       not spin like a prize wheel. */
    const targetY = THREE.MathUtils.clamp(
      x * 0.34 + Math.sin(state.clock.elapsedTime * 0.22) * 0.13,
      -0.62,
      0.62,
    );
    const targetX = THREE.MathUtils.clamp(-y * 0.2, -0.3, 0.3);
    group.current.rotation.y += (targetY - group.current.rotation.y) * Math.min(1, delta * 3);
    group.current.rotation.x += (targetX - group.current.rotation.x) * Math.min(1, delta * 3);
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry} castShadow={false} receiveShadow={false}>
        {/* material 0: front and back faces - the artwork.
            Reflectivity is deliberately restrained here. At full clearcoat and
            envMapIntensity the studio reflection sweeps across the face as it
            turns and the emblem reads as blank chrome - the logo has to stay
            legible at every angle, so the shine lives on the rim instead. */}
        <meshPhysicalMaterial
          attach="material-0"
          map={texture}
          transparent
          roughness={0.44}
          metalness={0.04}
          clearcoat={0.35}
          clearcoatRoughness={0.3}
          envMapIntensity={0.4}
        />
        {/* material 1: extruded sides and bevel - the chrome rim */}
        <meshStandardMaterial
          attach="material-1"
          color="#e2e8ef"
          roughness={0.16}
          metalness={1}
          envMapIntensity={1.9}
        />
      </mesh>
    </group>
  );
}

function Scene({ reduced }) {
  return (
    <>
      <StudioEnvironment />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={2.1} />
      <directionalLight position={[-4, -1, 2]} intensity={0.5} color="#a9cce3" />
      <Suspense fallback={null}>
        <ShieldMesh reduced={reduced} />
      </Suspense>
    </>
  );
}

export default function Shield3D({ className }) {
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /* WebGL is not guaranteed - old Androids, locked-down government machines,
     and remote desktop sessions all disable it. Fall back to the flat mark. */
  const supported = useMemo(() => {
    try {
      const c = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
          (c.getContext('webgl2') || c.getContext('webgl')),
      );
    } catch {
      return false;
    }
  }, []);

  if (!supported || failed) {
    return (
      <img
        src={TEXTURE}
        alt="CityShield emblem"
        width={150}
        height={163}
        className={className}
        draggable="false"
      />
    );
  }

  return (
    <div className={className} aria-label="CityShield emblem, rotating" role="img">
      <Canvas
        camera={{ position: [0, 0, 3.15], fov: 36 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        frameloop={reduced ? 'demand' : 'always'}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
        }}
        onError={() => setFailed(true)}
      >
        <Scene reduced={reduced} />
      </Canvas>
    </div>
  );
}
