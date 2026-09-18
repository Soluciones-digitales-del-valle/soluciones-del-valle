(() => {
  const header = document.querySelector("[data-header]");
  const hero = document.querySelector("[data-hero]");
  const navToggle = document.querySelector("[data-nav-toggle]");
  const navMobile = document.querySelector("[data-nav-mobile]");
  const yearEl = document.querySelector("[data-year]");
  const revealEls = document.querySelectorAll("[data-reveal]");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  const onScroll = () => {
    if (!header) return;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 10);

    if (hero) {
      const heroBottom = hero.offsetTop + hero.offsetHeight - header.offsetHeight;
      header.classList.toggle("is-over-hero", y < heroBottom - 24);
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  const closeMobileNav = () => {
    if (!navToggle || !navMobile) return;
    navToggle.setAttribute("aria-expanded", "false");
    navMobile.hidden = true;
  };

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", () => {
      const open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navMobile.hidden = open;
    });

    navMobile.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMobileNav);
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth >= 768) closeMobileNav();
    });
  }

  // Detectar foto de sierras si existe
  const landscape = document.querySelector(".hero-landscape");
  if (landscape) {
    const img = new Image();
    img.onload = () => {
      landscape.style.opacity = "1";
    };
    img.src = "assets/hero-sierras.jpg";
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  requestAnimationFrame(() => {
    document.body.classList.add("is-ready");
  });

  if (reduceMotion) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -5% 0px",
    }
  );

  revealEls.forEach((el) => observer.observe(el));
})();
