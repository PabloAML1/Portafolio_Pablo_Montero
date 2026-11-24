import * as shader from "./portrait-fluid-shaders";

export type Point = readonly [number, number];
type Plane = readonly [number, number, number, number];
type Uniform = number | Point | Plane;

interface Target {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

interface Pass {
  program: WebGLProgram;
  locations: Map<string, WebGLUniformLocation | null>;
}

export interface Stroke {
  point: Point;
  force: Point;
}

const FLUID_STEP = .014;

function imagePlane(image: HTMLImageElement, width: number, height: number): Plane {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const planeWidth = image.naturalWidth * scale;
  const planeHeight = image.naturalHeight * scale;
  return [width / 2, height / 2 - (planeHeight - height) * .38, planeWidth, planeHeight];
}

export function createPortraitFluid(canvas: HTMLCanvasElement, photo: HTMLImageElement, marble: HTMLImageElement) {
  const gl = canvas.getContext("webgl2", { alpha: true, antialias: false, depth: false, stencil: false, premultipliedAlpha: true });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) return null;

  const textures = new Set<WebGLTexture>();
  const programs = new Set<WebGLProgram>();
  const framebuffers = new Set<WebGLFramebuffer>();
  const vao = gl.createVertexArray();
  if (!vao) return null;

  const dispose = () => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    gl.deleteVertexArray(vao);
    textures.forEach((texture) => gl.deleteTexture(texture));
    programs.forEach((program) => gl.deleteProgram(program));
    framebuffers.forEach((buffer) => gl.deleteFramebuffer(buffer));
    textures.clear();
    programs.clear();
    framebuffers.clear();
  };

  const compile = (type: number, source: string) => {
    const compiled = gl.createShader(type);
    if (!compiled) throw new Error("Could not allocate portrait shader");
    gl.shaderSource(compiled, source);
    gl.compileShader(compiled);
    if (!gl.getShaderParameter(compiled, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(compiled);
      gl.deleteShader(compiled);
      throw new Error(message ?? "Could not compile portrait shader");
    }
    return compiled;
  };

  const makePass = (vertex: WebGLShader, source: string): Pass => {
    const fragment = compile(gl.FRAGMENT_SHADER, source);
    try {
      const program = gl.createProgram();
      if (!program) throw new Error("Could not allocate portrait program");
      programs.add(program);
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Could not link portrait program");
      return { program, locations: new Map() };
    } finally {
      gl.deleteShader(fragment);
    }
  };

  const makeTexture = (filter: number) => {
    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not allocate portrait texture");
    textures.add(texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };

  const upload = (image: HTMLImageElement) => {
    const texture = makeTexture(gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return texture;
  };

  const makeTarget = (width: number, height: number): Target => {
    const texture = makeTexture(gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer();
    if (!framebuffer) throw new Error("Could not allocate portrait framebuffer");
    framebuffers.add(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Floating-point portrait framebuffer unavailable");
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height };
  };

  const uniformLocation = (pass: Pass, name: string) => {
    if (!pass.locations.has(name)) pass.locations.set(name, gl.getUniformLocation(pass.program, name));
    return pass.locations.get(name) ?? null;
  };

  const draw = (pass: Pass, output: Target | null, inputs: Record<string, WebGLTexture>, uniforms: Record<string, Uniform> = {}) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, output?.framebuffer ?? null);
    gl.viewport(0, 0, output?.width ?? canvas.width, output?.height ?? canvas.height);
    gl.bindVertexArray(vao);
    gl.useProgram(pass.program);
    let unit = 0;
    for (const [name, texture] of Object.entries(inputs)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uniformLocation(pass, name), unit++);
    }
    for (const [name, value] of Object.entries(uniforms)) {
      const location = uniformLocation(pass, name);
      if (typeof value === "number") gl.uniform1f(location, value);
      else if (value.length === 2) gl.uniform2f(location, ...value);
      else gl.uniform4f(location, ...value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  try {
    const vertex = compile(gl.VERTEX_SHADER, shader.fullscreenVertex);
    const passes = (() => {
      try {
        return {
          advection: makePass(vertex, shader.advect),
          splat: makePass(vertex, shader.splat),
          divergence: makePass(vertex, shader.divergence),
          poisson: makePass(vertex, shader.poisson),
          projection: makePass(vertex, shader.project),
          composite: makePass(vertex, shader.compose),
        };
      } finally {
        gl.deleteShader(vertex);
      }
    })();

    const photos = { photo: upload(photo), marble: upload(marble) };
    let state: { velocity: Target; advected: Target; pressure: Target; scratch: Target; divergence: Target } | undefined;
    let frame: Point = [1, 1];
    let cell: Point = [1 / 110, 1 / 110];
    let ratio: Point = [1, 1];
    let photoPlane = imagePlane(photo, 1, 1);
    let marblePlane = imagePlane(marble, 1, 1);

    const clear = () => {
      if (!state) return;
      for (const buffer of Object.values(state)) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, buffer.framebuffer);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const resize = (width: number, height: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const canvasWidth = Math.max(1, Math.round(width * dpr));
      const canvasHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== canvasWidth) canvas.width = canvasWidth;
      if (canvas.height !== canvasHeight) canvas.height = canvasHeight;

      frame = [width, height];
      photoPlane = imagePlane(photo, width, height);
      marblePlane = imagePlane(marble, width, height);

      const w = Math.max(2, Math.round(width * .1));
      const h = Math.max(2, Math.round(height * .1));
      if (state?.velocity.width === w && state.velocity.height === h) return;
      if (state) {
        for (const target of Object.values(state)) {
          gl.deleteFramebuffer(target.framebuffer);
          gl.deleteTexture(target.texture);
          framebuffers.delete(target.framebuffer);
          textures.delete(target.texture);
        }
      }
      cell = [1 / 110, w / h / 110];
      ratio = [Math.max(w, h) / w, Math.max(w, h) / h];
      state = {
        velocity: makeTarget(w, h),
        advected: makeTarget(w, h),
        pressure: makeTarget(w, h),
        scratch: makeTarget(w, h),
        divergence: makeTarget(w, h),
      };
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    const step = (strokes: readonly Stroke[]) => {
      if (!state) return;
      const { velocity, advected, divergence } = state;
      const dt = FLUID_STEP;
      draw(passes.advection, advected, { velocity: velocity.texture }, { dt, ratio });
      if (strokes.length) {
        const radius: Point = [cell[0] * 9, cell[1] * 9];
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        for (const { point, force } of strokes) {
          const center: Point = [
            Math.min(1 - radius[0], Math.max(radius[0], point[0])),
            Math.min(1 - radius[1], Math.max(radius[1], point[1])),
          ];
          draw(passes.splat, advected, {}, { center, radius, force });
        }
        gl.disable(gl.BLEND);
      }

      draw(passes.divergence, divergence, { velocity: advected.texture }, { cell, dt });
      // Start the four-iteration solve from zero to avoid accumulating residual pressure.
      gl.bindFramebuffer(gl.FRAMEBUFFER, state.pressure.framebuffer);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (let i = 0; i < 4; i++) {
        draw(passes.poisson, state.scratch, { pressure: state.pressure.texture, divergence: divergence.texture }, { cell });
        [state.pressure, state.scratch] = [state.scratch, state.pressure];
      }
      draw(passes.projection, velocity, { velocity: advected.texture, pressure: state.pressure.texture }, { cell, dt });
    };

    const render = (pointer: Point, fullReveal: number) => {
      if (!state) return;
      draw(passes.composite, null, { velocity: state.velocity.texture, ...photos }, { pointer, fullReveal, frame, photoPlane, marblePlane });
    };

    if (gl.getError() !== gl.NO_ERROR) throw new Error("Could not upload portrait images");
    return { resize, step, render, clear, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
