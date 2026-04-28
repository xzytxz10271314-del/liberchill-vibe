const canvas = document.getElementById("petalCanvas");
const ctx = canvas.getContext("2d");
const logoStage = document.getElementById("logoStage");
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const petals = [];

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let lastFrameTime = performance.now();
let windPhase = Math.random() * Math.PI * 2;
let animationFrameId = 0;
let sceneParallaxX = 0;
let sceneParallaxY = 0;

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resizeCanvas() {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewportWidth * ratio);
  canvas.height = Math.floor(viewportHeight * ratio);
  canvas.style.width = `${viewportWidth}px`;
  canvas.style.height = `${viewportHeight}px`;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

class Petal {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.depth = Math.random();
    this.size = random(10, 24) + this.depth * 10;
    this.x = random(-40, viewportWidth + 40);
    this.y = initial ? random(-viewportHeight, viewportHeight) : random(-120, -20);
    this.baseSpeed = random(12, 26) + this.depth * 32;
    this.horizontalSpeed = random(-8, 8);
    this.swayPhase = random(0, Math.PI * 2);
    this.swaySpeed = random(0.35, 0.9);
    this.swayAmount = random(10, 24) + this.depth * 18;
    this.rotation = random(0, Math.PI * 2);
    this.spin = random(-0.5, 0.5) * (0.3 + this.depth * 0.8);
    this.opacity = random(0.4, 0.75) + this.depth * 0.2;
    this.tilt = random(0.75, 1.3);
    this.tint = random(-10, 12);
    this.blur = Math.max(0, (0.28 - this.depth) * 4.5);
    this.driftInfluence = 0.55 + this.depth * 0.95;
  }

  update(deltaSeconds, ambientWind) {
    this.swayPhase += this.swaySpeed * deltaSeconds;
    this.rotation += this.spin * deltaSeconds;

    this.y += this.baseSpeed * deltaSeconds;
    this.x +=
      (this.horizontalSpeed + ambientWind * this.driftInfluence) * deltaSeconds +
      Math.sin(this.swayPhase) * this.swayAmount * deltaSeconds;

    if (
      this.y - this.size > viewportHeight + 48 ||
      this.x < -80 ||
      this.x > viewportWidth + 80
    ) {
      this.reset(false);
    }
  }

  draw() {
    const stretch = 0.7 + this.depth * 0.5;
    const alpha = clamp(this.opacity, 0.25, 0.94);
    const red = 255;
    const green = clamp(210 + this.tint, 160, 235);
    const blue = clamp(226 + this.tint, 180, 242);
    const depthParallaxX = sceneParallaxX * (12 + this.depth * 44);
    const depthParallaxY = sceneParallaxY * (8 + this.depth * 22);

    ctx.save();
    ctx.translate(this.x + depthParallaxX, this.y + depthParallaxY);
    ctx.rotate(this.rotation);
    ctx.scale(stretch, this.tilt);
    ctx.filter = this.blur > 0 ? `blur(${this.blur.toFixed(2)}px)` : "none";

    ctx.shadowColor = `rgba(255, 206, 222, ${alpha * 0.5})`;
    ctx.shadowBlur = 8 + this.depth * 10;

    ctx.beginPath();
    ctx.moveTo(0, -this.size * 0.55);
    ctx.bezierCurveTo(
      this.size * 0.65,
      -this.size * 0.34,
      this.size * 0.7,
      this.size * 0.42,
      0,
      this.size * 0.72
    );
    ctx.bezierCurveTo(
      -this.size * 0.7,
      this.size * 0.42,
      -this.size * 0.65,
      -this.size * 0.34,
      0,
      -this.size * 0.55
    );
    ctx.closePath();
    ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, -this.size * 0.08, this.size * 0.14, this.size * 0.34, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 247, 251, ${alpha * 0.48})`;
    ctx.fill();

    ctx.restore();
  }
}

function populatePetals() {
  petals.length = 0;
  const petalCount = Math.max(36, Math.min(72, Math.round(viewportWidth / 24)));

  for (let index = 0; index < petalCount; index += 1) {
    petals.push(new Petal());
  }
}

function renderFrame(timestamp) {
  const rawDeltaSeconds = (timestamp - lastFrameTime) / 1000;
  const deltaSeconds = Math.min(rawDeltaSeconds || 0.016, 0.033);
  lastFrameTime = timestamp;
  windPhase += deltaSeconds * 0.32;
  const ambientWind =
    Math.sin(windPhase) * 12 +
    Math.cos(windPhase * 0.43 + 1.4) * 6;

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  petals.forEach((petal) => {
    petal.update(deltaSeconds, ambientWind);
    petal.draw();
  });

  if (!prefersReducedMotion.matches) {
    animationFrameId = window.requestAnimationFrame(renderFrame);
  }
}

function resetLogoTransform() {
  root.style.setProperty("--logo-tilt-x", "0deg");
  root.style.setProperty("--logo-tilt-y", "0deg");
  root.style.setProperty("--logo-scale", "1");
  root.style.setProperty("--logo-shift-x", "0px");
  root.style.setProperty("--logo-shift-y", "0px");
  root.style.setProperty("--logo-sheen-x", "48%");
  root.style.setProperty("--logo-sheen-y", "34%");
  root.style.setProperty("--glow-left-shift-x", "0px");
  root.style.setProperty("--glow-left-shift-y", "0px");
  root.style.setProperty("--glow-right-shift-x", "0px");
  root.style.setProperty("--glow-right-shift-y", "0px");
  root.style.setProperty("--aura-shift-x", "0px");
  root.style.setProperty("--aura-shift-y", "0px");
  root.style.setProperty("--ring-shift-x", "0px");
  root.style.setProperty("--ring-shift-y", "0px");
}

function resetScenePerspective() {
  root.style.setProperty("--scene-rotate-x", "0deg");
  root.style.setProperty("--scene-rotate-y", "0deg");
  root.style.setProperty("--scene-shift-x", "0px");
  root.style.setProperty("--scene-shift-y", "0px");
  root.style.setProperty("--scene-scale", "1");
  sceneParallaxX = 0;
  sceneParallaxY = 0;
}

function updateLogoTransform(event) {
  const bounds = logoStage.getBoundingClientRect();
  const offsetX = (event.clientX - bounds.left) / bounds.width;
  const offsetY = (event.clientY - bounds.top) / bounds.height;
  const centeredX = clamp(offsetX * 2 - 1, -1, 1);
  const centeredY = clamp(offsetY * 2 - 1, -1, 1);

  root.style.setProperty("--logo-tilt-x", `${(-centeredY * 10).toFixed(2)}deg`);
  root.style.setProperty("--logo-tilt-y", `${(centeredX * 14).toFixed(2)}deg`);
  root.style.setProperty("--logo-scale", "1.045");
  root.style.setProperty("--logo-shift-x", `${(centeredX * 10).toFixed(2)}px`);
  root.style.setProperty("--logo-shift-y", `${(centeredY * 6).toFixed(2)}px`);
  root.style.setProperty("--logo-sheen-x", `${(offsetX * 100).toFixed(2)}%`);
  root.style.setProperty("--logo-sheen-y", `${(offsetY * 100).toFixed(2)}%`);
  root.style.setProperty("--glow-left-shift-x", `${(-centeredX * 2.5).toFixed(2)}px`);
  root.style.setProperty("--glow-left-shift-y", `${(-centeredY * 1.3).toFixed(2)}px`);
  root.style.setProperty("--glow-right-shift-x", `${(centeredX * 2.2).toFixed(2)}px`);
  root.style.setProperty("--glow-right-shift-y", `${(centeredY * 1.2).toFixed(2)}px`);
  root.style.setProperty("--aura-shift-x", `${(centeredX * 3.4).toFixed(2)}px`);
  root.style.setProperty("--aura-shift-y", `${(centeredY * 1.3).toFixed(2)}px`);
  root.style.setProperty("--ring-shift-x", `${(centeredX * 1.8).toFixed(2)}px`);
  root.style.setProperty("--ring-shift-y", `${(centeredY * 0.8).toFixed(2)}px`);
}

function updateAmbientGlow(event) {
  if (event.pointerType === "touch" || prefersReducedMotion.matches) {
    return;
  }

  const viewportX = clamp(event.clientX / viewportWidth, 0, 1);
  const viewportY = clamp(event.clientY / viewportHeight, 0, 1);
  const centeredX = viewportX * 2 - 1;
  const centeredY = viewportY * 2 - 1;
  root.style.setProperty("--cursor-x", `${(viewportX * 100).toFixed(2)}%`);
  root.style.setProperty("--cursor-y", `${(viewportY * 100).toFixed(2)}%`);
  root.style.setProperty("--scene-rotate-x", `${(-centeredY * 7.5).toFixed(2)}deg`);
  root.style.setProperty("--scene-rotate-y", `${(centeredX * 10.5).toFixed(2)}deg`);
  root.style.setProperty("--scene-shift-x", `${(centeredX * 16).toFixed(2)}px`);
  root.style.setProperty("--scene-shift-y", `${(centeredY * 10).toFixed(2)}px`);
  root.style.setProperty("--scene-scale", "1.018");
  sceneParallaxX = centeredX;
  sceneParallaxY = centeredY;
}

function restartAnimation() {
  window.cancelAnimationFrame(animationFrameId);
  lastFrameTime = performance.now();
  animationFrameId = window.requestAnimationFrame(renderFrame);
}

resizeCanvas();
populatePetals();
resetLogoTransform();
resetScenePerspective();
root.style.setProperty("--cursor-x", "50%");
root.style.setProperty("--cursor-y", "24%");

logoStage.addEventListener("pointermove", updateLogoTransform);
logoStage.addEventListener("pointerenter", updateLogoTransform);
logoStage.addEventListener("pointerleave", resetLogoTransform);
window.addEventListener("pointermove", updateAmbientGlow, { passive: true });
window.addEventListener("blur", () => {
  resetLogoTransform();
  resetScenePerspective();
});

window.addEventListener("resize", () => {
  resizeCanvas();
  populatePetals();
});

prefersReducedMotion.addEventListener("change", () => {
  if (prefersReducedMotion.matches) {
    window.cancelAnimationFrame(animationFrameId);
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    return;
  }

  restartAnimation();
});

if (!prefersReducedMotion.matches) {
  restartAnimation();
}
