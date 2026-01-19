import { Camera, Mesh, Plane, Program, Renderer, Texture, Transform } from 'ogl';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

type GL = Renderer['gl'];

function debounce<T extends (...args: any[]) => void>(func: T, wait: number) {
    let timeout: number;
    return function (this: any, ...args: Parameters<T>) {
        window.clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), wait);
    };
}

function lerp(p1: number, p2: number, t: number): number {
    return p1 + (p2 - p1) * t;
}

function autoBind(instance: any): void {
    const proto = Object.getPrototypeOf(instance);
    Object.getOwnPropertyNames(proto).forEach(key => {
        if (key !== 'constructor' && typeof instance[key] === 'function') {
            instance[key] = instance[key].bind(instance);
        }
    });
}

function getFontSize(font: string): number {
    const match = font.match(/(\d+)px/);
    return match ? parseInt(match[1], 10) : 30;
}

function createTextTexture(
    gl: GL,
    text: string,
    font: string = 'bold 30px monospace',
    color: string = 'black'
): { texture: Texture; width: number; height: number } {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2d context');

    context.font = font;
    const metrics = context.measureText(text);
    const textWidth = Math.ceil(metrics.width);
    const fontSize = getFontSize(font);
    const textHeight = Math.ceil(fontSize * 1.2);

    canvas.width = textWidth + 20;
    canvas.height = textHeight + 20;

    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'middle';
    context.textAlign = 'center';
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new Texture(gl, { generateMipmaps: false });
    texture.image = canvas;
    return { texture, width: canvas.width, height: canvas.height };
}

interface TitleProps {
    gl: GL;
    plane: Mesh;
    renderer: Renderer;
    text: string;
    textColor?: string;
    font?: string;
}

class Title {
    gl: GL;
    plane: Mesh;
    renderer: Renderer;
    text: string;
    textColor: string;
    font: string;
    mesh!: Mesh;

    constructor({ gl, plane, renderer, text, textColor = '#545050', font = '30px sans-serif' }: TitleProps) {
        autoBind(this);
        this.gl = gl;
        this.plane = plane;
        this.renderer = renderer;
        this.text = text;
        this.textColor = textColor;
        this.font = font;
        this.createMesh();
    }

    createMesh() {
        const { texture, width, height } = createTextTexture(this.gl, this.text, this.font, this.textColor);
        const geometry = new Plane(this.gl);
        const program = new Program(this.gl, {
            vertex: `
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragment: `
                precision highp float;
                uniform sampler2D tMap;
                varying vec2 vUv;
                void main() {
                    vec4 color = texture2D(tMap, vUv);
                    if (color.a < 0.1) discard;
                    gl_FragColor = color;
                }
            `,
            uniforms: { tMap: { value: texture } },
            transparent: true
        });
        this.mesh = new Mesh(this.gl, { geometry, program });
        const aspect = width / height;
        const textHeightScaled = this.plane.scale.y * 0.15;
        const textWidthScaled = textHeightScaled * aspect;
        this.mesh.scale.set(textWidthScaled, textHeightScaled, 1);
        this.mesh.position.y = -this.plane.scale.y * 0.5 - textHeightScaled * 0.5 - 0.05;
        this.mesh.setParent(this.plane);
    }
}

interface ScreenSize {
    width: number;
    height: number;
}

interface Viewport {
    width: number;
    height: number;
}

interface MediaProps {
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: ScreenSize;
    text: string;
    viewport: Viewport;
    bend: number;
    textColor: string;
    borderRadius?: number;
    font?: string;
    onClick?: (image: string, text: string) => void;
}

class Media {
    extra: number = 0;
    geometry: Plane;
    gl: GL;
    image: string;
    index: number;
    length: number;
    renderer: Renderer;
    scene: Transform;
    screen: ScreenSize;
    text: string;
    viewport: Viewport;
    bend: number;
    textColor: string;
    borderRadius: number;
    font?: string;
    onClick?: (image: string, text: string) => void;
    program!: Program;
    plane!: Mesh;
    title!: Title;
    scale!: number;
    padding!: number;
    width!: number;
    widthTotal!: number;
    x!: number;
    speed: number = 0;
    isBefore: boolean = false;
    isAfter: boolean = false;

    constructor({
        geometry,
        gl,
        image,
        index,
        length,
        renderer,
        scene,
        screen,
        text,
        viewport,
        bend,
        textColor,
        borderRadius = 0,
        font,
        onClick
    }: MediaProps) {
        this.geometry = geometry;
        this.gl = gl;
        this.image = image;
        this.index = index;
        this.length = length;
        this.renderer = renderer;
        this.scene = scene;
        this.screen = screen;
        this.text = text;
        this.viewport = viewport;
        this.bend = bend;
        this.textColor = textColor;
        this.borderRadius = borderRadius;
        this.font = font;
        this.onClick = onClick;
        this.createShader();
        this.createMesh();
        this.createTitle();
        this.onResize();
    }

    createShader() {
        const texture = new Texture(this.gl, {
            generateMipmaps: true,
            minFilter: this.gl.LINEAR_MIPMAP_LINEAR,
            magFilter: this.gl.LINEAR,
            wrapS: this.gl.CLAMP_TO_EDGE,
            wrapT: this.gl.CLAMP_TO_EDGE,
            anisotropy: 16
        });
        // Vertex shader WITHOUT wave effect - flat position only
        this.program = new Program(this.gl, {
            depthTest: false,
            depthWrite: false,
            vertex: `
                precision highp float;
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragment: `
                precision highp float;
                uniform vec2 uImageSizes;
                uniform vec2 uPlaneSizes;
                uniform sampler2D tMap;
                uniform float uBorderRadius;
                varying vec2 vUv;
                
                float roundedBoxSDF(vec2 p, vec2 b, float r) {
                    vec2 d = abs(p) - b;
                    return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
                }
                
                void main() {
                    vec2 ratio = vec2(
                        min((uPlaneSizes.x / uPlaneSizes.y) / (uImageSizes.x / uImageSizes.y), 1.0),
                        min((uPlaneSizes.y / uPlaneSizes.x) / (uImageSizes.y / uImageSizes.x), 1.0)
                    );
                    vec2 uv = vec2(
                        vUv.x * ratio.x + (1.0 - ratio.x) * 0.5,
                        vUv.y * ratio.y + (1.0 - ratio.y) * 0.5
                    );
                    vec4 color = texture2D(tMap, uv);
                    
                    float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
                    
                    float edgeSmooth = 0.002;
                    float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
                    
                    gl_FragColor = vec4(color.rgb, alpha);
                }
            `,
            uniforms: {
                tMap: { value: texture },
                uPlaneSizes: { value: [0, 0] },
                uImageSizes: { value: [0, 0] },
                uBorderRadius: { value: this.borderRadius }
            },
            transparent: true
        });
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = this.image;
        img.onload = () => {
            texture.image = img;
            this.program.uniforms.uImageSizes.value = [img.naturalWidth, img.naturalHeight];
        };
    }

    createMesh() {
        this.plane = new Mesh(this.gl, {
            geometry: this.geometry,
            program: this.program
        });
        this.plane.setParent(this.scene);
    }

    createTitle() {
        this.title = new Title({
            gl: this.gl,
            plane: this.plane,
            renderer: this.renderer,
            text: this.text,
            textColor: this.textColor,
            font: this.font
        });
    }

    handleClick() {
        if (this.onClick) {
            this.onClick(this.image, this.text);
        }
    }

    update(scroll: { current: number; last: number }, direction: 'right' | 'left') {
        this.plane.position.x = this.x - scroll.current - this.extra;

        const x = this.plane.position.x;
        const H = this.viewport.width / 2;

        if (this.bend === 0) {
            this.plane.position.y = 0;
            this.plane.rotation.z = 0;
        } else {
            const B_abs = Math.abs(this.bend);
            const R = (H * H + B_abs * B_abs) / (2 * B_abs);
            const effectiveX = Math.min(Math.abs(x), H);

            const arc = R - Math.sqrt(R * R - effectiveX * effectiveX);
            if (this.bend > 0) {
                this.plane.position.y = -arc;
                this.plane.rotation.z = -Math.sign(x) * Math.asin(effectiveX / R);
            } else {
                this.plane.position.y = arc;
                this.plane.rotation.z = Math.sign(x) * Math.asin(effectiveX / R);
            }
        }

        this.speed = scroll.current - scroll.last;

        const planeOffset = this.plane.scale.x / 2;
        const viewportOffset = this.viewport.width / 2;
        this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
        this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
        if (direction === 'right' && this.isBefore) {
            this.extra -= this.widthTotal;
            this.isBefore = this.isAfter = false;
        }
        if (direction === 'left' && this.isAfter) {
            this.extra += this.widthTotal;
            this.isBefore = this.isAfter = false;
        }
    }

    onResize({ screen, viewport }: { screen?: ScreenSize; viewport?: Viewport } = {}) {
        if (screen) this.screen = screen;
        if (viewport) {
            this.viewport = viewport;
        }
        this.scale = this.screen.height / 1500;
        this.plane.scale.y = (this.viewport.height * (900 * this.scale)) / this.screen.height;
        this.plane.scale.x = (this.viewport.width * (700 * this.scale)) / this.screen.width;
        this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
        this.padding = 5;
        this.width = this.plane.scale.x + this.padding;
        this.widthTotal = this.width * this.length;
        this.x = this.width * this.index;
    }
}

interface AppConfig {
    items?: { image: string; text: string }[];
    bend?: number;
    textColor?: string;
    borderRadius?: number;
    font?: string;
    scrollSpeed?: number;
    scrollEase?: number;
    onImageClick?: (image: string, text: string) => void;
}

class App {
    container: HTMLElement;
    scrollSpeed: number;
    scroll: {
        ease: number;
        current: number;
        target: number;
        last: number;
        position?: number;
    };
    onCheckDebounce: (...args: any[]) => void;
    renderer!: Renderer;
    gl!: GL;
    camera!: Camera;
    scene!: Transform;
    planeGeometry!: Plane;
    medias: Media[] = [];
    mediasImages: { image: string; text: string }[] = [];
    screen!: { width: number; height: number };
    viewport!: { width: number; height: number };
    raf: number = 0;
    onImageClick?: (image: string, text: string) => void;

    boundOnResize!: () => void;
    boundOnWheel!: (e: Event) => void;
    boundOnTouchDown!: (e: MouseEvent | TouchEvent) => void;
    boundOnTouchMove!: (e: MouseEvent | TouchEvent) => void;
    boundOnTouchUp!: (e: MouseEvent | TouchEvent) => void;

    isDown: boolean = false;
    start: number = 0;
    startY: number = 0;
    hasMoved: boolean = false;

    constructor(
        container: HTMLElement,
        {
            items,
            bend = 1,
            textColor = '#ffffff',
            borderRadius = 0,
            font = 'bold 30px DM Sans',
            scrollSpeed = 2,
            scrollEase = 0.05,
            onImageClick
        }: AppConfig
    ) {
        document.documentElement.classList.remove('no-js');
        this.container = container;
        this.scrollSpeed = scrollSpeed;
        this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
        this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
        this.onImageClick = onImageClick;
        this.createRenderer();
        this.createCamera();
        this.createScene();
        this.onResize();
        this.createGeometry();
        this.createMedias(items, bend, textColor, borderRadius, font);
        this.update();
        this.addEventListeners();
    }

    createRenderer() {
        this.renderer = new Renderer({
            alpha: true,
            antialias: true,
            dpr: Math.min(window.devicePixelRatio || 1, 3),
            powerPreference: 'high-performance'
        });
        this.gl = this.renderer.gl;
        this.gl.clearColor(0, 0, 0, 0);
        this.container.appendChild(this.renderer.gl.canvas as HTMLCanvasElement);
    }

    createCamera() {
        this.camera = new Camera(this.gl);
        this.camera.fov = 45;
        this.camera.position.z = 20;
    }

    createScene() {
        this.scene = new Transform();
    }

    createGeometry() {
        this.planeGeometry = new Plane(this.gl, {
            heightSegments: 10,
            widthSegments: 20
        });
    }

    createMedias(
        items: { image: string; text: string }[] | undefined,
        bend: number = 1,
        textColor: string,
        borderRadius: number,
        font: string
    ) {
        const defaultItems = [
            { image: `https://picsum.photos/seed/1/800/600`, text: 'Certificate 1' },
            { image: `https://picsum.photos/seed/2/800/600`, text: 'Certificate 2' },
            { image: `https://picsum.photos/seed/3/800/600`, text: 'Certificate 3' },
            { image: `https://picsum.photos/seed/4/800/600`, text: 'Certificate 4' },
            { image: `https://picsum.photos/seed/5/800/600`, text: 'Certificate 5' },
        ];
        const galleryItems = items && items.length ? items : defaultItems;
        this.mediasImages = galleryItems.concat(galleryItems);
        this.medias = this.mediasImages.map((data, index) => {
            return new Media({
                geometry: this.planeGeometry,
                gl: this.gl,
                image: data.image,
                index,
                length: this.mediasImages.length,
                renderer: this.renderer,
                scene: this.scene,
                screen: this.screen,
                text: data.text,
                viewport: this.viewport,
                bend,
                textColor,
                borderRadius,
                font,
                onClick: this.onImageClick
            });
        });
    }

    onTouchDown(e: MouseEvent | TouchEvent) {
        this.isDown = true;
        this.hasMoved = false;
        this.scroll.position = this.scroll.current;
        this.start = 'touches' in e ? e.touches[0].clientX : e.clientX;
        this.startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    }

    onTouchMove(e: MouseEvent | TouchEvent) {
        if (!this.isDown) return;
        const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const distance = (this.start - x) * (this.scrollSpeed * 0.025);

        if (Math.abs(this.start - x) > 5 || Math.abs(this.startY - y) > 5) {
            this.hasMoved = true;
        }

        this.scroll.target = (this.scroll.position ?? 0) + distance;
    }

    onTouchUp(e: MouseEvent | TouchEvent) {
        if (!this.hasMoved && this.onImageClick) {
            const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX;
            const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;

            const rect = this.container.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 2 - 1;
            const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

            for (const media of this.medias) {
                const planeX = media.plane.position.x;
                const planeY = media.plane.position.y;
                const halfWidth = media.plane.scale.x / 2;
                const halfHeight = media.plane.scale.y / 2;

                const ndcX = planeX / (this.viewport.width / 2);
                const ndcY = planeY / (this.viewport.height / 2);
                const ndcHalfW = halfWidth / (this.viewport.width / 2);
                const ndcHalfH = halfHeight / (this.viewport.height / 2);

                if (
                    x >= ndcX - ndcHalfW &&
                    x <= ndcX + ndcHalfW &&
                    y >= ndcY - ndcHalfH &&
                    y <= ndcY + ndcHalfH
                ) {
                    media.handleClick();
                    break;
                }
            }
        }

        this.isDown = false;
        this.onCheck();
    }

    onWheel(e: Event) {
        const wheelEvent = e as WheelEvent;
        const delta = wheelEvent.deltaY || (wheelEvent as any).wheelDelta || (wheelEvent as any).detail;
        this.scroll.target += (delta > 0 ? this.scrollSpeed : -this.scrollSpeed) * 0.2;
        this.onCheckDebounce();
    }

    onCheck() {
        if (!this.medias || !this.medias[0]) return;
        const width = this.medias[0].width;
        const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
        const item = width * itemIndex;
        this.scroll.target = this.scroll.target < 0 ? -item : item;
    }

    onResize() {
        this.screen = {
            width: this.container.clientWidth,
            height: this.container.clientHeight
        };
        this.renderer.setSize(this.screen.width, this.screen.height);
        this.camera.perspective({
            aspect: this.screen.width / this.screen.height
        });
        const fov = (this.camera.fov * Math.PI) / 180;
        const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
        const width = height * this.camera.aspect;
        this.viewport = { width, height };
        if (this.medias) {
            this.medias.forEach(media => media.onResize({ screen: this.screen, viewport: this.viewport }));
        }
    }

    update() {
        this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
        const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
        if (this.medias) {
            this.medias.forEach(media => media.update(this.scroll, direction));
        }
        this.renderer.render({ scene: this.scene, camera: this.camera });
        this.scroll.last = this.scroll.current;
        this.raf = window.requestAnimationFrame(this.update.bind(this));
    }

    addEventListeners() {
        this.boundOnResize = this.onResize.bind(this);
        this.boundOnWheel = this.onWheel.bind(this);
        this.boundOnTouchDown = this.onTouchDown.bind(this);
        this.boundOnTouchMove = this.onTouchMove.bind(this);
        this.boundOnTouchUp = this.onTouchUp.bind(this);
        window.addEventListener('resize', this.boundOnResize);
        this.container.addEventListener('mousewheel', this.boundOnWheel);
        this.container.addEventListener('wheel', this.boundOnWheel);
        this.container.addEventListener('mousedown', this.boundOnTouchDown);
        this.container.addEventListener('mousemove', this.boundOnTouchMove);
        this.container.addEventListener('mouseup', this.boundOnTouchUp);
        this.container.addEventListener('touchstart', this.boundOnTouchDown);
        this.container.addEventListener('touchmove', this.boundOnTouchMove);
        this.container.addEventListener('touchend', this.boundOnTouchUp);
    }

    destroy() {
        window.cancelAnimationFrame(this.raf);
        window.removeEventListener('resize', this.boundOnResize);
        this.container.removeEventListener('mousewheel', this.boundOnWheel);
        this.container.removeEventListener('wheel', this.boundOnWheel);
        this.container.removeEventListener('mousedown', this.boundOnTouchDown);
        this.container.removeEventListener('mousemove', this.boundOnTouchMove);
        this.container.removeEventListener('mouseup', this.boundOnTouchUp);
        this.container.removeEventListener('touchstart', this.boundOnTouchDown);
        this.container.removeEventListener('touchmove', this.boundOnTouchMove);
        this.container.removeEventListener('touchend', this.boundOnTouchUp);
        if (this.renderer && this.renderer.gl && this.renderer.gl.canvas.parentNode) {
            this.renderer.gl.canvas.parentNode.removeChild(this.renderer.gl.canvas as HTMLCanvasElement);
        }
    }
}

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
    font = 'bold 24px DM Sans',
    scrollSpeed = 2,
    scrollEase = 0.05
}: CertificatesGalleryProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const expandedImageRef = useRef<HTMLImageElement>(null);
    const [expandedImage, setExpandedImage] = useState<{ image: string; text: string } | null>(null);

    const handleImageClick = (image: string, text: string) => {
        setExpandedImage({ image, text });
    };

    const handleClose = () => {
        if (expandedImageRef.current && overlayRef.current) {
            gsap.to(expandedImageRef.current, {
                scale: 0.8,
                opacity: 0,
                duration: 0.4,
                ease: "power2.inOut"
            });
            gsap.to(overlayRef.current, {
                opacity: 0,
                duration: 0.3,
                ease: "power2.inOut",
                onComplete: () => setExpandedImage(null)
            });
        } else {
            setExpandedImage(null);
        }
    };

    useEffect(() => {
        if (expandedImage && expandedImageRef.current && overlayRef.current) {
            gsap.fromTo(overlayRef.current,
                { opacity: 0 },
                { opacity: 1, duration: 0.3, ease: "power2.out" }
            );
            gsap.fromTo(expandedImageRef.current,
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.5, ease: "power3.out" }
            );
        }
    }, [expandedImage]);

    useEffect(() => {
        if (!containerRef.current) return;
        const app = new App(containerRef.current, {
            items,
            bend,
            textColor,
            borderRadius,
            font,
            scrollSpeed,
            scrollEase,
            onImageClick: handleImageClick
        });
        return () => {
            app.destroy();
        };
    }, [items, bend, textColor, borderRadius, font, scrollSpeed, scrollEase]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && expandedImage) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [expandedImage]);

    return (
        <>
            <div className="relative w-full h-full">
                {/* Fade left – solo desktop */}
                <div className="hidden lg:flex absolute left-0 top-0 bottom-0 z-10 pointer-events-none">
                    {/* Negro sólido */}
                    <div className="w-16 bg-black" />

                    {/* Fade */}
                    <div className="w-40 bg-gradient-to-r from-black to-transparent" />
                </div>

                {/* Fade right – solo desktop */}
                <div className="hidden lg:flex absolute right-0 top-0 bottom-0 z-10 pointer-events-none">
                    {/* Fade */}
                    <div className="w-40 bg-gradient-to-l from-black to-transparent" />

                    {/* Negro sólido */}
                    <div className="w-16 bg-black" />
                </div>

                <div
                    className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
                    ref={containerRef}
                />
            </div>


            {/* Expanded Image Modal */}
            {expandedImage && (
                <>
                    <div
                        ref={overlayRef}
                        className="fixed inset-0 bg-black/90 z-[100] cursor-pointer"
                        onClick={handleClose}
                    />
                    <div
                        className="fixed inset-0 z-[101] flex items-center justify-center p-8 pointer-events-none"
                    >
                        <div className="relative max-w-2xl w-full pointer-events-auto">
                            <button
                                onClick={handleClose}
                                className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors flex items-center gap-2"
                            >
                                <span className="text-sm uppercase tracking-widest font-mono">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <img
                                ref={expandedImageRef}
                                src={expandedImage.image}
                                alt={expandedImage.text}
                                className="w-full h-auto rounded-2xl shadow-2xl"
                                style={{ boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5)' }}
                            />

                            <h3 className="text-center text-white text-2xl md:text-3xl font-bold mt-6 uppercase tracking-wide">
                                {expandedImage.text}
                            </h3>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
