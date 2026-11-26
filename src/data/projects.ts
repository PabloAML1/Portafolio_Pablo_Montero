export interface Project {
    id: number;
    title: string;
    type: string;
    technologies: string[];
    img: string;
    images?: string[]; // Gallery images
    slug: string;
    description: string;
    longDescription: string;
    features: string[];
    github: string | null;
    live: string | null;
}

export const projects: Project[] = [
    {
        id: 1,
        title: "Fuel System",
        type: "Full Stack",
        technologies: ["NextJS", "NestJS", "PostgreSQL", "MongoDB", "Kubernetes", "Google Cloud"],
        img: "/images/Projects/Project1_1.webp",
        images: [
            "/images/Projects/Project1_1.webp",
            "/images/Projects/Project1_2.webp",
            "/images/Projects/Project1_3.webp",
            "/images/Projects/Project1_4.webp",
        ],
        slug: "fuel-system",
        description:
            "A system designed to control fuel consumption along transportation routes.",
        longDescription: `A scalable and resilient distributed system focused on fuel management, trip planning, and route monitoring.
Implemented using NestJS microservices, TypeScript, PostgreSQL on Neon, and containerized deployment on Google Kubernetes.
Features real-time data updates, automated notifications, and third-party API integrations.`,
        features: [
            "User authentication and authorization",
            "Microservices architecture",
            "Distributed databases",
            "Fuel analytics reports",
            "Admin dashboard",
            "Google Cloud deployment",
            "Monorepo architecture",
        ],
        github: "https://github.com/orgs/Application-Distributed-Gasoline-System/repositories",
        live: "No Disponible",
    },
    {
        id: 2,
        title: "Hospital Control Center",
        type: "Full Stack",
        technologies: [
            "React",
            "Node.js",
            "Express",
            "MySQL",
            "Docker",
            "Docker Compose"
        ],
        img: "/images/Projects/Project2_1.webp",
        images: [
            "/images/Projects/Project2_1.webp",
            "/images/Projects/Project2_2.webp",
            "/images/Projects/Project2_3.webp",
            "/images/Projects/Project2_4.webp",
        ],
        slug: "hospital-control-center",
        description:
            "A web platform designed to manage hospitals, medical staff, and patient consultations from a centralized control system.",
        longDescription: `A full stack hospital management system built to explore distributed databases and containerized environments.
The platform includes a Node.js backend, a React frontend for administrators and hospitals, and a Docker-based infrastructure with MySQL replication.
It features a master database with multiple replicas to simulate a real-world distributed architecture for high availability and data consistency.`,
        features: [
            "Hospital and medical staff management",
            "Patient consultation records",
            "User authentication with role-based access",
            "Distributed MySQL databases with replication",
            "Dockerized local environment",
            "Admin and hospital dashboards",
            "Master–replica database architecture"
        ],
        github: "https://github.com/PabloAML1/Prueba_Parcial",
        live: "No Disponible",
    },

    {
        id: 3,
        title: "BookingView – Hotel Booking Platform",
        type: "Full Stack",
        technologies: [
            "React",
            "Vite",
            "React Native",
            "Node.js",
            "Express",
            "MongoDB",
            "Stripe",
            "Clerk",
            "Cloudinary",
            "Tailwind CSS"
        ],
        img: "/images/Projects/Project3_1.webp",
        images: [
            "/images/Projects/Project3_1.webp",
            "/images/Projects/Project3_2.webp",
            "/images/Projects/Project3_3.webp",
            "/images/Projects/Project3_4.webp",
            "/images/Projects/Project3_5.webp",
            "/images/Projects/Project3_6.webp",
            "/images/Projects/Project3_7.webp",
            "/images/Projects/Project3_8.webp",
        ],
        slug: "bookingview-hotel-booking",
        description:
            "A full stack hotel booking platform available on web and mobile, connecting hotel owners with travelers.",
        longDescription: `BookingView is a full stack web and mobile application that allows users to search, book, and manage hotel accommodations.
It features secure authentication with Clerk, online payments through Stripe, and an admin dashboard for managing hotels and reservations.`,
        features: [
            "Web and mobile apps (React & React Native)",
            "Role-based authentication",
            "Hotel and room management",
            "Search and booking system",
            "Stripe payment integration",
            "Admin dashboard"
        ],
        github: "https://github.com/DaGeus15/BookingView",
        live: "https://bookingview.vercel.app/",
    },
    {
        id: 4,
        title: "GPIS Project – Authentication Platform",
        type: "Full Stack",
        technologies: [
            "React",
            "Vite",
            "TypeScript",
            "Node.js",
            "NestJS",
            "TanStack Query",
            "React Hook Form",
            "Zod",
            "Tailwind CSS",
            "shadcn/ui"
        ],
        img: "/images/Projects/Project4_1.webp",
        images: [
            "/images/Projects/Project4_1.webp",
            "/images/Projects/Project4_2.webp",
            "/images/Projects/Project4_3.webp",
            "/images/Projects/Project4_4.webp",
            "/images/Projects/Project4_5.webp",
            "/images/Projects/Project4_6.webp",
            "/images/Projects/Project4_7.webp",
        ],
        slug: "gpis-authentication-platform",
        description:
            "A full stack authentication platform featuring user login, registration, and secure form validation.",
        longDescription: `GPIS is a full stack web application that delivers a complete user authentication system.
It combines a modern React and TypeScript frontend with a robust NestJS backend.
The platform includes client-side form validation, efficient state management, and a clean, modern UI.`,
        features: [
            "User authentication (login & signup)",
            "Client-side form validation",
            "State management with TanStack Query",
            "Modern UI components",
            "NestJS backend with TypeScript",
            "Client-side routing",
            "End-to-end type safety"
        ],
        github: "https://github.com/PabloAML1/proyecto_gpis",
        live: "No Disponible",
    }

];

export const spanishProjects: Record<number, Pick<Project, "title" | "type" | "description" | "longDescription" | "features">> = {
    1: {
        title: 'Sistema de combustible',
        type: 'Full Stack',
        description: 'Sistema diseñado para controlar el consumo de combustible en rutas de transporte.',
        longDescription: `Sistema distribuido para gestionar combustible, planificar viajes y monitorear rutas.
Utiliza microservicios con NestJS y TypeScript, PostgreSQL en Neon y un despliegue con contenedores en Google Kubernetes Engine.
Incluye actualizaciones en tiempo real, notificaciones automáticas e integraciones con APIs de terceros.`,
        features: ['Autenticación y autorización de usuarios', 'Arquitectura de microservicios', 'Bases de datos distribuidas', 'Informes de análisis de combustible', 'Panel de administración', 'Despliegue en Google Cloud', 'Arquitectura monorepo'],
    },
    2: {
        title: 'Centro de control hospitalario',
        type: 'Full Stack',
        description: 'Plataforma web diseñada para gestionar hospitales, personal médico y consultas de pacientes desde un sistema centralizado.',
        longDescription: `Sistema full stack de gestión hospitalaria desarrollado para explorar bases de datos distribuidas y entornos con contenedores.
Incluye un backend en Node.js, una interfaz en React para administradores y hospitales, e infraestructura con Docker y replicación de MySQL.
Una base de datos principal con varias réplicas permite simular una arquitectura distribuida y explorar la alta disponibilidad y la consistencia de los datos.`,
        features: ['Gestión de hospitales y personal médico', 'Registros de consultas de pacientes', 'Autenticación con acceso por roles', 'Bases de datos MySQL distribuidas con replicación', 'Entorno local con Docker', 'Paneles de administración y hospitales', 'Arquitectura de base de datos maestro-réplica'],
    },
    3: {
        title: 'BookingView – Plataforma hotelera',
        type: 'Full Stack',
        description: 'Plataforma full stack de reservas hoteleras para web y móvil que conecta propietarios de hoteles con viajeros.',
        longDescription: `BookingView es una aplicación full stack para buscar, reservar y gestionar alojamientos desde la web y el móvil.
Integra autenticación con Clerk, pagos en línea con Stripe y un panel de administración de hoteles y reservas.`,
        features: ['Aplicaciones web y móvil (React y React Native)', 'Autenticación basada en roles', 'Gestión de hoteles y habitaciones', 'Sistema de búsqueda y reservas', 'Integración de pagos con Stripe', 'Panel de administración'],
    },
    4: {
        title: 'Proyecto GPIS – Plataforma de autenticación',
        type: 'Full Stack',
        description: 'Plataforma full stack de autenticación con inicio de sesión, registro y validación segura de formularios.',
        longDescription: `GPIS es una aplicación web full stack con un sistema de autenticación de usuarios.
Combina un frontend en React y TypeScript con un backend en NestJS.
Incluye validación de formularios del lado del cliente y gestión de estado para los flujos de registro e inicio de sesión.`,
        features: ['Autenticación de usuarios (inicio de sesión y registro)', 'Validación de formularios en el cliente', 'Gestión de estado con TanStack Query', 'Componentes de interfaz modernos', 'Backend NestJS con TypeScript', 'Enrutamiento del cliente', 'Seguridad de tipos de extremo a extremo'],
    },
};
