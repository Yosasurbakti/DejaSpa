/**
 * SERENE SPA — Main Application Script
 * Author: Studio Craft
 * Version: 1.0.0
 *
 * Modules:
 *  1. ParticleSystem   – ambient hero canvas animation
 *  2. Parallax         – hero background parallax on scroll/mouse
 *  3. Navbar           – sticky + scroll state + mobile menu
 *  4. ScrollReveal     – intersection-based reveal animations
 *  5. CountUp          – animated number counters
 *  6. TiltCards        – 3D tilt on service cards
 *  7. ScrollProgress   – progress bar
 *  8. SmoothScroll     – anchor smooth scroll
 *  9. init             – boot
 */

'use strict';

/* ─── 1. PARTICLE SYSTEM ─────────────────────────────────────── */
class ParticleSystem {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.particles = [];
    this.mouse   = { x: -9999, y: -9999 };
    this.raf     = null;
    this.paused  = false;

    this._resize      = this._resize.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._tick        = this._tick.bind(this);
  }

  init() {
    this._resize();
    this._spawn();
    window.addEventListener('resize', this._resize, { passive: true });
    window.addEventListener('mousemove', this._onMouseMove, { passive: true });

    // Pause when not visible
    document.addEventListener('visibilitychange', () => {
      this.paused = document.hidden;
      if (!this.paused) this._tick();
    });

    this.raf = requestAnimationFrame(this._tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this._resize);
    window.removeEventListener('mousemove', this._onMouseMove);
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width  = this.canvas.offsetWidth  * dpr;
    this.canvas.height = this.canvas.offsetHeight * dpr;
    this.ctx.scale(dpr, dpr);
    this.w = this.canvas.offsetWidth;
    this.h = this.canvas.offsetHeight;
    this.particles = [];
    this._spawn();
  }

  _spawn() {
    const count = Math.floor((this.w * this.h) / 12000);
    for (let i = 0; i < count; i++) {
      this.particles.push(this._createParticle(true));
    }
  }

  _createParticle(random = false) {
    const types = ['orb', 'line', 'dot'];
    const type  = types[Math.floor(Math.random() * types.length)];
    return {
      x:       Math.random() * this.w,
      y:       random ? Math.random() * this.h : this.h + 20,
      vx:      (Math.random() - 0.5) * 0.35,
      vy:      -(Math.random() * 0.4 + 0.15),
      radius:  Math.random() * 2.5 + 0.5,
      alpha:   0,
      maxAlpha: Math.random() * 0.35 + 0.05,
      life:    0,
      maxLife: Math.random() * 400 + 200,
      type,
      hue:     Math.random() > 0.6 ? 42 : 148,   // gold or sage
      length:  Math.random() * 30 + 10,
      angle:   Math.random() * Math.PI * 2,
      spin:    (Math.random() - 0.5) * 0.015,
    };
  }

  _onMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = e.clientX - rect.left;
    this.mouse.y = e.clientY - rect.top;
  }

  _tick() {
    if (this.paused) return;
    this.raf = requestAnimationFrame(this._tick);

    this.ctx.clearRect(0, 0, this.w, this.h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.angle += p.spin;

      // Mouse repulsion
      const dx   = this.mouse.x - p.x;
      const dy   = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        p.vx -= (dx / dist) * force * 0.6;
        p.vy -= (dy / dist) * force * 0.6;
      }

      // Dampen velocity
      p.vx *= 0.98;
      p.vy *= 0.98;

      p.x += p.vx;
      p.y += p.vy;

      // Fade in/out
      const half = p.maxLife / 2;
      p.alpha = p.life < half
        ? (p.life / half) * p.maxAlpha
        : ((p.maxLife - p.life) / half) * p.maxAlpha;

      if (p.life >= p.maxLife || p.y < -20 || p.x < -20 || p.x > this.w + 20) {
        this.particles[i] = this._createParticle();
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'orb') {
        const g = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 6);
        g.addColorStop(0, `hsla(${p.hue}, 65%, 60%, 0.8)`);
        g.addColorStop(1, `hsla(${p.hue}, 65%, 60%, 0)`);
        this.ctx.fillStyle = g;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius * 6, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (p.type === 'line') {
        this.ctx.strokeStyle = `hsla(${p.hue}, 50%, 65%, 0.6)`;
        this.ctx.lineWidth   = 0.8;
        this.ctx.lineCap     = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(
          p.x - Math.cos(p.angle) * p.length / 2,
          p.y - Math.sin(p.angle) * p.length / 2
        );
        this.ctx.lineTo(
          p.x + Math.cos(p.angle) * p.length / 2,
          p.y + Math.sin(p.angle) * p.length / 2
        );
        this.ctx.stroke();

      } else {
        this.ctx.fillStyle = `hsla(${p.hue}, 60%, 70%, 0.9)`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    // Draw subtle connections
    this._drawConnections();
  }

  _drawConnections() {
    const threshold = 100;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a  = this.particles[i];
        const b  = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < threshold) {
          const strength = ((threshold - d) / threshold) * 0.06;
          this.ctx.save();
          this.ctx.globalAlpha = strength;
          this.ctx.strokeStyle = `rgba(200, 151, 58, 0.8)`;
          this.ctx.lineWidth   = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }
  }
}

/* ─── 2. PARALLAX ────────────────────────────────────────────── */
class Parallax {
  constructor() {
    this.bg      = document.querySelector('.hero__bg');
    this.raf     = null;
    this.tX      = 0;
    this.tY      = 0;
    this.cX      = 0;
    this.cY      = 0;
    this._onScroll    = this._onScroll.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  init() {
    if (!this.bg) return;
    window.addEventListener('scroll', this._onScroll, { passive: true });
    document.addEventListener('mousemove', this._onMouseMove, { passive: true });
    this._raf();
  }

  _onScroll() {
    const y   = window.scrollY;
    this.tY = y * 0.35;
  }

  _onMouseMove(e) {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    this.tX  = (e.clientX - cx) / cx * -12;
    this.tY += (e.clientY - cy) / cy * -6;
  }

  _raf() {
    requestAnimationFrame(() => {
      this.cX += (this.tX - this.cX) * 0.05;
      this.cY += (this.tY - this.cY) * 0.05;
      if (this.bg) {
        this.bg.style.transform = `translate(${this.cX * 0.4}px, ${-this.cY * 0.1}px) scale(1.12)`;
      }
      this._raf();
    });
  }
}

/* ─── 3. NAVBAR ──────────────────────────────────────────────── */
class Navbar {
  constructor() {
    this.el          = document.querySelector('.navbar');
    this.hamburger   = document.querySelector('.navbar__hamburger');
    this.mobileMenu  = document.querySelector('.mobile-menu');
    this.mobileLinks = document.querySelectorAll('.mobile-menu__link');
    this.isOpen      = false;
    this._onScroll   = this._onScroll.bind(this);
  }

  init() {
    if (!this.el) return;

    window.addEventListener('scroll', this._onScroll, { passive: true });
    this._onScroll();

    this.hamburger?.addEventListener('click', () => this.toggleMenu());

    this.mobileLinks.forEach(link => {
      link.addEventListener('click', () => this.closeMenu());
    });
  }

  _onScroll() {
    if (window.scrollY > 80) {
      this.el.classList.add('is-scrolled');
    } else {
      this.el.classList.remove('is-scrolled');
    }
  }

  toggleMenu() {
    this.isOpen ? this.closeMenu() : this.openMenu();
  }

  openMenu() {
    this.isOpen = true;
    this.mobileMenu?.classList.add('is-open');
    document.body.style.overflow = 'hidden';

    const spans = this.hamburger?.querySelectorAll('span');
    if (spans?.length === 3) {
      spans[0].style.transform  = 'translateY(6.5px) rotate(45deg)';
      spans[1].style.opacity    = '0';
      spans[2].style.transform  = 'translateY(-6.5px) rotate(-45deg)';
    }
  }

  closeMenu() {
    this.isOpen = false;
    this.mobileMenu?.classList.remove('is-open');
    document.body.style.overflow = '';

    const spans = this.hamburger?.querySelectorAll('span');
    if (spans?.length === 3) {
      spans[0].style.transform  = '';
      spans[1].style.opacity    = '1';
      spans[2].style.transform  = '';
    }
  }
}

/* ─── 4. SCROLL REVEAL ───────────────────────────────────────── */
class ScrollReveal {
  constructor() {
    this.els = document.querySelectorAll('.reveal');
    this.io  = null;
  }

  init() {
    if (!this.els.length) return;

    const options = { rootMargin: '-10% 0px', threshold: 0.05 };
    this.io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.io.unobserve(entry.target);
        }
      });
    }, options);

    this.els.forEach(el => this.io.observe(el));
  }
}

/* ─── 5. COUNT UP ────────────────────────────────────────────── */
class CountUp {
  constructor() {
    this.targets = document.querySelectorAll('[data-count]');
    this.io      = null;
    this.started = new Set();
  }

  init() {
    if (!this.targets.length) return;

    this.io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.started.has(entry.target)) {
          this.started.add(entry.target);
          this._animate(entry.target);
        }
      });
    }, { threshold: 0.5 });

    this.targets.forEach(t => this.io.observe(t));
  }

  _animate(el) {
    const target   = parseFloat(el.dataset.count);
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;
    const start    = performance.now();

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);   // ease-out-cubic
      const value    = target * eased;

      el.textContent = (Number.isInteger(target)
        ? Math.round(value)
        : value.toFixed(1)) + suffix;

      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }
}

/* ─── 6. TILT CARDS ──────────────────────────────────────────── */
class TiltCards {
  constructor(selector = '.service-card') {
    this.cards    = document.querySelectorAll(selector);
    this.strength = 12;
  }

  init() {
    if (window.matchMedia('(pointer: coarse)').matches) return; // skip touch

    this.cards.forEach(card => {
      card.addEventListener('mousemove', (e) => this._onMove(e, card));
      card.addEventListener('mouseleave', ()   => this._onLeave(card));
    });
  }

  _onMove(e, card) {
    const rect   = card.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const dx     = (e.clientX - cx) / (rect.width  / 2);
    const dy     = (e.clientY - cy) / (rect.height / 2);
    const rotY   =  dx * this.strength;
    const rotX   = -dy * this.strength;
    const glareX = 50 + dx * 30;
    const glareY = 50 + dy * 30;

    card.style.transform  = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`;
    card.style.transition = 'transform 0ms';
    card.style.setProperty('--glare-x', `${glareX}%`);
    card.style.setProperty('--glare-y', `${glareY}%`);
  }

  _onLeave(card) {
    card.style.transform  = '';
    card.style.transition = 'transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1)';
  }
}

/* ─── 7. SCROLL PROGRESS ─────────────────────────────────────── */
class ScrollProgress {
  constructor() {
    this.bar = document.querySelector('.scroll-progress');
  }

  init() {
    if (!this.bar) return;
    window.addEventListener('scroll', () => {
      const docH  = document.documentElement.scrollHeight - window.innerHeight;
      const pct   = docH > 0 ? (window.scrollY / docH) * 100 : 0;
      this.bar.style.width = pct + '%';
    }, { passive: true });
  }
}

/* ─── 8. SMOOTH SCROLL ───────────────────────────────────────── */
class SmoothScroll {
  init() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }
}

/* ─── 9. INIT ────────────────────────────────────────────────── */
function init() {
  // Particle system
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ps = new ParticleSystem(canvas);
    ps.init();
  }

  new Parallax().init();
  new Navbar().init();
  new ScrollReveal().init();
  new CountUp().init();
  new TiltCards().init();
  new ScrollProgress().init();
  new SmoothScroll().init();

  // Hero elements staggered entrance
  setTimeout(() => {
    document.querySelectorAll('.hero-anim').forEach((el, i) => {
      setTimeout(() => {
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, i * 130);
    });
  }, 300);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
