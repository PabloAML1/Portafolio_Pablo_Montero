const initNavbar = () => {
  // 1. AÑADIMOS 'as HTMLElement' AQUÍ PARA QUE TS NO SE QUEJE
  const nav = document.getElementById("main-nav");
  const bar = document.getElementById("scroll-progress") as HTMLElement;
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const mobileLinks = document.querySelectorAll(".mobile-link");
  const hamburgerLines = document.querySelectorAll(".hamburger-line");
  const menuOverlay = document.getElementById("menu-overlay");

  let isMenuOpen = false;

  const onScroll = () => {
    const scrollTop = window.scrollY;
    
    // Barra de progreso
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const percent = (scrollTop / docHeight) * 100;
    
    // TypeScript ya sabe que 'bar' es HTMLElement gracias al cambio arriba
    if (bar) bar.style.width = percent + "%";

    // Navbar Blur
    if (nav) {
      if (scrollTop > 20) {
        nav.classList.add("bg-black/40", "backdrop-blur-md", "shadow-sm");
        nav.classList.remove("opacity-0"); 
      } else {
        nav.classList.remove("bg-black/40", "backdrop-blur-md", "shadow-sm");
      }
    }
  };

  onScroll();
  window.removeEventListener("scroll", onScroll);
  window.addEventListener("scroll", onScroll);

  const toggleMenu = () => {
    isMenuOpen = !isMenuOpen;

    if (mobileMenu) {
      if (isMenuOpen) {
        mobileMenu.classList.remove("translate-x-full");
        mobileMenu.classList.add("translate-x-0");
        document.body.style.overflow = "hidden";
      } else {
        mobileMenu.classList.add("translate-x-full");
        mobileMenu.classList.remove("translate-x-0");
        document.body.style.overflow = "";
      }
    }

    if (menuOverlay) {
      if (isMenuOpen) {
        menuOverlay.classList.remove("opacity-0", "pointer-events-none");
        menuOverlay.classList.add("opacity-100", "pointer-events-auto");
      } else {
        menuOverlay.classList.add("opacity-0", "pointer-events-none");
        menuOverlay.classList.remove("opacity-100", "pointer-events-auto");
      }
    }

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", isMenuOpen.toString());
    }

    // 2. CORRECCIÓN IMPORTANTE PARA EL HAMBURGUESA
    // Convertimos NodeList a Array y forzamos el tipo
    const lines = Array.from(hamburgerLines) as HTMLElement[];

    if (lines.length === 3) {
      const [line1, line2, line3] = lines;
      if (isMenuOpen) {
        line1.style.transform = "translateY(8px) rotate(45deg)";
        line2.style.opacity = "0";
        line3.style.transform = "translateY(-8px) rotate(-45deg)";
      } else {
        line1.style.transform = "";
        line2.style.opacity = "1";
        line3.style.transform = "";
      }
    }
  };

  if (menuToggle) {
    // Usamos onclick para limpiar referencias viejas automáticamente
    menuToggle.onclick = toggleMenu;
  }

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isMenuOpen) toggleMenu();
    });
  });

  if (menuOverlay) {
    menuOverlay.addEventListener("click", () => {
      if (isMenuOpen) toggleMenu();
    });
  }

  const onResize = () => {
    if (window.innerWidth >= 768 && isMenuOpen) {
      toggleMenu();
    }
  };
  window.removeEventListener("resize", onResize);
  window.addEventListener("resize", onResize);

  const onKeydown = (e: KeyboardEvent) => { // Especificamos el tipo de evento
    if (e.key === "Escape" && isMenuOpen) {
      toggleMenu();
    }
  };
  document.removeEventListener("keydown", onKeydown as EventListener);
  document.addEventListener("keydown", onKeydown as EventListener);
};

document.addEventListener('astro:page-load', initNavbar);