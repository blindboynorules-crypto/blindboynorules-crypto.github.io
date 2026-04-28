/* Portfolio interactions: scroll video, reveal motion, title morph and contact particles. */
const prefersReduced = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
const coarsePointer = window.matchMedia(
  "(hover: none), (pointer: coarse)",
).matches;
const mobileHeroQuery = window.matchMedia(
  "(max-width: 700px), ((hover: none) and (pointer: coarse) and (max-width: 920px))",
);
const hero = document.querySelector(".hero-scroll");
const video = document.getElementById("heroVideo");
const videoSources = video ? [...video.querySelectorAll("source")] : [];
const cues = [...document.querySelectorAll(".cue")];
const progressCard = document.getElementById("progressCard");
const progressLabel = document.getElementById("progressLabel");
const revealItems = [...document.querySelectorAll(".reveal, .service-card")];
const shouldScrubHeroVideo =
  Boolean(video) && !mobileHeroQuery.matches && !prefersReduced;
const SEEK_TOLERANCE = 0.035;
const LARGE_SEEK_DELTA = 0.9;
const REVERSE_SEEK_INTERVAL = 90;
let videoDuration = 0;
let targetTime = 0;
let videoSyncRaf = null;
let lastSeekAt = 0;

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

  if (shouldScrubHeroVideo && videoDuration > 0) {
    targetTime = p * Math.max(0, videoDuration - 0.12);
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
  videoSyncRaf = null;
  if (!shouldScrubHeroVideo || video.readyState < 1 || videoDuration <= 0) {
    return;
  }

  const safeTarget = clamp(targetTime, 0, Math.max(0, videoDuration - 0.05));
  const currentTime = video.currentTime || 0;
  const delta = safeTarget - currentTime;
  const distance = Math.abs(delta);

  if (distance <= SEEK_TOLERANCE) {
    try {
      if (!video.paused) video.pause();
      video.playbackRate = 1;
      if (!video.seeking && distance > 0.012) video.currentTime = safeTarget;
    } catch (e) {}
    return;
  }

  if (video.seeking) {
    requestVideoSync();
    return;
  }

  try {
    if (delta > 0 && video.readyState >= 2) {
      if (distance > LARGE_SEEK_DELTA) {
        video.pause();
        video.playbackRate = 1;
        video.currentTime = Math.max(0, safeTarget - 0.18);
      } else {
        video.playbackRate = clamp(distance * 3.1, 0.25, 2.5);
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            if (!video.seeking) video.currentTime = safeTarget;
          });
        }
      }
    } else {
      const now = performance.now();
      if (now - lastSeekAt > REVERSE_SEEK_INTERVAL) {
        video.pause();
        video.playbackRate = 1;
        video.currentTime = safeTarget;
        lastSeekAt = now;
      }
    }
  } catch (e) {}

  if (Math.abs(safeTarget - (video.currentTime || 0)) > SEEK_TOLERANCE) {
    requestVideoSync();
  }
}

function requestVideoSync() {
  if (!shouldScrubHeroVideo || videoSyncRaf) return;
  videoSyncRaf = requestAnimationFrame(syncVideoToScroll);
}

function loadHeroVideoForDesktop() {
  if (!video) return;
  video.preload = "auto";
  videoSources.forEach((source) => {
    const src = source.dataset.src;
    if (src && source.getAttribute("src") !== src) {
      source.setAttribute("src", src);
    }
  });
  video.load();
}

function unloadHeroVideoForMobile() {
  if (!video) return;
  try {
    video.pause();
    video.removeAttribute("src");
    video.preload = "none";
    videoSources.forEach((source) => source.removeAttribute("src"));
    video.load();
  } catch (e) {}
}

let raf = null;
function requestPaint() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    paintHero();
    requestVideoSync();
  });
}

if (shouldScrubHeroVideo) {
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
      requestVideoSync();
    },
    { once: true },
  );
  video.addEventListener(
    "canplay",
    () => {
      video.pause();
      paintHero();
      requestVideoSync();
    },
    { once: true },
  );
  video.addEventListener("seeked", requestVideoSync);
  video.addEventListener("waiting", requestVideoSync);
  video.addEventListener("pause", requestVideoSync);
  loadHeroVideoForDesktop();
} else if (video) {
  unloadHeroVideoForMobile();
}
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
  };
  const layerB = {
    root: document.getElementById("heroMorphB"),
    top: document.getElementById("heroMorphBTop"),
    bottom: document.getElementById("heroMorphBBottom"),
  };
  if (
    !wrap ||
    !layerA.root ||
    !layerA.top ||
    !layerA.bottom ||
    !layerB.root ||
    !layerB.top ||
    !layerB.bottom
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
    const safeBlur = Math.max(0, blur);
    layer.root.style.filter =
      safeBlur < 0.01 ? "none" : `blur(${safeBlur.toFixed(2)}px)`;
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

  const amountX = coarsePointer ? 32 : 52;
  const amountY = coarsePointer ? 48 : 78;
  const separation = coarsePointer ? 100 : 110;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xf3f2ef, 1800, 9000);

  const camera = new THREE.PerspectiveCamera(60, 1, 1, 10000);
  camera.position.set(0, 355, 1220);

  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: !coarsePointer,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.2 : 1.6),
  );
  renderer.setClearColor(scene.fog.color, 0);
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

      const warmPoint = (ix * 3 + iy) % 11 === 0;
      const palePoint = (ix + iy * 2) % 13 === 0;
      if (warmPoint) colors.push(0.98, 0.42, 0.06);
      else if (palePoint) colors.push(0.74, 0.68, 0.58);
      else colors.push(0.055, 0.052, 0.048);
    }
  }

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: coarsePointer ? 3.2 : 4,
    vertexColors: true,
    transparent: true,
    opacity: coarsePointer ? 0.42 : 0.52,
    sizeAttenuation: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.position.y = coarsePointer ? 170 : 120;
  points.rotation.x = -0.08;
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
          Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
        i++;
      }
    }

    points.rotation.y = Math.sin(count * 0.018) * 0.055;
    positionAttribute.needsUpdate = true;
    renderer.render(scene, camera);
    count += coarsePointer ? 0.045 : 0.08;
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
