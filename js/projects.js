(() => {
  const projects = [
    {
      name: "Recorridos",
      tagline: "Recorré antes de vivir tu experiencia.",
      narrative:
        "Una nueva forma de conocer lugares y experiencias antes de visitarlos.",
      description:
        "Plataforma digital de experiencias y recorridos 360° que permite explorar alojamientos, inmuebles y experiencias antes de visitarlos.",
      categories: ["360°", "Experiencias", "Turismo", "Plataforma digital"],
      image: null,
      imageAlt:
        "Composición visual de Recorridos: exploración inmersiva de espacios y territorio",
      visual: "recorridos",
      url: "https://recorridos.com.ar/",
      cta: "Ver proyecto",
      featured: true,
      layout: "featured",
    },
    {
      name: "EcoDICOM",
      tagline: "Tecnología para el trabajo veterinario.",
      narrative:
        "Una herramienta digital pensada para acompañar el trabajo veterinario en campo.",
      description:
        "Aplicación de escritorio diseñada para acompañar el trabajo veterinario en campo, facilitando la gestión y organización de estudios de ecografía.",
      categories: ["Software", "Veterinaria", "Gestión", "Desktop"],
      image: null,
      imageAlt:
        "Composición visual de EcoDICOM: interfaz de gestión de estudios de ecografía",
      visual: "ecodicom",
      url: null,
      cta: null,
      featured: false,
      layout: "offset",
    },
    {
      name: "Serpentario Machaqway",
      tagline: "Conocer para cuidar.",
      narrative:
        "Una presencia digital clara para un proyecto familiar de Traslasierra dedicado a la fauna.",
      description:
        "Sitio web del Serpentario Machaqway, en Villa de Las Rosas, para presentar el espacio, la visita y su trabajo de educación, investigación y protección de serpientes y otros animales de la fauna argentina.",
      categories: ["Web", "Educación", "Territorio", "Turismo"],
      image: null,
      imageAlt:
        "Composición visual de Serpentario Machaqway: silueta de serpiente sobre el paisaje de Traslasierra",
      visual: "machaqway",
      url: "https://serpentariomachaqway.com.ar/",
      cta: "Ver proyecto",
      featured: false,
      layout: "featured",
    },
  ];

  const escapeHtml = (value) =>
    String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const renderVisual = (project) => {
    if (project.image) {
      return `<img
        class="portfolio-media-img"
        src="${escapeHtml(project.image)}"
        alt="${escapeHtml(project.imageAlt || project.name)}"
        loading="lazy"
        decoding="async"
      />`;
    }

    if (project.visual === "recorridos") {
      return `
        <div class="portfolio-visual portfolio-visual--recorridos" aria-hidden="true">
          <span class="portfolio-visual-stars"></span>
          <span class="portfolio-visual-ring portfolio-visual-ring--outer"></span>
          <span class="portfolio-visual-ring portfolio-visual-ring--inner"></span>
          <span class="portfolio-visual-horizon"></span>
          <span class="portfolio-visual-label">360°</span>
        </div>
      `;
    }

    if (project.visual === "machaqway") {
      return `
        <div class="portfolio-visual portfolio-visual--machaqway" aria-hidden="true">
          <span class="portfolio-visual-stars"></span>
          <svg class="portfolio-visual-snake" viewBox="0 0 320 180" fill="none">
            <path
              class="portfolio-visual-snake-body"
              d="M28 128
                 C58 98 78 72 108 78
                 C142 85 152 128 186 134
                 C224 141 246 108 268 92
                 C286 80 298 74 308 70"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <ellipse class="portfolio-visual-snake-head" cx="312" cy="68" rx="7" ry="4.5" transform="rotate(-28 312 68)" />
            <circle class="portfolio-visual-snake-eye" cx="314" cy="66.5" r="1.1" />
          </svg>
          <span class="portfolio-visual-label">Traslasierra</span>
        </div>
      `;
    }

    if (project.visual === "ecodicom") {
      return `
        <div class="portfolio-visual portfolio-visual--ecodicom" aria-hidden="true">
          <span class="portfolio-visual-stars"></span>
          <div class="portfolio-visual-window">
            <span class="portfolio-visual-chrome">
              <i></i><i></i><i></i>
            </span>
            <span class="portfolio-visual-scan"></span>
            <span class="portfolio-visual-panel"></span>
            <span class="portfolio-visual-panel portfolio-visual-panel--side"></span>
          </div>
        </div>
      `;
    }

    return `<div class="portfolio-visual" aria-hidden="true"></div>`;
  };

  const renderCta = (project) => {
    if (!project.url || !project.cta) return "";

    const label = escapeHtml(project.cta);
    const arrow = `<span class="portfolio-cta-arrow" aria-hidden="true">→</span>`;

    return `<a
      class="portfolio-cta"
      href="${escapeHtml(project.url)}"
      target="_blank"
      rel="noopener noreferrer"
    >${label} ${arrow}</a>`;
  };

  const renderProject = (project, index) => {
    const delay = index % 2 === 1 ? ` data-delay="1"` : "";
    const layout = project.layout || (project.featured ? "featured" : "offset");
    const categories = (project.categories || [])
      .map((cat) => `<li>${escapeHtml(cat)}</li>`)
      .join("");

    return `
      <article
        class="portfolio-item portfolio-item--${escapeHtml(layout)} reveal"
        data-reveal${delay}
      >
        <div
          class="portfolio-media"
          ${
            project.image
              ? ""
              : `role="img" aria-label="${escapeHtml(
                  project.imageAlt || project.name
                )}"`
          }
        >
          ${renderVisual(project)}
          <span class="portfolio-media-accent" aria-hidden="true"></span>
        </div>
        <div class="portfolio-content">
          <p class="portfolio-name">${escapeHtml(project.name)}</p>
          ${
            project.tagline
              ? `<p class="portfolio-tagline">${escapeHtml(project.tagline)}</p>`
              : ""
          }
          ${
            project.narrative
              ? `<p class="portfolio-narrative">${escapeHtml(project.narrative)}</p>`
              : ""
          }
          <p class="portfolio-description">${escapeHtml(project.description)}</p>
          <ul class="portfolio-cats" aria-label="Categorías">
            ${categories}
          </ul>
          ${renderCta(project)}
        </div>
      </article>
    `;
  };

  const root = document.querySelector("[data-projects]");
  if (!root) return;

  root.innerHTML = projects.map(renderProject).join("");
})();
