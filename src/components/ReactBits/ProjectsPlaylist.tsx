import React, { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { projects, type Project } from '../../data/projects';

export const ProjectsPlaylist: React.FC = () => {
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [expandedProject, setExpandedProject] = useState<Project | null>(null);
    const [isExpanding, setIsExpanding] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const previewRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const expandedRef = useRef<HTMLDivElement>(null);
    const expandedImageRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const footerLineRef = useRef<HTMLDivElement>(null);
    const rowRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
    const galleryImageRef = useRef<HTMLImageElement>(null);

    // Get current gallery images
    const galleryImages = expandedProject?.images || (expandedProject ? [expandedProject.img] : []);

    // Gallery navigation
    const goToPrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (galleryImages.length <= 1) return;

        const newIndex = currentImageIndex === 0 ? galleryImages.length - 1 : currentImageIndex - 1;

        // Animate transition
        if (galleryImageRef.current) {
            gsap.to(galleryImageRef.current, {
                opacity: 0,
                x: 50,
                duration: 0.2,
                ease: "power2.in",
                onComplete: () => {
                    setCurrentImageIndex(newIndex);
                    gsap.fromTo(galleryImageRef.current,
                        { opacity: 0, x: -50 },
                        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
                    );
                }
            });
        } else {
            setCurrentImageIndex(newIndex);
        }
    };

    const goToNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (galleryImages.length <= 1) return;

        const newIndex = currentImageIndex === galleryImages.length - 1 ? 0 : currentImageIndex + 1;

        // Animate transition
        if (galleryImageRef.current) {
            gsap.to(galleryImageRef.current, {
                opacity: 0,
                x: -50,
                duration: 0.2,
                ease: "power2.in",
                onComplete: () => {
                    setCurrentImageIndex(newIndex);
                    gsap.fromTo(galleryImageRef.current,
                        { opacity: 0, x: 50 },
                        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
                    );
                }
            });
        } else {
            setCurrentImageIndex(newIndex);
        }
    };

    // Reset image index when project changes
    useEffect(() => {
        setCurrentImageIndex(0);
    }, [expandedProject?.id]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!previewRef.current || !containerRef.current || expandedProject) return;

        // Position preview near cursor
        gsap.to(previewRef.current, {
            left: e.clientX + 20,
            top: e.clientY - 100,
            duration: 0.3,
            ease: "power2.out"
        });
    };

    const handleMouseEnter = (project: Project) => {
        if (expandedProject) return;
        setActiveProject(project);

        // grayscale + sepia filter, show preview
        gsap.to(previewRef.current, {
            opacity: 1,
            scale: 1,
            duration: 0.4,
            ease: "power2.out"
        });
    };

    const handleMouseLeave = () => {
        if (expandedProject) return;
        setActiveProject(null);
        gsap.to(previewRef.current, {
            opacity: 0,
            scale: 0.75,
            duration: 0.3,
            ease: "power2.in"
        });
    };

    // Also hide preview when leaving the entire container
    const handleContainerLeave = () => {
        if (expandedProject) return;
        setActiveProject(null);
        gsap.killTweensOf(previewRef.current);
        gsap.set(previewRef.current, {
            opacity: 0,
            scale: 0.75
        });
    };

    const handleClick = async (project: Project) => {
        if (isExpanding || expandedProject || isClosing) return;
        setIsExpanding(true);

        // Hide navbar
        const navbar = document.getElementById('main-nav');
        if (navbar) {
            gsap.to(navbar, {
                y: -100,
                opacity: 0,
                duration: 0.5,
                ease: "power3.inOut"
            });
        }

        // Get preview current position and size
        const previewRect = previewRef.current?.getBoundingClientRect();

        // Store initial preview state for morphing
        if (previewRef.current && previewRect) {
            gsap.set(previewRef.current, {
                position: 'fixed',
                left: previewRect.left,
                top: previewRect.top,
                x: 0,
                y: 0,
                width: previewRect.width,
                height: previewRect.height,
                zIndex: 200
            });
        }

        // Show overlay with slight delay
        gsap.to(overlayRef.current, {
            opacity: 1,
            duration: 0.8,
            ease: "power2.out"
        });

        // Set the project
        setExpandedProject(project);

        // Wait for render then animate the morph
        requestAnimationFrame(() => {
            setTimeout(() => {
                if (previewRef.current && expandedImageRef.current && previewRect) {
                    const targetRect = expandedImageRef.current.getBoundingClientRect();

                    // Create the timeline for smooth morphing
                    const tl = gsap.timeline();

                    // Phase 1: Remove filter and start expanding
                    tl.to(previewRef.current, {
                        filter: "grayscale(0) sepia(0) saturate(1) contrast(1) brightness(1)",
                        duration: 0.4,
                        ease: "power2.out"
                    }, 0);

                    // Phase 2: Morph to target position and size
                    tl.to(previewRef.current, {
                        left: targetRect.left,
                        top: targetRect.top,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: 16,
                        duration: 0.8,
                        ease: "power4.inOut",
                        onComplete: () => {
                            // Swap to final image
                            gsap.set(previewRef.current, { opacity: 0 });
                            if (expandedImageRef.current) {
                                gsap.set(expandedImageRef.current, { opacity: 1 });
                            }
                        }
                    }, 0.1);
                }

                // Animate the panel container
                if (expandedRef.current) {
                    gsap.fromTo(expandedRef.current,
                        { opacity: 0 },
                        { opacity: 1, duration: 0.5, delay: 0.4, ease: "power2.out" }
                    );
                }

                // animation: lines sliding up with rotation
                if (contentRef.current) {
                    const lines = contentRef.current.querySelectorAll('[data-line]');
                    gsap.fromTo(lines,
                        {
                            opacity: 0,
                            y: '150%',
                            rotate: -5,
                        },
                        {
                            opacity: 1,
                            y: '0%',
                            rotate: 0,
                            duration: 0.8,
                            stagger: 0.04,
                            delay: 0.5,
                            ease: "power3.out"
                        }
                    );

                    // Animate footer line
                    if (footerLineRef.current) {
                        gsap.fromTo(footerLineRef.current,
                            { width: '0%', opacity: 0 },
                            { width: '100%', opacity: 1, duration: 0.8, delay: 0.9, ease: "power2.out" }
                        );
                    }

                    // Animate other elements
                    const fadeElements = contentRef.current.querySelectorAll('[data-fade]');
                    gsap.fromTo(fadeElements,
                        { opacity: 0, y: 20 },
                        { opacity: 1, y: 0, duration: 0.6, stagger: 0.05, delay: 1, ease: "power2.out" }
                    );
                }

                setIsExpanding(false);
            }, 50);
        });

        document.body.style.overflow = 'hidden';
    };

    const handleClose = async () => {
        if (!expandedRef.current || isClosing) return;
        setIsClosing(true);

        // Show navbar
        const navbar = document.getElementById('main-nav');
        if (navbar) {
            gsap.to(navbar, {
                y: 0,
                opacity: 1,
                duration: 0.5,
                ease: "power3.out"
            });
        }

        // content slides down with rotation
        if (contentRef.current) {
            const lines = contentRef.current.querySelectorAll('[data-line]');
            gsap.to(lines, {
                opacity: 0,
                y: '-150%',
                rotate: 5,
                duration: 0.4,
                stagger: 0.02,
                ease: "power2.in"
            });

            // Collapse footer line
            if (footerLineRef.current) {
                gsap.to(footerLineRef.current, {
                    width: '0%',
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.in"
                });
            }

            const fadeElements = contentRef.current.querySelectorAll('[data-fade]');
            gsap.to(fadeElements, {
                opacity: 0,
                y: -20,
                duration: 0.3,
                stagger: 0.02,
                ease: "power2.in"
            });
        }

        // Scale down image
        if (expandedImageRef.current) {
            gsap.to(expandedImageRef.current, {
                scale: 0.8,
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut"
            });
        }

        // Animate panel out
        await gsap.to(expandedRef.current, {
            opacity: 0,
            duration: 0.4,
            delay: 0.2,
            ease: "power2.inOut"
        });

        // Fade overlay
        gsap.to(overlayRef.current, {
            opacity: 0,
            duration: 0.4,
            ease: "power2.inOut"
        });

        // Reset preview to original state (relative positioning)
        if (previewRef.current) {
            gsap.set(previewRef.current, {
                position: 'absolute',
                left: 0,
                top: 0,
                x: 0,
                y: 0,
                width: '18rem', // w-72
                height: '11rem', // h-44
                scale: 0.8,
                borderRadius: 12,
                opacity: 0,
                zIndex: 102,
                filter: "grayscale(1) sepia(1) saturate(0.5) contrast(0.6) brightness(0.8)"
            });
        }

        setExpandedProject(null);
        setActiveProject(null);
        setIsClosing(false);
        document.body.style.overflow = '';
    };

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && expandedProject) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [expandedProject]);

    return (
        <div
            ref={containerRef}
            className="relative py-20 overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Section Header */}
            <div className="max-w-6xl mx-auto mb-12">
                <span className="text-purple-400 font-mono text-sm tracking-wider uppercase mb-4 block">
                    Featured Work
                </span>
                <h2 className="text-4xl md:text-6xl font-black text-white mb-4">
                    Projects
                </h2>
                <p className="text-white/50 max-w-xl">
                    A selection of projects I've worked on
                </p>
            </div>

            {/* Table Header */}
            <div className="max-w-6xl mx-auto" onMouseLeave={handleContainerLeave}>
                <div className="grid grid-cols-12 gap-4 py-4 border-b border-white/20 text-white/40 font-mono text-xs uppercase tracking-wider">
                    <div className="col-span-5">Project Name</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-3">Technologies</div>
                </div>

                {/* Project Rows */}
                {projects.map((project, index) => (
                    <div
                        key={project.id}
                        ref={el => { rowRefs.current[project.id] = el }}
                        onMouseEnter={() => handleMouseEnter(project)}
                        onMouseLeave={handleMouseLeave}
                        onClick={() => handleClick(project)}
                        className="group relative grid grid-cols-12 gap-4 py-6 border-b border-white/10 cursor-pointer transition-all duration-500 hover:border-purple-500/50"
                    >
                        {/* hover line effect */}
                        <div className="absolute inset-0 bg-linear-to-r from-purple-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />

                        {/* Project Name */}
                        <div className="col-span-5 flex items-center relative z-10">
                            <h3 className="text-xl md:text-2xl font-bold text-white/70 group-hover:text-white transition-all duration-300 group-hover:translate-x-4">
                                {project.title}
                            </h3>
                        </div>

                        {/* Type */}
                        <div className="col-span-3 flex items-center relative z-10">
                            <span className="text-purple-400/70 font-mono text-sm group-hover:text-purple-400 transition-colors duration-300">
                                {project.type}
                            </span>
                        </div>

                        {/* Technologies */}
                        <div className="col-span-3 flex items-center gap-2 flex-wrap relative z-10">
                            {project.technologies.slice(0, 3).map((tech, i) => (
                                <span
                                    key={i}
                                    className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/50 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-all duration-300"
                                    style={{ transitionDelay: `${i * 50}ms` }}
                                >
                                    {tech}
                                </span>
                            ))}
                            {project.technologies.length > 3 && (
                                <span className="text-xs text-white/30 group-hover:text-white/50 transition-colors">
                                    +{project.technologies.length - 3}
                                </span>
                            )}
                        </div>

                        {/* Arrow indicator on hover */}
                        <div className="col-span-1 flex items-center justify-end relative z-10">
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                <svg
                                    className="w-6 h-6 text-purple-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Link */}
            <div className="max-w-6xl mx-auto px-6 mt-12">
                <a
                    href="https://github.com/PabloAML1?tab=repositories"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-purple-400 font-mono text-sm hover:text-purple-300 transition-colors group"
                >
                    View all projects
                    <svg
                        className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                    </svg>
                </a>
            </div>

            {/* Floating Preview Container */}
            <div
                ref={previewRef}
                className="fixed pointer-events-none overflow-hidden rounded-xl opacity-0"
                style={{
                    top: 0,
                    left: 0,
                    width: '18rem',
                    height: '11rem',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                    filter: 'grayscale(1) sepia(1) saturate(0.5) contrast(0.6) brightness(0.8)',
                    transformOrigin: 'center center',
                    zIndex: 102,
                    transform: 'scale(0.75)'
                }}
            >
                {activeProject && (
                    <img
                        src={activeProject.img}
                        alt="Project Preview"
                        // w-full h-full object-cover
                        className="w-full h-full object-contain bg-black"
                    />
                )}
            </div>

            {/* Overlay */}
            <div
                ref={overlayRef}
                className={`fixed inset-0 bg-black/95 z-100 opacity-0 ${expandedProject ? 'pointer-events-auto' : 'pointer-events-none'}`}
                onClick={handleClose}
            />

            {/* Expanded Project View  */}
            {expandedProject && (
                <div
                    ref={expandedRef}
                    className="fixed inset-0 z-101 flex pointer-events-none opacity-0"
                >
                    <div className="relative w-full h-full flex flex-col md:flex-row pointer-events-auto p-6 md:p-12 lg:p-16 overflow-y-auto md:overflow-hidden">
                        {/* Left Side - Content */}
                        <div ref={contentRef} className="w-full md:w-1/2 flex flex-col justify-center pr-0 md:pr-16 md:overflow-y-auto">
                            {/* Back Button - Positioned above title */}
                            <div className="overflow-hidden mb-8">
                                <button
                                    data-line
                                    onClick={handleClose}
                                    className="group flex items-center gap-4 text-white/60 hover:text-white transition-colors"
                                    aria-label="Go Back"
                                >
                                    <svg viewBox="-20 -10 150 32" height="32" xmlns="http://www.w3.org/2000/svg" className="text-white/40 group-hover:text-white transition-colors">
                                        <path
                                            d="M98 30c-2-3.4-4.3-4.3-8-6.4-15.4-8.6-32.5-14.6-50-17.6-12.6-2.2-25.4-1.9-37.4 1.6.5.6 1.1.3 1.6.8.4.3.6 1 1 1.4 1 1.1 5.4 4.8 6.9 4-1.3-1-3.1-1.6-4.6-2.3-3-1.4-6.3-3.8-9.5-4.6 1.1-1.5 10.6-10.6 12.3-6.8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            fill="none"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Title - Line by line animation */}
                            <div className="overflow-hidden mb-6">
                                <h2 data-line className="text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
                                    {expandedProject.title}
                                </h2>
                            </div>

                            {/* Description - Split into lines */}
                            <div className="mb-8 space-y-1">
                                {expandedProject.description.split('. ').map((line, i) => (
                                    <div key={i} className="overflow-hidden">
                                        <p data-line className="text-lg md:text-xl text-white/70 uppercase tracking-wide">
                                            {line}{i < expandedProject.description.split('. ').length - 1 ? '.' : ''}
                                        </p>
                                    </div>
                                ))}

                                {/* Footer - with animated line */}
                                <div className="mt-auto">
                                    {/* Animated horizontal line */}
                                    <div ref={footerLineRef} className="h-px bg-white/30 mb-6" style={{ width: '0%' }} />

                                    {/* Info row */}
                                    <div data-fade className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-white/50 text-sm uppercase tracking-wider mb-1">
                                                {expandedProject.type}
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {expandedProject.technologies.map((tech, i) => (
                                                    <span key={i} className="text-xs text-purple-400 uppercase tracking-wider">
                                                        {tech}{i < expandedProject.technologies.length - 1 ? ' •' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {expandedProject.features && (
                                            <p className="text-white/40 text-sm uppercase tracking-wider">
                                                {expandedProject.features.length.toString().padStart(2, '0')} Features
                                            </p>
                                        )}
                                    </div>

                                    {/* CTA - "see case" */}
                                    <div data-fade className="flex gap-4">
                                        {expandedProject.live && expandedProject.live !== "No Disponible" ? (
                                            <a
                                                href={expandedProject.live}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group inline-flex items-center gap-3 text-white hover:text-purple-400 transition-colors"
                                            >
                                                <span className="text-sm uppercase tracking-widest font-medium">See Project</span>
                                                <svg width="17" height="17" xmlns="http://www.w3.org/2000/svg" className="transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform">
                                                    <path d="M14.875 13.357V3.643L1.518 17 0 15.482 13.357 2.125H3.643V0H17v13.357z" fill="currentColor" fillRule="nonzero" />
                                                </svg>
                                            </a>
                                        ) : (
                                            <span className="inline-flex items-center gap-3 text-white/40 cursor-not-allowed">
                                                <span className="text-sm uppercase tracking-widest font-medium">Not available</span>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </span>
                                        )}
                                        {expandedProject.github && (
                                            <a
                                                href={expandedProject.github}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group inline-flex items-center gap-3 text-white/60 hover:text-white transition-colors"
                                            >
                                                <span className="text-sm uppercase tracking-widest font-medium">View Code</span>
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                                                </svg>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side (Desktop) / Bottom (Mobile) - Image Gallery */}
                        <div className="w-full md:w-1/2 h-64 md:h-full flex items-center justify-center mt-8 md:mt-0">
                            <div
                                ref={expandedImageRef}
                                className="relative w-full h-full md:h-[85%] rounded-2xl overflow-hidden opacity-0 group/gallery"
                                style={{
                                    transformOrigin: 'center center',
                                    boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5)'
                                }}
                            >
                                <img
                                    ref={galleryImageRef}
                                    src={galleryImages[currentImageIndex] || expandedProject.img}
                                    alt={`${expandedProject.title} - Image ${currentImageIndex + 1}`}
                                    // w-full h-full object-cover
                                    className="w-full h-full object-contain bg-black"
                                />

                                {/* Gallery Navigation Arrows */}
                                {galleryImages.length > 1 && (
                                    <>
                                        {/* Previous Arrow */}
                                        <button
                                            onClick={goToPrevImage}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 hover:border-purple-500/50 transition-all duration-300 opacity-0 group-hover/gallery:opacity-100 transform -translate-x-4 group-hover/gallery:translate-x-0"
                                            aria-label="Previous image"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                            </svg>
                                        </button>

                                        {/* Next Arrow */}
                                        <button
                                            onClick={goToNextImage}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 hover:border-purple-500/50 transition-all duration-300 opacity-0 group-hover/gallery:opacity-100 transform translate-x-4 group-hover/gallery:translate-x-0"
                                            aria-label="Next image"
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>

                                        {/* Image Indicators */}
                                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300">
                                            {galleryImages.map((_, index) => (
                                                <button
                                                    key={index}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (index !== currentImageIndex) {
                                                            gsap.to(galleryImageRef.current, {
                                                                opacity: 0,
                                                                scale: 0.95,
                                                                duration: 0.2,
                                                                ease: "power2.in",
                                                                onComplete: () => {
                                                                    setCurrentImageIndex(index);
                                                                    gsap.fromTo(galleryImageRef.current,
                                                                        { opacity: 0, scale: 1.05 },
                                                                        { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" }
                                                                    );
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentImageIndex
                                                        ? 'bg-purple-500 w-6'
                                                        : 'bg-white/40 hover:bg-white/70'
                                                        }`}
                                                    aria-label={`Go to image ${index + 1}`}
                                                />
                                            ))}
                                        </div>

                                        {/* Image Counter */}
                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 text-white/70 text-sm font-mono opacity-0 group-hover/gallery:opacity-100 transition-opacity duration-300">
                                            {currentImageIndex + 1} / {galleryImages.length}
                                        </div>
                                    </>
                                )}

                                {/* Border effect */}
                                <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectsPlaylist;
