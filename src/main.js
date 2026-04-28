/* Portfolio interactions: scroll video, reveal motion, title morph and contact particles. */
const prefersReduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const coarsePointer = window.matchMedia(
  "(hover: none), (pointer: coarse)",
).matches;
const hero = document.querySelector(".hero-scroll");
const video = document.getElementById("heroVideo");
const cues = [...document.querySelectorAll(".cue")];
const progressCard = document.getElementById("progressCard");
const progressLabel = document.getElementById("progressLabel");
const revealItems = [...document.querySelectorAll(".reveal, .service-card")];
const SEEK_TOLERANCE = 0.05;
let videoDuration = 0;
let targetTime = 0;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function heroProgress() {
  const rect = hero.getBoundingClientRect();
  const distance = hero.offsetHeight - window.innerHeight;
  return clamp(-rect.top / Math.max(1, distance), 0, 1);
}

function paintHero() {
  const p = heroProgress();
  const duration = videoDuration || video.duration || 0;

  if (!prefersReduced && Number.isFinite(duration) && duration > 0) {
    targetTime = p * Math.max(0, duration - 0.12);
  }

  const cueIndex = Math.min(cues.length - 1, Math.floor(p * cues.length));
  cues.forEach((cue, index) =>
    cue.classList.toggle("active", index === cueIndex),
  );
  progressCard.style.setProperty("--p", p.toFixed(4));
  progressLabel.textContent =
    String(Math.round(p * 100)).padStart(2, "0") + "%";
}

function syncVideoToScroll() {
  if (!prefersReduced && video.readyState >= 1 && videoDuration > 0) {
    const current = video.currentTime || 0;
    const safeTarget = clamp(targetTime, 0, Math.max(0, videoDuration - 0.05));
    const seekTolerance = coarsePointer ? 0.12 : SEEK_TOLERANCE;

    try {
      if (!video.paused) video.pause();
      video.playbackRate = 1;
      if (Math.abs(safeTarget - current) > seekTolerance) {
        video.currentTime = safeTarget;
      }
    } catch (e) {}
  }
}

let raf = null;
function requestPaint() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    paintHero();
    syncVideoToScroll();
  });
}

video.addEventListener(
  "loadedmetadata",
  () => {
    videoDuration = video.duration || 0;
    try {
      video.muted = true;
      video.playsInline = true;
      video.disableRemotePlayback = true;
      video.pause();
      video.currentTime = 0;
    } catch (e) {}
    paintHero();
    syncVideoToScroll();
  },
  { once: true },
);
video.addEventListener(
  "canplay",
  () => {
    video.pause();
    paintHero();
    syncVideoToScroll();
  },
  { once: true },
);
window.addEventListener("scroll", requestPaint, { passive: true });
window.addEventListener("resize", requestPaint, { passive: true });
paintHero();

if (!prefersReduced) {
  document.body.classList.add("motion-ready");
}

function isInViewport(item) {
  const rect = item.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
}

function revealItem(item) {
  item.classList.add("revealed");
}

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        revealItem(entry.target);
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 55, 360)}ms`;
  if (isInViewport(item)) revealItem(item);
  io.observe(item);
});

window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    revealItems.forEach((item) => {
      if (isInViewport(item)) revealItem(item);
    });
  });
});

setTimeout(() => {
  revealItems.forEach((item) => {
    if (isInViewport(item)) revealItem(item);
  });
}, 350);

(function () {
  const wrap = document.getElementById("heroMorphTitle");
  const layerA = {
    root: document.getElementById("heroMorphA"),
    top: document.getElementById("heroMorphATop"),
    bottom: document.getElementById("heroMorphABottom"),
    blur: document.getElementById("heroLiquidBlurANode"),
  };
  const layerB = {
    root: document.getElementById("heroMorphB"),
    top: document.getElementById("heroMorphBTop"),
    bottom: document.getElementById("heroMorphBBottom"),
    blur: document.getElementById("heroLiquidBlurBNode"),
  };
  if (
    !wrap ||
    !layerA.root ||
    !layerA.top ||
    !layerA.bottom ||
    !layerA.blur ||
    !layerB.root ||
    !layerB.top ||
    !layerB.bottom ||
    !layerB.blur
  ) {
    return;
  }

  const titleStates = [
    { top: "VIDEO", bottom: "EDITOR." },
    { top: "THAI", bottom: "NGUYEN." },
  ];
  const morphTime = 1.5;
  const cooldownTime = 0.5;
  let textIndex = 0;
  let morph = 0;
  let cooldown = cooldownTime;
  let lastTs = performance.now();
  let rafId = null;

  function setLayerText(layer, state) {
    layer.top.textContent = state.top;
    layer.bottom.textContent = state.bottom;
  }

  function setLayerState(layer, opacity, blur) {
    layer.root.style.opacity = opacity.toFixed(4);
    layer.blur.setAttribute("stdDeviation", Math.max(0, blur).toFixed(2));
  }

  function setStyles(fraction) {
    const f = clamp(fraction, 0.0001, 0.9999);
    const current = titleStates[textIndex % titleStates.length];
    const next = titleStates[(textIndex + 1) % titleStates.length];

    setLayerText(layerA, current);
    setLayerText(layerB, next);

    const inverted = 1 - f;
    setLayerState(layerB, Math.pow(f, 0.4), Math.min(8 / f - 8, 100));
    setLayerState(
      layerA,
      Math.pow(inverted, 0.4),
      Math.min(8 / inverted - 8, 100),
    );
  }

  function doMorph() {
    morph -= cooldown;
    cooldown = 0;

    let fraction = morph / morphTime;
    if (fraction > 1) {
      cooldown = cooldownTime;
      fraction = 1;
    }

    setStyles(fraction);

    if (fraction === 1) {
      textIndex++;
    }
  }

  function doCooldown() {
    morph = 0;
    const current = titleStates[textIndex % titleStates.length];
    const next = titleStates[(textIndex + 1) % titleStates.length];
    setLayerText(layerA, next);
    setLayerText(layerB, current);
    setLayerState(layerA, 0, 0);
    setLayerState(layerB, 1, 0);
  }

  function animate(ts) {
    const dt = (ts - lastTs) / 1000;
    lastTs = ts;
    cooldown -= dt;

    if (cooldown <= 0) doMorph();
    else doCooldown();

    rafId = requestAnimationFrame(animate);
  }

  setLayerText(layerA, titleStates[0]);
  setLayerText(layerB, titleStates[1]);
  setLayerState(layerA, 1, 0);
  setLayerState(layerB, 0, 100);

  if (!prefersReduced) {
    rafId = requestAnimationFrame(animate);
  }

  window.addEventListener("pagehide", () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
})();

(async function () {
  const container = document.getElementById("contactDottedSurface");
  if (!container || prefersReduced) return;

  let THREE;
  try {
    THREE = await import(
      /* @vite-ignore */ "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js"
    );
  } catch (error) {
    return;
  }

  const amountX = coarsePointer ? 22 : 34;
  const amountY = coarsePointer ? 28 : 46;
  const separation = coarsePointer ? 138 : 128;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 1, 10000);
  camera.position.set(0, 390, 1180);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !coarsePointer,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.2 : 1.6),
  );
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const positions = [];
  const colors = [];
  const geometry = new THREE.BufferGeometry();

  for (let ix = 0; ix < amountX; ix++) {
    for (let iy = 0; iy < amountY; iy++) {
      positions.push(
        ix * separation - (amountX * separation) / 2,
        0,
        iy * separation - (amountY * separation) / 2,
      );

      const warmPoint = (ix + iy) % 7 === 0;
      if (warmPoint) colors.push(0.98, 0.45, 0.1);
      else colors.push(0.12, 0.105, 0.09);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: coarsePointer ? 5.5 : 6.8,
    vertexColors: true,
    transparent: true,
    opacity: coarsePointer ? 0.22 : 0.3,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let frame = null;
  let count = 0;
  let running = false;

  function resizeDottedSurface() {
    const rect = container.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function animateDottedSurface() {
    if (!running) return;
    frame = requestAnimationFrame(animateDottedSurface);

    const positionAttribute = geometry.attributes.position;
    const particlePositions = positionAttribute.array;
    let i = 0;

    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        const index = i * 3;
        particlePositions[index + 1] =
          Math.sin((ix + count) * 0.28) * 42 +
          Math.sin((iy + count) * 0.44) * 42;
        i++;
      }
    }

    points.rotation.y = Math.sin(count * 0.025) * 0.04;
    positionAttribute.needsUpdate = true;
    renderer.render(scene, camera);
    count += coarsePointer ? 0.045 : 0.075;
  }

  function startDottedSurface() {
    if (running) return;
    running = true;
    resizeDottedSurface();
    animateDottedSurface();
  }

  function stopDottedSurface() {
    running = false;
    if (frame) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  }

  window.addEventListener("resize", resizeDottedSurface, { passive: true });
  resizeDottedSurface();

  const dottedObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) startDottedSurface();
        else stopDottedSurface();
      });
    },
    { threshold: 0.08 },
  );

  dottedObserver.observe(container);
})();
