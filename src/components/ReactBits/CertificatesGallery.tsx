import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';


// --- UTILIDADES ---
function lerp(p1: number, p2: number, t: number): number {
    return p1 + (p2 - p1) * t;
}

// --- SHADERS ---
const vertexShader = `
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform float uBendFactor;
    
    varying vec2 vUv;

    void main() {
        vUv = uv;
        vec3 pos = position;
        
        // Curvatura estática en eje X (sin deformación por velocidad)
        float curve = pos.x * pos.x * uBendFactor;
        pos.y -= curve;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    precision highp float;
    uniform sampler2D tMap;
    uniform vec2 uImageSizes;
    uniform vec2 uPlaneSizes;
    uniform float uBorderRadius;
    varying vec2 vUv;

    // SDF para bordes redondeados
    float roundedBoxSDF(vec2 p, vec2 b, float r) {
        vec2 d = abs(p) - b;
        return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
    }

    void main() {
        // Object Cover logic
        vec2 ratio = vec2(
            min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
            min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
        );
        vec2 uv = vec2(
            vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
            vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
        );

        vec4 color = texture2D(tMap, uv);
        
        // Bordes redondeados
        float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
        float alpha = 1.0 - smoothstep(-0.001, 0.001, d);
        
        gl_FragColor = vec4(color.rgb, alpha * color.a);
        if (gl_FragColor.a < 0.01) discard;
    }
`;

// --- CLASES WEBGL ---

class Media {
    gl: any;
    geometry: Plane;
    scene: Transform;
    program: Program;
    mesh: Mesh;
    image: string;
    text: string;
    index: number;
    width: number = 0;
    widthTotal: number = 0;
    x: number = 0;
    extra: number = 0;
    viewport: { width: number; height: number };

    constructor({ gl, geometry, scene, image, text, index, viewport, borderRadius }: any) {
        this.gl = gl;
        this.geometry = geometry;
        this.scene = scene;
        this.image = image;
        this.text = text;
        this.index = index;
        this.viewport = viewport;

        const texture = new Texture(gl, { generateMipmaps: false });
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = image;
        img.onload = () => {
            texture.image = img;
            this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
        };

        this.program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                tMap: { value: texture },
                uPlaneSizes: { value: [0, 0] },
                uImageSizes: { value: [0, 0] },
                uBorderRadius: { value: borderRadius },
                uBendFactor: { value: 0 },
            },
            transparent: true
        });

        this.mesh = new Mesh(gl, { geometry: this.geometry, program: this.program });
        this.mesh.setParent(scene);
    }

    resize(viewport: { width: number, height: number }, screen: { width: number, height: number }) {
        this.viewport = viewport;
        const scale = screen.height / 1500;
        this.mesh.scale.x = (viewport.width * (700 * scale)) / screen.width;
        this.mesh.scale.y = (viewport.height * (900 * scale)) / screen.height;
        
        this.program.uniforms.uPlaneSizes.value = [this.mesh.scale.x, this.mesh.scale.y];
        
        const gap = 1.5; 
        this.width = this.mesh.scale.x + gap;
        this.x = this.width * this.index;
    }

    update(scroll: number, direction: number, length: number) {
        this.widthTotal = this.width * length;
        this.mesh.position.x = this.x - scroll - this.extra;
        
        const planeOffset = this.mesh.scale.x / 2;
        const viewportOffset = this.viewport.width / 2;
        
        if (direction === 1 && this.mesh.position.x + planeOffset < -viewportOffset) {
            this.extra -= this.widthTotal;
        } else if (direction === -1 && this.mesh.position.x - planeOffset > viewportOffset) {
            this.extra += this.widthTotal;
        }
    }

    hitTest(mouseNdcX: number, mouseNdcY: number) {
        const halfWidth = this.mesh.scale.x / 2;
        const halfHeight = this.mesh.scale.y / 2;
        const posX = this.mesh.position.x;
        const posY = 0; 

        return (
            mouseNdcX >= posX - halfWidth &&
            mouseNdcX <= posX + halfWidth &&
            mouseNdcY >= posY - halfHeight &&
            mouseNdcY <= posY + halfHeight
        );
    }
}

class WebGLApp {
    renderer: Renderer;
    gl: any;
    camera: Camera;
    scene: Transform;
    planeGeometry: Plane;
    medias: Media[] = [];
    scroll: { current: number; target: number; last: number; ease: number };
    touchStart: number = 0;
    isDragging: boolean = false;
    hasMoved: boolean = false; 
    rafId: number = 0;
    container: HTMLElement;
    items: any[];
    bendFactor: number;
    viewport: { width: number, height: number } = { width: 0, height: 0 };
    onImageClick: (image: string, text: string) => void;

    constructor(
        container: HTMLElement, 
        config: {
            items: any[], 
            bendFactor: number,
            onImageClick: (image: string, text: string) => void
        }
    ) {
        this.container = container;
        this.items = config.items;
        this.bendFactor = config.bendFactor * 0.001; 
        this.onImageClick = config.onImageClick;

        this.renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
        this.gl = this.renderer.gl;
        this.gl.clearColor(0, 0, 0, 0);
        container.appendChild(this.gl.canvas);

        this.camera = new Camera(this.gl);
        this.camera.fov = 45;
        this.camera.position.z = 20;

        this.scene = new Transform();
        this.planeGeometry = new Plane(this.gl, { widthSegments: 20, heightSegments: 10 });

        this.scroll = { current: 0, target: 0, last: 0, ease: 0.05 };
        
        this.initMedias();
        this.resize();
        this.addEvents();
        this.update();
    }

    initMedias() {
        const doubleItems = [...this.items, ...this.items]; 
        this.medias = doubleItems.map((data, index) => {
            return new Media({
                gl: this.gl,
                geometry: this.planeGeometry,
                scene: this.scene,
                image: data.image,
                text: data.text,
                index,
                viewport: { width: 0, height: 0 },
                borderRadius: 0.05
            });
        });
    }

    resize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.renderer.setSize(width, height);
        this.camera.perspective({ aspect: width / height });

        const fov = (this.camera.fov * Math.PI) / 180;
        const viewHeight = 2 * Math.tan(fov / 2) * this.camera.position.z;
        const viewWidth = viewHeight * this.camera.aspect;

        this.viewport = { width: viewWidth, height: viewHeight };
        this.medias.forEach(media => media.resize(this.viewport, { width, height }));
    }

    onTouchDown = (e: TouchEvent | MouseEvent) => {
        this.isDragging = true;
        this.hasMoved = false;
        this.touchStart = 'touches' in e ? e.touches[0].clientX : e.clientX;
    };

    onTouchMove = (e: TouchEvent | MouseEvent) => {
        if (!this.isDragging) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        
        // --- CAMBIO AQUÍ: AUMENTADO DE 2.5 A 6.0 PARA MAYOR VELOCIDAD ---
        const dist = (this.touchStart - x) * 6.0; 
        
        if(Math.abs(dist) > 2) this.hasMoved = true;

        this.scroll.target += dist * 0.01;
        this.touchStart = x;
    };

    onTouchUp = (e: TouchEvent | MouseEvent) => {
        this.isDragging = false;
        
        if (!this.hasMoved) {
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
            
            const rect = this.container.getBoundingClientRect();
            const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
            const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
            
            const worldX = ndcX * (this.viewport.width / 2);
            const worldY = ndcY * (this.viewport.height / 2);

            for (const media of this.medias) {
                if (media.hitTest(worldX, worldY)) {
                    this.onImageClick(media.image, media.text);
                    break;
                }
            }
        }
    };

    onWheel = (e: WheelEvent) => {
        this.scroll.target += e.deltaY * 0.005;
    };

    addEvents() {
        window.addEventListener('resize', this.resize.bind(this));
        
        this.container.addEventListener('mousedown', this.onTouchDown);
        window.addEventListener('mousemove', this.onTouchMove);
        window.addEventListener('mouseup', this.onTouchUp);

        this.container.addEventListener('touchstart', this.onTouchDown, { passive: true });
        this.container.addEventListener('touchmove', this.onTouchMove, { passive: true });
        window.addEventListener('touchend', this.onTouchUp);
        
        this.container.addEventListener('wheel', this.onWheel, { passive: true });
    }

    update() {
        this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
        const direction = this.scroll.current > this.scroll.last ? 1 : -1;
        
        // Curvatura estática
        const currentBend = this.bendFactor; 

        if(this.medias.length > 0){
             this.medias.forEach(media => {
                 media.update(this.scroll.current, direction, this.medias.length);
                 media.program.uniforms.uBendFactor.value = currentBend;
             });
        }

        this.scroll.last = this.scroll.current;
        this.renderer.render({ scene: this.scene, camera: this.camera });
        this.rafId = requestAnimationFrame(this.update.bind(this));
    }

    destroy() {
        cancelAnimationFrame(this.rafId);
        window.removeEventListener('resize', this.resize.bind(this));
        if (this.gl.canvas.parentNode) this.gl.canvas.parentNode.removeChild(this.gl.canvas);
    }
}

// --- COMPONENTE REACT ---
interface CertificatesGalleryProps {
    items?: { image: string; text: string }[];
    bend?: number;
    textColor?: string;
    borderRadius?: number;
    font?: string;
    scrollSpeed?: number;
    scrollEase?: number;
}

export default function CertificatesGallery({ 
    items, 
    bend = 3,
    textColor = '#ffffff',
    borderRadius = 0.05,
    font = 'bold 30px DM Sans',
    scrollSpeed = 2,
    scrollEase = 0.05
}: CertificatesGalleryProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<any>(null);

    // --- ESTADO Y REFS PARA EL MODAL ---
    const [expandedImage, setExpandedImage] = useState<{ image: string; text: string } | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalContentRef = useRef<HTMLDivElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    // --- MANEJADORES ---
    const handleImageClick = (image: string, text: string) => {
        setExpandedImage({ image, text });
    };

    const handleClose = () => {
        // Animación de SALIDA
        const tl = gsap.timeline({
            onComplete: () => setExpandedImage(null)
        });

        if (overlayRef.current && modalContentRef.current) {
            tl.to(overlayRef.current, {
                opacity: 0,
                duration: 0.3,
                ease: "power2.inOut"
            }, 0);

            tl.to(modalContentRef.current, {
                scale: 0.8,
                opacity: 0,
                y: 20,
                duration: 0.3,
                ease: "power2.inOut"
            }, 0);
        } else {
            setExpandedImage(null);
        }
    };

    // --- EFECTO DE ANIMACIÓN DE ENTRADA ---
    useEffect(() => {
        if (expandedImage && overlayRef.current && modalContentRef.current) {
            gsap.set(overlayRef.current, { opacity: 0 });
            gsap.set(modalContentRef.current, { opacity: 0, scale: 0.8, y: 20 });

            const tl = gsap.timeline();

            tl.to(overlayRef.current, {
                opacity: 1,
                duration: 0.4,
                ease: "power2.out"
            });

            tl.to(modalContentRef.current, {
                opacity: 1,
                scale: 1,
                y: 0,
                duration: 0.5,
                ease: "back.out(1.2)", 
            }, "-=0.3");
        }
    }, [expandedImage]);

    // --- INICIALIZACIÓN DE WEBGL ---
    useEffect(() => {
        if (!containerRef.current) return;
        
        const app = new WebGLApp(containerRef.current, { 
            items: items || [], 
            bendFactor: bend, 
            onImageClick: handleImageClick 
        });
        
        appRef.current = app;

        return () => {
            app.destroy();
        };
    }, [items, bend]);

    // Cerrar con tecla ESC
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, []);

    return (
        <>
            <div className="relative w-full h-full">
                <div className="hidden lg:flex absolute left-0 top-0 bottom-0 z-10 pointer-events-none w-32 bg-linear-to-r from-black to-transparent" />
                <div className="hidden lg:flex absolute right-0 top-0 bottom-0 z-10 pointer-events-none w-32 bg-linear-to-l from-black to-transparent" />
                
                <div 
                    className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing" 
                    ref={containerRef} 
                />
            </div>

            {expandedImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
                    <div
                        ref={overlayRef}
                        className="absolute inset-0 bg-black/90 backdrop-blur-sm cursor-pointer"
                        onClick={handleClose}
                    />

                    <div
                        ref={modalContentRef}
                        className="relative z-10 max-w-5xl w-full max-h-[90vh] flex flex-col items-center pointer-events-none"
                    >
                        <button
                            onClick={handleClose}
                            className="pointer-events-auto absolute -top-12 right-0 text-white/50 hover:text-white transition-colors duration-300 group flex items-center gap-2"
                        >
                            <span className="text-sm font-mono tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0">CLOSE</span>
                            <div className="p-2 border border-white/20 rounded-full group-hover:border-white/80 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </div>
                        </button>

                        <img
                            ref={imageRef}
                            src={expandedImage.image}
                            alt={expandedImage.text}
                            className="pointer-events-auto w-auto max-h-[70vh] object-contain rounded-lg shadow-2xl shadow-purple-900/20 border border-white/10"
                        />

                        <div className="mt-6 text-center">
                            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                {expandedImage.text}
                            </h3>
                            <p className="text-purple-400 font-mono text-sm mt-2 uppercase tracking-widest opacity-80">
                                Certificado Oficial
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}