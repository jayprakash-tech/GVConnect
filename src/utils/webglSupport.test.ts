import test from 'node:test';
import assert from 'node:assert/strict';
import {
  acquireWebGL2Context,
  inspectWebGLCapabilities,
  isSoftwareWebGLRenderer,
  type CanvasLike,
} from './webglSupport';

test('isSoftwareWebGLRenderer identifies SwiftShader, llvmpipe, and disabled renderers', () => {
  assert.equal(isSoftwareWebGLRenderer('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))'), true);
  assert.equal(isSoftwareWebGLRenderer('llvmpipe (LLVM 15.0.6, 256 bits)'), true);
  assert.equal(isSoftwareWebGLRenderer('Disabled'), true);
  assert.equal(isSoftwareWebGLRenderer(''), true);
  assert.equal(isSoftwareWebGLRenderer('ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro)'), false);
  assert.equal(isSoftwareWebGLRenderer('NVIDIA GeForce RTX 4070'), false);
});

test('inspectWebGLCapabilities returns unsupported without throwing when WebGL2 is unavailable', () => {
  const res = inspectWebGLCapabilities({
    hasWebGL2Global: false,
    createCanvas: () => null,
  });
  assert.deepEqual(res, { supported: false, isSoftware: true, rendererName: '' });
});

test('inspectWebGLCapabilities returns unsupported when getContext returns null (sandboxed/disabled GL)', () => {
  const canvas: CanvasLike = {
    getContext: () => null,
  };
  const res = inspectWebGLCapabilities({
    hasWebGL2Global: true,
    createCanvas: () => canvas,
  });
  assert.deepEqual(res, { supported: false, isSoftware: true, rendererName: '' });
});

test('inspectWebGLCapabilities returns unsupported when getContext throws or context is already lost', () => {
  const throwingCanvas: CanvasLike = {
    getContext: () => {
      throw new Error('BindToCurrentSequence failed');
    },
  };
  assert.deepEqual(
    inspectWebGLCapabilities({
      hasWebGL2Global: true,
      createCanvas: () => throwingCanvas,
    }),
    { supported: false, isSoftware: true, rendererName: '' }
  );

  const lostCanvas: CanvasLike = {
    getContext: () =>
      ({
        isContextLost: () => true,
      } as unknown as WebGL2RenderingContext),
  };
  assert.deepEqual(
    inspectWebGLCapabilities({
      hasWebGL2Global: true,
      createCanvas: () => lostCanvas,
    }),
    { supported: false, isSoftware: true, rendererName: '' }
  );
});

test('inspectWebGLCapabilities detects hardware vs software GL and disposes probe context', () => {
  let lostCalled = false;
  const fakeGl = {
    RENDERER: 0x1f01,
    isContextLost: () => false,
    getExtension: (name: string) => {
      if (name === 'WEBGL_debug_renderer_info') {
        return { UNMASKED_RENDERER_WEBGL: 0x9246 };
      }
      if (name === 'WEBGL_lose_context') {
        return {
          loseContext: () => {
            lostCalled = true;
          },
        };
      }
      return null;
    },
    getParameter: (param: number) =>
      param === 0x9246 ? 'ANGLE (Apple, Apple M2)' : 'WebKit WebGL',
  } as unknown as WebGL2RenderingContext;

  const res = inspectWebGLCapabilities({
    hasWebGL2Global: true,
    createCanvas: () => ({
      getContext: (id) => (id === 'webgl2' ? fakeGl : null),
    }),
  });

  assert.equal(res.supported, true);
  assert.equal(res.isSoftware, false);
  assert.equal(res.rendererName, 'ANGLE (Apple, Apple M2)');
  assert.equal(lostCalled, true);
});

test('acquireWebGL2Context falls back across attribute candidates cleanly', () => {
  let attempts = 0;
  const fakeGl = {
    isContextLost: () => false,
  } as unknown as WebGL2RenderingContext;

  const ctx = acquireWebGL2Context(
    {
      getContext: (_id, opts) => {
        attempts += 1;
        // Simulate driver rejecting powerPreference attribute but accepting default call
        if (opts !== undefined) return null;
        return fakeGl;
      },
    },
    true
  );

  assert.equal(ctx, fakeGl);
  assert.equal(attempts, 3);
});
