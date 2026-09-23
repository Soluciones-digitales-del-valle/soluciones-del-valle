/**
 * StarfieldCanvas — cielo nocturno contemplativo para el hero.
 * Estrellas estables (seed), constelaciones ocasionales, interacción sutil.
 * Sin dependencias. Auto-boot en DOMContentLoaded.
 */
(() => {
  const SEED = 20260917;
  const SKY_RATIO = 1;
  const INTERACT_RADIUS = 140;
  const HEIGHT_REBUILD_THRESHOLD = 100;

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

  function randRange(min, max) {
    return min + Math.random() * (max - min);
  }

  class StarfieldCanvas {
    /**
     * @param {HTMLCanvasElement} canvas
     */
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
      this._lastStarHeight = 0;
      this.mouse = { x: -9999, y: -9999, active: false };
      this.reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      this.visible = !document.hidden;
      this.nextConstellationAt = 0;
      this.nextShootingAt = 0;
      this.lastTs = 0;
      this.skyRatio = SKY_RATIO;
      this._pointerBound = false;

      this.onResize = this.onResize.bind(this);
      this.onOrientation = this.onOrientation.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.onVisibility = this.onVisibility.bind(this);
      this.onThemeChange = this.onThemeChange.bind(this);
      this.frame = this.frame.bind(this);
      this.orientationTimer = 0;
    }

    isLightTheme() {
      return document.documentElement.getAttribute("data-theme") === "light";
    }

    starCount() {
      const w = this.width || window.innerWidth;
      if (w < 768) return 80;
      if (w < 1024) return 125;
      return 160;
    }

    isDesktop() {
      return (this.width || window.innerWidth) >= 1024;
    }

    isMobile() {
      return (this.width || window.innerWidth) < 768;
    }

    maxConstellations() {
      return this.isMobile() ? 1 : 2;
    }

    interactionEnabled() {
      return (
        !this.reduceMotion &&
        this.isDesktop() &&
        window.matchMedia("(pointer: fine)").matches
      );
    }

    viewportSize() {
      const vv = window.visualViewport;
      const width = Math.max(
        window.innerWidth || 0,
        document.documentElement.clientWidth || 0,
        vv ? vv.width : 0
      );
      const height = Math.max(
        window.innerHeight || 0,
        document.documentElement.clientHeight || 0,
        vv ? vv.height : 0
      );
      return {
        width: Math.max(1, Math.ceil(width)),
        height: Math.max(1, Math.ceil(height + 120)),
      };
    }

    /** Content / copy zone on the left — keep sparser on desktop. */
    leftContentEdge() {
      return this.isDesktop() ? this.width * 0.42 : this.width * 0.28;
    }

    init() {
      this.onResize(true);
      window.addEventListener("resize", this.onResize, { passive: true });
      window.addEventListener("orientationchange", this.onOrientation, {
        passive: true,
      });
      document.addEventListener("visibilitychange", this.onVisibility);

      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", this.onResize, {
          passive: true,
        });
      }

      this.bindPointer();
      document.addEventListener("sdv:theme", this.onThemeChange);

      const now = performance.now();
      this.nextConstellationAt = now + randRange(3000, 6000);
      this.nextShootingAt =
        now +
        (this.isMobile() ? randRange(35000, 60000) : randRange(20000, 40000));
      this.lastTs = now;

      if (this.isLightTheme()) {
        this.pauseStars();
      } else if (this.reduceMotion) {
        this.drawStatic();
      } else {
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    bindPointer() {
      if (this._pointerBound || !this.interactionEnabled()) return;
      window.addEventListener("pointermove", this.onPointerMove, {
        passive: true,
      });
      window.addEventListener("pointerleave", this.onPointerLeave, {
        passive: true,
      });
      this._pointerBound = true;
    }

    unbindPointer() {
      if (!this._pointerBound) return;
      window.removeEventListener("pointermove", this.onPointerMove);
      window.removeEventListener("pointerleave", this.onPointerLeave);
      this._pointerBound = false;
      this.mouse.active = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    destroy() {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.orientationTimer);
      window.removeEventListener("resize", this.onResize);
      window.removeEventListener("orientationchange", this.onOrientation);
      document.removeEventListener("visibilitychange", this.onVisibility);
      document.removeEventListener("sdv:theme", this.onThemeChange);
      window.visualViewport?.removeEventListener("resize", this.onResize);
      this.unbindPointer();
    }

    pauseStars() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
    }

    resumeStars() {
      if (this.isLightTheme() || !this.visible) return;
      if (this.reduceMotion) {
        this.drawStatic();
        return;
      }
      if (!this.raf) {
        this.lastTs = performance.now();
        this.raf = requestAnimationFrame(this.frame);
      }
    }

    onThemeChange() {
      if (this.isLightTheme()) this.pauseStars();
      else this.resumeStars();
    }

    onVisibility() {
      this.visible = !document.hidden;
      if (this.visible) {
        this.resumeStars();
      } else {
        this.pauseStars();
      }
    }

    onOrientation() {
      clearTimeout(this.orientationTimer);
      this.orientationTimer = setTimeout(() => this.onResize(true), 250);
    }

    onPointerMove(e) {
      if (!this.interactionEnabled()) {
        this.unbindPointer();
        return;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.active = true;
    }

    onPointerLeave() {
      this.mouse.active = false;
      this.mouse.x = -9999;
      this.mouse.y = -9999;
    }

    onResize(forceRebuild) {
      const force = forceRebuild === true;
      const { width, height } = this.viewportSize();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const widthChanged = Math.abs(width - this.width) > 1;
      const heightChanged = Math.abs(height - this.height) > 1;

      if (!force && !widthChanged && !heightChanged && this.stars.length) {
        return;
      }

      this.dpr = dpr;
      this.width = width;
      this.height = height;
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const heightJump =
        Math.abs(height - (this._lastStarHeight || 0)) >= HEIGHT_REBUILD_THRESHOLD;

      if (force || widthChanged || heightJump || !this.stars.length) {
        this._lastStarHeight = height;
        this.buildStars();
      }

      if (this.interactionEnabled()) {
        this.bindPointer();
      } else {
        this.unbindPointer();
      }

      if (this.reduceMotion) this.drawStatic();
    }

    /**
     * Bias sample toward right / upper sky; leave left content zone sparser on desktop.
     */
    sampleStarPosition(rand, skyH) {
      const desktop = this.isDesktop();
      let x;
      let y;
      let attempts = 0;

      do {
        // Prefer right half / upper band via rejection + weighted picks
        const roll = rand();
        if (roll < 0.55) {
          x = this.width * (0.45 + rand() * 0.55);
        } else if (roll < 0.8) {
          x = this.width * (0.25 + rand() * 0.75);
        } else {
          x = rand() * this.width;
        }

        y = Math.pow(rand(), 1.15) * skyH;

        if (!desktop) break;

        // On desktop, reject many candidates in the left content zone
        const leftEdge = this.leftContentEdge();
        if (x < leftEdge && rand() > 0.28) {
          attempts++;
          continue;
        }
        break;
      } while (attempts < 6);

      return { x, y };
    }

    buildStars() {
      const rand = mulberry32(SEED);
      const count = this.starCount();
      const skyH = this.height * this.skyRatio;
      const stars = new Array(count);

      for (let i = 0; i < count; i++) {
        const { x, y } = this.sampleStarPosition(rand, skyH);
        const isPrimary = rand() < 0.11;
        const baseOpacity = isPrimary
          ? 0.3 + rand() * 0.3
          : 0.09 + rand() * 0.22;
        const radius = isPrimary ? 1.05 + rand() * 0.8 : 0.35 + rand() * 0.6;

        stars[i] = {
          x,
          y,
          radius,
          baseOpacity,
          twinkleSpeed: 0.12 + rand() * 0.32,
          twinklePhase: rand() * Math.PI * 2,
          isPrimary,
        };
      }

      this.stars = stars;
      this.constellations = [];
      this.shooting = null;
    }

    spawnConstellation(now) {
      if (this.constellations.length >= this.maxConstellations()) return;

      const primaries = [];
      for (let i = 0; i < this.stars.length; i++) {
        if (this.stars[i].isPrimary) primaries.push(i);
      }
      if (!primaries.length) return;

      const originIdx = primaries[(Math.random() * primaries.length) | 0];
      const origin = this.stars[originIdx];
      const maxDist = Math.min(this.width, this.height) * 0.2;
      const maxDist2 = maxDist * maxDist;

      const nearby = [];
      for (let i = 0; i < this.stars.length; i++) {
        if (i === originIdx) continue;
        const s = this.stars[i];
        const d = dist2(origin.x, origin.y, s.x, s.y);
        if (d < maxDist2) nearby.push({ i, d });
      }
      nearby.sort((a, b) => a.d - b.d);

      const pickCount = 2 + ((Math.random() * 4) | 0);
      const nodes = [originIdx];
      for (let n = 0; n < nearby.length && nodes.length < pickCount + 1; n++) {
        nodes.push(nearby[n].i);
      }
      if (nodes.length < 3) return;

      const edges = [];
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push([nodes[i], nodes[i + 1]]);
      }
      if (nodes.length >= 3 && Math.random() < 0.65) {
        edges.push([nodes[nodes.length - 1], nodes[0]]);
      }
      if (nodes.length >= 4 && Math.random() < 0.4) {
        edges.push([nodes[0], nodes[2]]);
      }

      this.constellations.push({
        nodes,
        edges,
        start: now,
        duration: randRange(7000, 11000),
        peak: randRange(0.08, 0.22),
      });
    }

    spawnShootingStar() {
      if (this.shooting) return;

      const leftEdge = this.leftContentEdge();
      const startX = Math.max(
        leftEdge,
        this.width * (0.5 + Math.random() * 0.45)
      );
      const startY = this.height * (0.04 + Math.random() * 0.22);
      const angle = (-38 - Math.random() * 22) * (Math.PI / 180);
      const length = 55 + Math.random() * 70;
      const speed = 380 + Math.random() * 180;

      this.shooting = {
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        duration: 800 + Math.random() * 600,
        length,
      };
    }

    constellationAlpha(c, now) {
      const t = (now - c.start) / c.duration;
      if (t <= 0 || t >= 1) return 0;
      if (t < 0.2) return easeInOut(t / 0.2) * c.peak;
      if (t > 0.7) return easeInOut((1 - t) / 0.3) * c.peak;
      return c.peak;
    }

    frame(now) {
      if (!this.visible || this.reduceMotion || this.isLightTheme()) return;

      const dt = Math.min(32, now - this.lastTs) / 1000;
      this.lastTs = now;

      if (now >= this.nextConstellationAt) {
        this.spawnConstellation(now);
        this.nextConstellationAt = now + randRange(6000, 14000);
      }

      if (now >= this.nextShootingAt) {
        this.spawnShootingStar();
        this.nextShootingAt =
          now +
          (this.isMobile() ? randRange(35000, 60000) : randRange(20000, 40000));
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

      const boost = new Float32Array(stars.length);
      const live = [];
      for (let i = 0; i < this.constellations.length; i++) {
        const c = this.constellations[i];
        const a = this.constellationAlpha(c, now);
        if (a <= 0.001 && now > c.start + c.duration) continue;
        live.push(c);
        if (a > 0) {
          for (let n = 0; n < c.nodes.length; n++) {
            boost[c.nodes[n]] = Math.max(boost[c.nodes[n]], a * 1.8);
          }
        }
      }
      this.constellations = live;

      const canInteract = this.interactionEnabled() && mouse.active;
      const interactR2 = INTERACT_RADIUS * INTERACT_RADIUS;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.twinklePhase += dt * s.twinkleSpeed;
        const wave = 0.5 + 0.5 * Math.sin(s.twinklePhase);
        let twinkle = s.baseOpacity * (0.75 + wave * 0.25);
        if (s.isPrimary) {
          twinkle *= 0.94 + 0.06 * Math.sin(s.twinklePhase * 0.35);
        }

        let ox = s.x;
        let oy = s.y;
        let prox = 0;

        if (canInteract) {
          const d = dist2(mouse.x, mouse.y, s.x, s.y);
          if (d < interactR2) {
            prox = 1 - Math.sqrt(d) / INTERACT_RADIUS;
            const pull = prox * 1.1;
            const ang = Math.atan2(s.y - mouse.y, s.x - mouse.x);
            ox += Math.cos(ang) * pull;
            oy += Math.sin(ang) * pull;
            twinkle = Math.min(0.85, twinkle + prox * 0.1);
          }
        }

        const b = boost[i] || 0;
        const alpha = clamp(twinkle + b * 0.4, 0, 0.9);
        const r = s.radius + (s.isPrimary ? 0.12 : 0) + b * 0.25 + prox * 0.12;

        if (s.isPrimary && alpha > 0.28) {
          ctx.beginPath();
          ctx.fillStyle = `rgba(180, 205, 230, ${alpha * 0.1})`;
          ctx.arc(ox, oy, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 238, 248, ${alpha})`;
        ctx.arc(ox, oy, r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < this.constellations.length; i++) {
        const c = this.constellations[i];
        const a = this.constellationAlpha(c, now);
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(210, 224, 240, ${a})`;
        ctx.lineWidth = 0.6;
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

      if (this.shooting) {
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
          grad.addColorStop(1, `rgba(230, 238, 250, ${0.35 * fade})`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(x, y);
          ctx.stroke();

          ctx.beginPath();
          ctx.fillStyle = `rgba(245, 248, 255, ${0.55 * fade})`;
          ctx.arc(x, y, 1, 0, Math.PI * 2);
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
