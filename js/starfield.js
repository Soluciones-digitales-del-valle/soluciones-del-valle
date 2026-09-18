/**
 * StarfieldCanvas — cielo nocturno contemplativo para el hero.
 * Estrellas estables (seed), constelaciones ocasionales, interacción sutil.
 */
(() => {
  const SEED = 20260917;

  function mulberry32(a) {
    return function rand() {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function dist2(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  class StarfieldCanvas {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: true });
      this.stars = [];
      this.constellations = [];
      this.shooting = null;
      this.raf = 0;
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.mouse = { x: -9999, y: -9999, active: false };
      this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.visible = !document.hidden;
      this.nextConstellationAt = 0;
      this.nextShootingAt = 0;
      this.lastTs = 0;
      this.skyRatio = 1;

      this.onResize = this.onResize.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.onVisibility = this.onVisibility.bind(this);
      this.frame = this.frame.bind(this);
    }

    starCount() {
      const w = window.innerWidth;
      if (w < 640) return 90;
      if (w < 1024) return 120;
      return 150;
    }

    interactionEnabled() {
      return !this.reduceMotion && window.matchMedia("(pointer: fine)").matches;
    }

    init() {
      this.onResize();
      window.addEventListener("resize", this.onResize, { passive: true });
      document.addEventListener("visibilitychange", this.onVisibility);

      if (this.interactionEnabled()) {
        window.addEventListener("pointermove", this.onPointerMove, { passive: true });
        window.addEventListener("pointerleave", this.onPointerLeave, { passive: true });
      }

      const now = performance.now();
      this.nextConstellationAt = now + 2500;
      this.nextShootingAt = now + 18000 + Math.random() * 12000;
      this.lastTs = now;
      this.raf = requestAnimationFrame(this.frame);
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      window.removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisibility);
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerleave", this.onPointerLeave);
    }

    onVisibility() {
      this.visible = !document.hidden;
      if (this.visible) {
        this.lastTs = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    onPointerMove(e) {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    }

    onPointerLeave() {
      this.mouse.active = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    onResize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.dpr = dpr;
      this.width = Math.max(1, Math.floor(window.innerWidth));
      this.height = Math.max(1, Math.floor(window.innerHeight));
      this.canvas.width = Math.floor(this.width * dpr);
      this.canvas.height = Math.floor(this.height * dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.buildStars();
      if (this.reduceMotion) this.drawStatic();
    }

    buildStars() {
      const rand = mulberry32(SEED);
      const count = this.starCount();
      const skyH = this.height * this.skyRatio;
      const stars = new Array(count);

      for (let i = 0; i < count; i++) {
        let x = rand() * this.width;
        let y = rand() * skyH;

        const isPrimary = rand() < 0.12;
        const baseOpacity = isPrimary ? 0.32 + rand() * 0.32 : 0.1 + rand() * 0.24;
        const radius = isPrimary ? 1.1 + rand() * 0.85 : 0.4 + rand() * 0.65;

        stars[i] = {
          x,
          y,
          radius,
          opacity: baseOpacity,
          brightness: baseOpacity,
          baseOpacity,
          twinkleSpeed: 0.15 + rand() * 0.35,
          twinklePhase: rand() * Math.PI * 2,
          vx: (rand() - 0.5) * 0.012,
          vy: (rand() - 0.5) * 0.008,
          isPrimary,
          boost: 0,
        };
      }

      this.stars = stars;
      this.constellations = [];
    }

    spawnConstellation(now) {
      if (this.constellations.length >= 2) return;

      const primaries = [];
      for (let i = 0; i < this.stars.length; i++) {
        if (this.stars[i].isPrimary) {
          primaries.push(i);
        }
      }
      if (!primaries.length) return;

      const originIdx = primaries[(Math.random() * primaries.length) | 0];
      const origin = this.stars[originIdx];
      const maxDist = Math.min(this.width, this.height) * 0.22;
      const maxDist2 = maxDist * maxDist;

      const nearby = [];
      for (let i = 0; i < this.stars.length; i++) {
        if (i === originIdx) continue;
        const s = this.stars[i];
        const d = dist2(origin.x, origin.y, s.x, s.y);
        if (d < maxDist2) nearby.push({ i, d });
      }
      nearby.sort((a, b) => a.d - b.d);

      const pickCount = 2 + ((Math.random() * 4) | 0); // 2–5
      const nodes = [originIdx];
      for (let n = 0; n < nearby.length && nodes.length < pickCount + 1; n++) {
        nodes.push(nearby[n].i);
      }
      if (nodes.length < 3) return;

      // Edges: chain + a few closing connections for organic shapes
      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push([nodes[i], nodes[i + 1]]);
      }
      if (nodes.length >= 3 && Math.random() < 0.7) {
        edges.push([nodes[nodes.length - 1], nodes[0]]);
      }
      if (nodes.length >= 4 && Math.random() < 0.45) {
        edges.push([nodes[0], nodes[2]]);
      }

      const duration = 6000 + Math.random() * 6000; // 6–12s
      this.constellations.push({
        nodes,
        edges,
        start: now,
        duration,
        peak: 0.22 + Math.random() * 0.18,
      });
    }

    spawnShootingStar(now) {
      if (this.shooting) return;
      // Prefer top-right sky, avoid left content zone
      const startX = this.width * (0.55 + Math.random() * 0.4);
      const startY = this.height * (0.05 + Math.random() * 0.25);
      const angle = (-35 - Math.random() * 25) * (Math.PI / 180);
      const length = 70 + Math.random() * 90;
      const speed = 420 + Math.random() * 220;

      this.shooting = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        duration: 900 + Math.random() * 700,
        length,
      };
    }

    constellationAlpha(c, now) {
      const t = (now - c.start) / c.duration;
      if (t <= 0 || t >= 1) return 0;
      // soft fade in ~20%, hold, fade out ~30%
      if (t < 0.2) return easeInOut(t / 0.2) * c.peak;
      if (t > 0.7) return easeInOut((1 - t) / 0.3) * c.peak;
      return c.peak;
    }

    frame(now) {
      if (!this.visible) return;

      if (this.reduceMotion) {
        this.drawStatic();
        return;
      }

      const dt = Math.min(32, now - this.lastTs) / 1000;
      this.lastTs = now;

      if (now >= this.nextConstellationAt) {
        this.spawnConstellation(now);
        this.nextConstellationAt = now + 5000 + Math.random() * 7000;
      }
      if (now >= this.nextShootingAt) {
        this.spawnShootingStar(now);
        this.nextShootingAt = now + 20000 + Math.random() * 20000;
      }

      this.draw(now, dt);
      this.raf = requestAnimationFrame(this.frame);
    }

    drawStatic() {
      const { ctx, width, height, stars } = this;
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        ctx.beginPath();
        ctx.fillStyle = `rgba(230, 236, 245, ${s.baseOpacity})`;
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    draw(now, dt) {
      const { ctx, width, height, stars, mouse } = this;
      ctx.clearRect(0, 0, width, height);

      // Constellation membership boost
      const boost = new Float32Array(stars.length);
      const live = [];
      for (let i = 0; i < this.constellations.length; i++) {
        const c = this.constellations[i];
        const a = this.constellationAlpha(c, now);
        if (a <= 0.001 && now > c.start + c.duration) continue;
        live.push(c);
        if (a > 0) {
          for (let n = 0; n < c.nodes.length; n++) {
            boost[c.nodes[n]] = Math.max(boost[c.nodes[n]], a * 2.2);
          }
        }
      }
      this.constellations = live;

      const interactR = window.innerWidth < 768 ? 0 : 150;
      const interactR2 = interactR * interactR;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        let twinkle = s.baseOpacity;
        if (!this.reduceMotion) {
          s.twinklePhase += dt * s.twinkleSpeed;
          const wave = 0.5 + 0.5 * Math.sin(s.twinklePhase);
          twinkle = s.baseOpacity * (0.72 + wave * 0.28);
          if (s.isPrimary) {
            twinkle *= 0.92 + 0.08 * Math.sin(s.twinklePhase * 0.35);
          }
        }

        let ox = s.x;
        let oy = s.y;
        let prox = 0;
        if (mouse.active && interactR2 > 0) {
          const d = dist2(mouse.x, mouse.y, s.x, s.y);
          if (d < interactR2) {
            prox = 1 - Math.sqrt(d) / interactR;
            const pull = prox * 2.2;
            const ang = Math.atan2(s.y - mouse.y, s.x - mouse.x);
            ox += Math.cos(ang) * pull;
            oy += Math.sin(ang) * pull;
            twinkle = Math.min(0.95, twinkle + prox * 0.22);
          }
        }

        const b = boost[i] || 0;
        const alpha = clamp(twinkle + b * 0.55, 0, 0.95);
        const r = s.radius + (s.isPrimary ? 0.15 : 0) + b * 0.35 + prox * 0.2;

        if (s.isPrimary && alpha > 0.25) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(180, 205, 230, ${alpha * 0.12})`;
          ctx.arc(ox, oy, r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 238, 248, ${alpha})`;
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation lines
      for (let i = 0; i < this.constellations.length; i++) {
        const c = this.constellations[i];
        const a = this.constellationAlpha(c, now);
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(210, 224, 240, ${a})`;
        ctx.lineWidth = 0.7;
        ctx.lineCap = "round";
        for (let e = 0; e < c.edges.length; e++) {
          const [ia, ib] = c.edges[e];
          const sa = stars[ia];
          const sb = stars[ib];
          ctx.beginPath();
          ctx.moveTo(sa.x, sa.y);
          ctx.lineTo(sb.x, sb.y);
          ctx.stroke();
        }
      }

      // Shooting star
      if (this.shooting && !this.reduceMotion) {
        const s = this.shooting;
        s.life += dt * 1000;
        const t = s.life / s.duration;
        if (t >= 1) {
          this.shooting = null;
        } else {
          const fade = t < 0.15 ? t / 0.15 : t > 0.55 ? (1 - t) / 0.45 : 1;
          const x = s.x + s.vx * (s.life / 1000);
          const y = s.y + s.vy * (s.life / 1000);
          const ang = Math.atan2(s.vy, s.vx);
          const tx = x - Math.cos(ang) * s.length;
          const ty = y - Math.sin(ang) * s.length;

          const grad = ctx.createLinearGradient(tx, ty, x, y);
          grad.addColorStop(0, "rgba(230, 238, 250, 0)");
          grad.addColorStop(1, `rgba(230, 238, 250, ${0.55 * fade})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(x, y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = `rgba(245, 248, 255, ${0.8 * fade})`;
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function boot() {
    const canvas = document.querySelector("[data-starfield]");
    if (!canvas) return;
    const field = new StarfieldCanvas(canvas);
    field.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
