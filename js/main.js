const canvas = document.getElementById("petalCanvas");
const ctx = canvas.getContext("2d");
const logoStage = document.getElementById("logoStage");
const logoShell = document.getElementById("logoShell");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const petals = [];
const petalCount = 54;

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let lastFrameTime = performance.now();

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
  }

  update(deltaSeconds) {
    this.swayPhase += this.swaySpeed * deltaSeconds;
    this.rotation += this.spin * deltaSeconds;

    this.y += this.baseSpeed * deltaSeconds;
    this.x +=
      this.horizontalSpeed * deltaSeconds +
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

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(stretch, this.tilt);

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

  for (let index = 0; index < petalCount; index += 1) {
    petals.push(new Petal());
  }
}

function renderFrame(timestamp) {
  const rawDeltaSeconds = (timestamp - lastFrameTime) / 1000;
  const deltaSeconds = Math.min(rawDeltaSeconds || 0.016, 0.033);
  lastFrameTime = timestamp;

  ctx.clearRect(0, 0, viewportWidth, viewportHeight);

  petals.forEach((petal) => {
    petal.update(deltaSeconds);
    petal.draw();
  });

  if (!prefersReducedMotion.matches) {
    window.requestAnimationFrame(renderFrame);
  }
}

function resetLogoTransform() {
  logoShell.style.setProperty("--logo-rotate-x", "0deg");
  logoShell.style.setProperty("--logo-rotate-y", "0deg");
  logoShell.style.setProperty("--logo-scale", "1");
}

function updateLogoTransform(event) {
  const bounds = logoStage.getBoundingClientRect();
  const offsetX = (event.clientX - bounds.left) / bounds.width;
  const offsetY = (event.clientY - bounds.top) / bounds.height;
  const centeredX = clamp(offsetX * 2 - 1, -1, 1);
  const centeredY = clamp(offsetY * 2 - 1, -1, 1);

  logoShell.style.setProperty("--logo-rotate-x", `${(-centeredY * 10).toFixed(2)}deg`);
  logoShell.style.setProperty("--logo-rotate-y", `${(centeredX * 14).toFixed(2)}deg`);
  logoShell.style.setProperty("--logo-scale", "1.04");
}

resizeCanvas();
populatePetals();
resetLogoTransform();

logoStage.addEventListener("pointermove", updateLogoTransform);
logoStage.addEventListener("pointerenter", updateLogoTransform);
logoStage.addEventListener("pointerleave", resetLogoTransform);

window.addEventListener("resize", () => {
  resizeCanvas();
  populatePetals();
});

prefersReducedMotion.addEventListener("change", () => {
  if (prefersReducedMotion.matches) {
    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    return;
  }

  lastFrameTime = performance.now();
  window.requestAnimationFrame(renderFrame);
});

if (!prefersReducedMotion.matches) {
  window.requestAnimationFrame(renderFrame);
}
