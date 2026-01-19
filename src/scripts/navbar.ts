// Scroll progress bar y navbar
const initNavbar = () => {
    const nav = document.getElementById("main-nav");
    const bar = document.getElementById("scroll-progress");
    const menuToggle = document.getElementById("menu-toggle");
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileLinks = document.querySelectorAll(".mobile-link");
    const hamburgerLines = document.querySelectorAll(".hamburger-line");
    const menuOverlay = document.getElementById("menu-overlay");

    let isMenuOpen = false;

    // Scroll progress
    window.addEventListener("scroll", () => {
        const scrollTop = window.scrollY;
        const height =
            document.documentElement.scrollHeight - window.innerHeight;
        const percent = (scrollTop / height) * 100;

        if (bar) bar.style.width = percent + "%";

        if (nav) {
            if (scrollTop > 20) nav.classList.add("nav-scrolled");
            else nav.classList.remove("nav-scrolled");
        }
    });

    // Mobile menu toggle
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

        // Toggle overlay blur
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

        // Animate hamburger to X
        if (hamburgerLines.length === 3) {
            const [line1, line2, line3] = hamburgerLines as unknown as HTMLElement[];
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
        menuToggle.addEventListener("click", toggleMenu);
    }

    // Close menu when clicking a link
    mobileLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (isMenuOpen) {
                toggleMenu();
            }
        });
    });

    // Close menu when clicking the overlay
    if (menuOverlay) {
        menuOverlay.addEventListener("click", () => {
            if (isMenuOpen) {
                toggleMenu();
            }
        });
    }

    // Close menu on resize to desktop
    window.addEventListener("resize", () => {
        if (window.innerWidth >= 768 && isMenuOpen) {
            toggleMenu();
        }
    });

    // Close menu with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && isMenuOpen) {
            toggleMenu();
        }
    });
};

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbar);
} else {
    initNavbar();
}
