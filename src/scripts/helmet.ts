/**
 * Hero WebGL island: DRACO-compressed helmet GLB + HDRI environment with a
 * custom shader injection (vertical burn-in reveal + cursor alpha mask).
 * Fully self-hosted; graceful fallback when WebGL is unavailable.
 * Rendering pauses when the tab is hidden or the hero is scrolled past.
 */
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { subscribe } from "../lib/ticker";
import { springStep } from "../lib/spring";
import { finishLoader, onSceneRise } from "../lib/loader";
import { trackAsset, reportAssetError } from "../lib/assets";

const HELMET_URL = "/assets/hero/scene/helmet3.glb";
const HDR_URL = "/assets/hero/scene/studio-light.hdr";
const DRACO_PATH = "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/draco/gltf/";
const INTRO_MS = 4000;

export async function initHelmetScene(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#helmet-scene");
  const heroArt = document.querySelector<HTMLElement>(".hero-art");
  if (!canvas || !("WebGLRenderingContext" in window)) {
    heroArt?.classList.add("is-fallback");
    finishLoader();
    return;
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pointer = new THREE.Vector2(0.3, 0.1);
  const pointerTarget = new THREE.Vector2(0.3, 0.1);
  const pointerVelocity = new THREE.Vector2();
  const materialUniforms: Array<Record<string, { value: unknown }>> = [];
  let sceneReady = false;
  let sceneStart = 0;
  let riseStart = 0;

  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: innerWidth >= 1280 });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, innerWidth < 768 ? 1 : 1.5));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      35,
      canvas.clientWidth / Math.max(1, canvas.clientHeight),
      0.1,
      100,
    );
    camera.position.set(0, 0.1, 11.5);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x292d36, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-4, 6, 8);
    scene.add(key);
    const rim = new THREE.PointLight(0x02d2e3, 2.8, 16);
    rim.position.set(4, 1, 4);
    scene.add(rim);

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_PATH);
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(draco);

    const helmetPromise: Promise<GLTF> = gltfLoader.loadAsync(HELMET_URL).catch((error: unknown) => {
      reportAssetError(HELMET_URL, error);
      throw error;
    });
    const envPromise = new RGBELoader()
      .loadAsync(HDR_URL)
      .then((hdr) => {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const env = pmrem.fromEquirectangular(hdr);
        scene.environment = env.texture;
        hdr.dispose();
        pmrem.dispose();
      })
      .catch((error: unknown) => reportAssetError(HDR_URL, error));

    trackAsset(helmetPromise).catch(() => {});
    trackAsset(envPromise).catch(() => {});
    const gltf = await helmetPromise;

    const helmet = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(helmet);
    const size = bounds.getSize(new THREE.Vector3());
    const centre = bounds.getCenter(new THREE.Vector3());
    const helmetScale = 3.2 / Math.max(size.x, size.y, size.z);
    helmet.scale.setScalar(helmetScale);
    helmet.position.set(0.1, 1.4, 1.2).addScaledVector(centre, -helmetScale);

    helmet.traverse((object: THREE.Object3D) => {
      if (!(object instanceof THREE.Mesh)) return;
      const material = object.material.clone() as THREE.MeshStandardMaterial;
      material.side = THREE.FrontSide;
      material.transparent = true;
      material.depthWrite = false;
      material.envMapIntensity = 1.3;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.uIntro = { value: 0 };
        shader.uniforms.uPointer = { value: pointer };
        shader.uniforms.uPointerVelocity = { value: pointerVelocity };
        shader.uniforms.uResolution = { value: new THREE.Vector2(1, 1) };
        materialUniforms.push(shader.uniforms);
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <common>",
          "#include <common>\nuniform float uIntro;\nuniform vec2 uPointer;\nuniform vec2 uPointerVelocity;\nuniform vec2 uResolution;",
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `vec2 sceneUv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
           vec2 cursorUv = uPointer * .5 + .5;
           vec2 delta = sceneUv - cursorUv;
           vec2 direction = normalize(uPointerVelocity + vec2(.0001));
           float along = dot(delta, direction);
           float across = length(delta - direction * along);
           float cursorMask = 1.0 - smoothstep(.08, .34, length(vec2(along * .62, across)));
           float burnFront = clamp((uIntro - .14) / .86, 0.0, 1.0);
           float burnHeight = 1.0 - sceneUv.y;
           float burn = uIntro < .14 ? 1.0 : 1.0 - smoothstep(burnFront - .02, burnFront + .02, burnHeight);
           float shellAlpha = mix(burn, cursorMask, smoothstep(.15, .24, uIntro));
           gl_FragColor.a *= shellAlpha;
           #include <dithering_fragment>`,
        );
      };
      material.needsUpdate = true;
      object.material = material;
    });
    scene.add(helmet);

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 768 ? 13 : width < 1280 ? 12 : 11.5;
      camera.updateProjectionMatrix();
    };
    new ResizeObserver(resize).observe(canvas);

    addEventListener(
      "pointermove",
      (event) => {
        if (matchMedia("(hover: none)").matches) return;
        pointerTarget.set((event.clientX / innerWidth) * 2 - 1, (event.clientY / innerHeight) * 2 - 1);
      },
      { passive: true },
    );

    await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    sceneReady = true;
    sceneStart = performance.now();

    const riseSpring = { value: 0, velocity: 0 };
    onSceneRise(() => {
      riseStart = performance.now();
    });
    finishLoader();

    if (!reducedMotion) {
      subscribe(
        (time, delta) => {
          if (document.hidden || scrollY > innerHeight * 1.15) return;
          pointerVelocity.set(pointerTarget.x - pointer.x, pointerTarget.y - pointer.y);
          pointer.lerp(pointerTarget, 0.17);
          const elapsed = Math.max(0, (time - sceneStart) / INTRO_MS);
          const burnProgress = Math.min(1, Math.max(0, (elapsed - 0.14) / 0.86));
          const riseTarget = riseStart > 0 && time >= riseStart ? 1 : 0;
          const rise = springStep(riseSpring, riseTarget, 200, 24, delta);
          helmet.position.y = 1.4 - (1 - rise) * 0.9;
          helmet.rotation.x += (pointer.y * -0.043 - helmet.rotation.x) * 0.17;
          helmet.rotation.y += (pointer.x * 0.036 - helmet.rotation.y) * 0.17;
          for (const uniforms of materialUniforms) {
            (uniforms.uIntro as { value: number }).value = burnProgress;
            (uniforms.uPointer as { value: THREE.Vector2 }).value.copy(pointer);
            (uniforms.uPointerVelocity as { value: THREE.Vector2 }).value.copy(pointerVelocity);
            renderer.getDrawingBufferSize(
              (uniforms.uResolution as { value: THREE.Vector2 }).value,
            );
          }
          renderer.render(scene, camera);
        },
        () => (innerWidth < 1280 ? 1000 / 60 - 2 : 0),
      );
    }
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.error("Hero scene could not be initialized.", error);
    }
    heroArt?.classList.add("is-fallback");
    if (!sceneReady) finishLoader();
  }
}
