const skillCategories = [
  {
    title: "Frontend", key: "skills.frontend",
    skills: [
      ["Astro", "astro", "#b6431e", "Sitios rápidos con componentes interactivos donde hacen falta.", "Fast websites with interactive components where needed."],
      ["React", "react", "#087d92", "Interfaces interactivas compuestas por componentes reutilizables.", "Interactive interfaces built from reusable components."],
      ["Angular", "angular", "#b90c51", "Aplicaciones web con una estructura modular e inyección de dependencias.", "Web applications with modular structure and dependency injection."],
      ["Next.js", "nextjs", "#20242d", "Aplicaciones React con enrutamiento y renderizado en el servidor.", "React applications with routing and server-side rendering."],
      ["Tailwind", "tailwindcss", "#08758f", "Interfaces responsivas con clases de utilidad.", "Responsive interfaces built with utility classes."],
    ],
  },
  {
    title: "Backend", key: "skills.backend",
    skills: [
      ["NestJS", "nestjs", "#b31c46", "APIs y microservicios con una arquitectura modular.", "APIs and microservices with modular architecture."],
      ["Laravel", "laravel", "#b6322b", "Aplicaciones web y APIs con el ecosistema PHP.", "Web applications and APIs in the PHP ecosystem."],
      ["Node.js", "nodejs", "#397d37", "Servicios JavaScript y procesamiento asíncrono en el servidor.", "JavaScript services and asynchronous server-side processing."],
      ["TypeScript", "typescript", "#316eb0", "Tipos estáticos para mantener contratos claros en el código.", "Static types that keep code contracts clear."],
      ["Java", "java", "#ad4c25", "Aplicaciones y servicios con tipado estático en la JVM.", "Statically typed applications and services on the JVM."],
      ["PHP", "php", "#565c99", "Desarrollo de aplicaciones web del lado del servidor.", "Server-side web application development."],
      ["Python", "python", "#306697", "Automatización de tareas y desarrollo de servicios.", "Task automation and service development."],
    ],
  },
  {
    title: "DevOps y nube", key: "skills.cloud",
    skills: [
      ["Azure", "azure", "#0b6fae", "Servicios de nube para desplegar y operar aplicaciones.", "Cloud services for deploying and operating applications."],
      ["Google Cloud", "googlecloud", "#2b65bc", "Infraestructura y servicios gestionados en la nube.", "Cloud infrastructure and managed services."],
      ["Jenkins", "jenkins", "#a84037", "Pipelines que automatizan compilaciones, pruebas y despliegues.", "Pipelines that automate builds, tests, and deployments."],
      ["GitHub Actions", "githubactions", "#285da5", "Flujos de integración y entrega continua desde GitHub.", "Continuous integration and delivery workflows on GitHub."],
      ["Docker", "docker", "#0977b5", "Contenedores reproducibles para desarrollo y despliegue.", "Reproducible containers for development and deployment."],
      ["Kubernetes", "kubernetes", "#365dca", "Orquestación de contenedores y escalado de servicios.", "Container orchestration and service scaling."],
      ["Linux", "linux", "#8e681a", "Entornos de servidor, terminal y administración de procesos.", "Server environments, shell tooling, and process management."],
    ],
  },
  {
    title: "Bases de datos", key: "skills.databases",
    skills: [
      ["SQL Server", "microsoftsqlserver", "#ac2936", "Modelado y consultas con el motor relacional de Microsoft.", "Data modeling and queries in Microsoft's relational engine."],
      ["MySQL", "mysql", "#24627b", "Persistencia relacional, consultas y replicación de datos.", "Relational persistence, queries, and data replication."],
      ["Oracle", "oracle", "#b91f18", "Modelado relacional y consultas SQL.", "Relational modeling and SQL queries."],
      ["MongoDB", "mongodb", "#197044", "Persistencia de datos en documentos de estructura flexible.", "Persistence using documents with flexible structure."],
      ["PostgreSQL", "postgresql", "#34618a", "Datos relacionales con transacciones y consultas avanzadas.", "Relational data with transactions and advanced queries."],
    ],
  },
  {
    title: "Herramientas y calidad", key: "skills.tools",
    skills: [
      ["SonarQube", "sonarqube", "#23678e", "Análisis estático para detectar problemas de calidad en el código.", "Static analysis for finding code quality issues."],
      ["Swagger", "swagger", "#447412", "Documentación interactiva de APIs a partir de especificaciones OpenAPI.", "Interactive API documentation from OpenAPI specifications."],
      ["GitHub", "github", "#24272b", "Control de versiones colaborativo y revisión de código.", "Collaborative version control and code review."],
    ],
  },
] as const;

const shortcuts = "QWERTYUIOASDFGHJKLZXCVBNM,.";

export const skills = skillCategories.flatMap(({ skills, key, title }) =>
  skills.map(([name, logo, color, es, en]) => ({ name, logo, color, es, en, category: key, categoryTitle: title })),
).map((skill, index) => ({ ...skill, shortcut: shortcuts[index] }));
