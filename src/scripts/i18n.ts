type Language = "es" | "en";

const translations: Record<Language, Record<string, string>> = {
  es: {
    "nav.about": "sobre mí",
    "nav.projects": "proyectos",
    "nav.certificates": "certificados",
    "nav.skills": "habilidades",
    "nav.contact": "contacto",
    "hero.availability": "Disponible para trabajar",
    "hero.description": "Especializado en crear aplicaciones full-stack escalables. Conecto sistemas backend de alto rendimiento con experiencias frontend inmersivas y cinematográficas.",
    "hero.work": "Ver proyectos",
    "hero.contact": "Contacto",
    "about.label": "Sobre mí",
    "about.title": "Convirtiendo ideas en <span>realidad digital</span>",
    "about.intro": "Hola, soy <strong>Pablo Montero</strong>, enfocado en arquitectura de sistemas y desarrollo de productos. Me apasiona transformar problemas complejos en experiencias digitales de alto impacto, priorizando siempre el <strong>código limpio</strong>, la escalabilidad y el diseño centrado en el usuario.",
    "about.experience": "A lo largo de mi carrera, he dominado diversos <strong>paradigmas de programación</strong> y <strong>frameworks</strong> líderes en la industria, lo que me permite diseñar soluciones flexibles y potentes. Mi experiencia va más allá de escribir código: me enfoco en todo el ciclo de vida del software, desde diseñar <strong>arquitecturas escalables</strong> y gestionar sistemas de datos complejos hasta <strong>automatizar despliegues</strong>.",
    "about.education": "Educación",
    "about.semester": "Actualmente en mi <span>séptimo semestre</span>",
    "about.communication": "Comunicación efectiva",
    "about.communicationText": "Creo en una comunicación clara y transparente.",
    "about.values": "Valores",
    "about.valuesText": "La integridad, el respeto y la empatía son mis valores fundamentales.",
    "cert.label": "Logros",
    "cert.title": "Certificados",
    "cert.description": "Certificaciones profesionales y logros que validan mi experiencia.",
    "cert.instructions": "Arrastra para navegar • Haz clic para ampliar",
    "skills.label": "Lo que hago",
    "skills.title": "Mis <span>habilidades</span>",
    "contact.label": "Contáctame",
    "contact.title": "Trabajemos <span>juntos</span>",
    "contact.description": "Siempre estoy abierto a conversar sobre nuevos proyectos, ideas creativas u oportunidades para ser parte de tu visión.",
    "contact.heading": "Hablemos sobre tu proyecto",
    "contact.subheading": "Completa el formulario y te responderé lo antes posible.",
    "contact.find": "Encuéntrame en",
    "contact.name": "Nombre",
    "contact.namePlaceholder": "Tu nombre",
    "contact.subject": "Asunto",
    "contact.subjectPlaceholder": "¿De qué se trata?",
    "contact.message": "Mensaje",
    "contact.messagePlaceholder": "Cuéntame sobre tu proyecto...",
    "contact.send": "Enviar mensaje",
    "projects.label": "Trabajo destacado",
    "projects.title": "Proyectos",
    "projects.description": "Una selección de proyectos en los que he trabajado",
    "projects.name": "Nombre del proyecto",
    "projects.type": "Tipo",
    "projects.technologies": "Tecnologías",
    "projects.viewAll": "Ver todos los proyectos",
    "projects.features": "funcionalidades",
    "projects.viewCode": "Ver código",
    "projects.live": "Ver proyecto",
    "projects.close": "Cerrar",
    "language.switch": "English",
    "language.aria": "Cambiar idioma a inglés",
  },
  en: {
    "nav.about": "about",
    "nav.projects": "projects",
    "nav.certificates": "certificates",
    "nav.skills": "skills",
    "nav.contact": "contact",
    "hero.availability": "Available for work",
    "hero.description": "Specializing in building scalable, full-stack applications. I bridge the gap between high-performance back-end systems and immersive, cinematic front-end experiences.",
    "hero.work": "View Work",
    "hero.contact": "Contact",
    "about.label": "About Me",
    "about.title": "Turning ideas into <span>digital reality</span>",
    "about.intro": "Hi, I'm <strong>Pablo Montero</strong>, focused on system architecture and product engineering. I thrive on transforming complex problems into high-impact digital experiences, always prioritizing <strong>clean code</strong>, scalability, and user-centric design.",
    "about.experience": "Throughout my career, I have mastered diverse <strong>programming paradigms</strong> and industry-leading <strong>frameworks</strong>, allowing me to architect solutions that are both flexible and powerful. My expertise goes beyond writing code; I focus on the complete software lifecycle—from designing <strong>scalable architectures</strong> and managing complex data systems to <strong>automating deployments</strong>.",
    "about.education": "Education",
    "about.semester": "Currently in my <span>7th semester</span>",
    "about.communication": "Effective Communication",
    "about.communicationText": "I believe in clear, transparent communication.",
    "about.values": "Values",
    "about.valuesText": "Integrity, respect, and empathy are my core values.",
    "cert.label": "Achievements",
    "cert.title": "Certificates",
    "cert.description": "Professional certifications and achievements that validate my expertise.",
    "cert.instructions": "Drag to navigate • Click to expand",
    "skills.label": "What I Work With",
    "skills.title": "My <span>Skills</span>",
    "contact.label": "Get In Touch",
    "contact.title": "Let's work <span>together</span>",
    "contact.description": "I'm always open to discussing new projects, creative ideas, or opportunities to be part of your vision.",
    "contact.heading": "Let's talk about your project",
    "contact.subheading": "Fill out the form and I'll get back to you as soon as possible.",
    "contact.find": "Find me on",
    "contact.name": "Name",
    "contact.namePlaceholder": "Your name",
    "contact.subject": "Subject",
    "contact.subjectPlaceholder": "What's this about?",
    "contact.message": "Message",
    "contact.messagePlaceholder": "Tell me about your project...",
    "contact.send": "Send Message",
    "projects.label": "Featured Work",
    "projects.title": "Projects",
    "projects.description": "A selection of projects I've worked on",
    "projects.name": "Project Name",
    "projects.type": "Type",
    "projects.technologies": "Technologies",
    "projects.viewAll": "View all projects",
    "projects.features": "Features",
    "projects.viewCode": "View Code",
    "projects.live": "View Project",
    "projects.close": "Close",
    "language.switch": "Español",
    "language.aria": "Switch language to Spanish",
  },
};

export const getLanguage = (): Language =>
  (typeof window !== "undefined" && (localStorage.getItem("language") as Language)) || "es";

export const getTranslation = (key: string, language = getLanguage()) =>
  translations[language][key] || translations.es[key] || key;

const updateLanguage = (language: Language) => {
  localStorage.setItem("language", language);
  document.documentElement.lang = language;
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
    element.textContent = getTranslation(element.dataset.i18n || "", language);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((element) => {
    element.innerHTML = getTranslation(element.dataset.i18nHtml || "", language);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", getTranslation(element.dataset.i18nAria || "", language));
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = getTranslation(element.dataset.i18nPlaceholder || "", language);
  });
  document.querySelectorAll<HTMLElement>("[data-language-label]").forEach((element) => {
    element.textContent = getTranslation("language.switch", language);
  });
  window.dispatchEvent(new CustomEvent("language-change", { detail: language }));
};

const initI18n = () => {
  document.querySelectorAll<HTMLButtonElement>("[data-language-toggle]").forEach((button) => {
    button.onclick = () => updateLanguage(getLanguage() === "es" ? "en" : "es");
  });
  updateLanguage(getLanguage());
};

if (typeof document !== "undefined") {
  document.addEventListener("astro:page-load", initI18n);
}
