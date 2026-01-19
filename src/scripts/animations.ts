import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Esperar a que el DOM esté listo
const initAnimations = () => {
  const hero = document.getElementById("hero");
  const heroImage = document.getElementById("hero-image");
  const heroElements = document.querySelectorAll("[data-hero-animate]");
  const navbar = document.getElementById("main-nav");

  if (!hero) {
    console.error('Hero element not found');
    return;
  }

  // Timeline para animaciones de entrada
  const tl = gsap.timeline({
    defaults: {
      ease: "power3.out",
      duration: 0.8
    }
  });

  // Animar imagen del hero (desde la izquierda)
  if (heroImage) {
    tl.fromTo(heroImage,
      {
        opacity: 0,
        x: -60,
        scale: 0.95
      },
      {
        opacity: 1,
        x: 0,
        scale: 1,
        duration: 1
      },
      0.2
    );
  }



  // Animar elementos de texto con stagger (efecto escalonado)
  if (heroElements.length > 0) {
    tl.fromTo(heroElements,
      {
        opacity: 0,
        y: 30,
        filter: "blur(12px)",
      },
      {
        opacity: 1,
        y: 0,
        stagger: 0.1,
        duration: 0.7,
        filter: "blur(0px)",
      },
      0.3
    );
  }

  // Animar nav desde arriba
  if (navbar) {
    tl.fromTo(
      navbar,
      {
        opacity: 0,
        y: -40,
        filter: "blur(10px)"
      },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.5,
        ease: "power4.out"
      }, 0.7
    );
  }


  // Animación para desvanecer el hero al hacer scroll
  gsap.to(hero, {
    opacity: 0,
    y: 70,
    ease: "none",
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: 0.5
    }
  });
};

// Ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}