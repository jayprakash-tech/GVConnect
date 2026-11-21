export interface WebGLCapabilitiesResult {
  supported: boolean;
  isSoftware: boolean;
  rendererName: string;
}

export interface CanvasLike {
  getContext: (
    contextId: 'webgl2',
    options?: WebGLContextAttributes
  ) => WebGL2RenderingContext | null;
  addEventListener?: (type: string, listener: EventListener) => void;
  removeEventListener?: (type: string, listener: EventListener) => void;
}

export function isSoftwareWebGLRenderer(rendererName: string): boolean {
  if (!rendererName) return true;
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render|Disabled|0xffff/i.test(
    rendererName
  );
}

function readRendererName(gl: WebGL2RenderingContext): string {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    return String(gl.getParameter(param) || '');
  } catch {
    return '';
  }
}

function tryGetWebGL2Context(
  canvas: CanvasLike,
  antialias: boolean
): WebGL2RenderingContext | null {
  const attributeCandidates: (WebGLContextAttributes | undefined)[] = [
    {
      alpha: true,
      depth: true,
      stencil: false,
      antialias,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    },
    {
      alpha: true,
      antialias,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
    },
    undefined,
  ];

  const suppressCreationError = (e: Event) => {
    if (typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
  };

  canvas.addEventListener?.('webglcontextcreationerror', suppressCreationError);
  try {
    for (const attrs of attributeCandidates) {
      try {
        const ctx =
          attrs === undefined
            ? canvas.getContext('webgl2')
            : canvas.getContext('webgl2', attrs);
        if (ctx && !ctx.isContextLost?.()) {
          return ctx;
        }
      } catch {
        // Try next attribute candidate
      }
    }
    return null;
  } finally {
    canvas.removeEventListener?.('webglcontextcreationerror', suppressCreationError);
  }
}

/**
 * Probes WebGL2 support BEFORE constructing THREE.WebGLRenderer so environments with
 * disabled/sandboxed GPU (GL_VENDOR = Disabled) fall back cleanly with zero WebGL console errors.
 */
export function inspectWebGLCapabilities(options?: {
  hasWebGL2Global?: boolean;
  createCanvas?: () => CanvasLike | null;
}): WebGLCapabilitiesResult {
  const hasWebGL2 =
    options?.hasWebGL2Global ??
    (typeof window !== 'undefined' && 'WebGL2RenderingContext' in window);
  if (!hasWebGL2) {
    return { supported: false, isSoftware: true, rendererName: '' };
  }

  let probe: CanvasLike | null = null;
  try {
    probe = options?.createCanvas
      ? options.createCanvas()
      : typeof document !== 'undefined'
      ? (document.createElement('canvas') as unknown as CanvasLike)
      : null;
  } catch {
    probe = null;
  }

  if (!probe) {
    return { supported: false, isSoftware: true, rendererName: '' };
  }

  const gl = tryGetWebGL2Context(probe, false);
  if (!gl) {
    return { supported: false, isSoftware: true, rendererName: '' };
  }

  const rendererName = readRendererName(gl);
  const isSoftware = isSoftwareWebGLRenderer(rendererName);

  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Ignore cleanup errors on probe canvas
  }

  return {
    supported: true,
    isSoftware,
    rendererName,
  };
}

/**
 * Acquires the actual WebGL2RenderingContext to hand directly to THREE.WebGLRenderer({ canvas, context }).
 */
export function acquireWebGL2Context(
  canvas: CanvasLike,
  antialias: boolean
): WebGL2RenderingContext | null {
  return tryGetWebGL2Context(canvas, antialias);
}
