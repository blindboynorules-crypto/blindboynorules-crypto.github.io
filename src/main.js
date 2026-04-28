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
const TAIL_SECONDS = 4;
const TAIL_PLAYBACK_RATE = 0.65;
const SEEK_TOLERANCE = 0.05;
const MAX_CATCHUP_RATE = 12;
let videoDuration = 0;
let targetTime = 0;
let videoMode = "hero";
let videoRaf = null;

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
  const rect = hero.getBoundingClientRect();
  const pastHero = rect.bottom <= window.innerHeight;

  if (!prefersReduced && Number.isFinite(duration) && duration > 0) {
    if (pastHero) {
      videoMode = "tail";
    } else {
      videoMode = "hero";
      targetTime =
        p *
        Math.max(0, duration - Math.min(TAIL_SECONDS, duration * 0.24) - 0.1);
    }
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
  if (!prefersReduced && video.readyState >= 2 && videoDuration > 0) {
    if (videoMode === "tail") {
      const tailStart = Math.max(0, videoDuration - TAIL_SECONDS);
      const nearEnd = video.currentTime >= videoDuration - 0.08;
      const beforeTail = video.currentTime < tailStart - 0.08;
      if (nearEnd || beforeTail) {
        try {
          if (typeof video.fastSeek === "function") video.fastSeek(tailStart);
          else video.currentTime = tailStart;
        } catch (e) {}
      }
      try {
        if (Math.abs(video.playbackRate - TAIL_PLAYBACK_RATE) > 0.02) {
          video.playbackRate = TAIL_PLAYBACK_RATE;
        }
        if (video.paused) video.play().catch(() => {});
      } catch (e) {}
    } else {
      const current = video.currentTime;
      const diff = targetTime - current;

      const seekTolerance = coarsePointer ? 0.09 : SEEK_TOLERANCE;
      if (Math.abs(diff) < seekTolerance) {
        if (!video.paused) {
          try {
            video.pause();
          } catch (e) {}
        }
      } else if (diff > 0) {
        const rate = clamp(diff * 6, 1, coarsePointer ? 7 : MAX_CATCHUP_RATE);
        try {
          if (Math.abs(video.playbackRate - rate) > 0.05)
            video.playbackRate = rate;
          if (video.paused) video.play().catch(() => {});
        } catch (e) {}
      } else {
        try {
          if (!video.paused) video.pause();
          const safeTarget = Math.max(0, targetTime);
          if (typeof video.fastSeek === "function") video.fastSeek(safeTarget);
          else video.currentTime = safeTarget;
        } catch (e) {}
      }
    }
  }

  videoRaf = requestAnimationFrame(syncVideoToScroll);
}

let raf = null;
function requestPaint() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = null;
    paintHero();
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
    if (!videoRaf) videoRaf = requestAnimationFrame(syncVideoToScroll);
  },
  { once: true },
);
video.addEventListener(
  "canplay",
  () => {
    video.pause();
    paintHero();
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
  const textA = document.getElementById("heroMorphA");
  const textB = document.getElementById("heroMorphB");
  if (!wrap || !textA || !textB) return;

  const morphTime = 1.05;
  let fraction = 0;
  let goal = 0;
  let rafId = null;
  let lastTs = null;
  let autoTimer = null;

  function paintMorph(value) {
    const eased = value * value * (3 - 2 * value);
    const inverse = 1 - eased;
    const maxBlur = coarsePointer ? 9 : 16;
    const lift = coarsePointer ? 8 : 12;

    textA.style.filter = `blur(${(eased * maxBlur).toFixed(2)}px)`;
    textA.style.opacity = inverse.toFixed(4);
    textA.style.transform = `translateY(${(-eased * lift).toFixed(2)}px)`;
    textB.style.filter = `blur(${(inverse * maxBlur).toFixed(2)}px)`;
    textB.style.opacity = eased.toFixed(4);
    textB.style.transform = `translateY(${(inverse * lift).toFixed(2)}px)`;
  }

  function tick(ts) {
    const dt = lastTs != null ? (ts - lastTs) / 1000 : 0;
    lastTs = ts;

    if (goal > fraction) fraction = Math.min(goal, fraction + dt / morphTime);
    else fraction = Math.max(goal, fraction - dt / morphTime);

    paintMorph(fraction);
    if (Math.abs(fraction - goal) > 0.0001) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      lastTs = null;
    }
  }

  function morphTo(value) {
    goal = value;
    if (!rafId) {
      lastTs = null;
      rafId = requestAnimationFrame(tick);
    }
  }

  function startTouchAutoMorph() {
    if (autoTimer || prefersReduced) return;
    autoTimer = window.setInterval(() => {
      morphTo(goal === 0 ? 1 : 0);
    }, 2800);
  }

  wrap.addEventListener("mouseenter", () => morphTo(1));
  wrap.addEventListener("mouseleave", () => morphTo(0));
  wrap.addEventListener("click", () => morphTo(goal === 0 ? 1 : 0));
  wrap.addEventListener(
    "touchstart",
    () => {
      morphTo(goal === 0 ? 1 : 0);
      startTouchAutoMorph();
    },
    { passive: true },
  );

  if (coarsePointer) startTouchAutoMorph();
  paintMorph(0);
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
