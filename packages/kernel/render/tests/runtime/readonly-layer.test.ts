import type { Scene } from '@retikz/core';

import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { RenderReadonlyLayer } from '../../src/runtime';

import * as runtime from '../../src/runtime';
import { validateReadonlyLayers } from '../../src/runtime';

const makeScene = (overrides: Partial<Scene> = {}): Scene => ({
  layout: { x: 0, y: 0, width: 10, height: 10 },
  primitives: [],
  ...overrides,
});

const makeLayer = (overrides: Partial<RenderReadonlyLayer> = {}): RenderReadonlyLayer => ({
  key: 'guide',
  scene: makeScene(),
  transform: [1, 0, 0, 1, 0, 0],
  ...overrides,
});

describe('readonly render layer contract', () => {
  it('does not expose or retain the removed inspection-specific Render contract', () => {
    expect('RetainedRendererInspectionCapability' in runtime).toBe(false);
    expect('RetainedRendererInspectionUnsupported' in runtime.RetainedRenderErrorCode).toBe(false);
    expect(existsSync(fileURLToPath(new URL('../../src/svg/builders/inspection.ts', import.meta.url)))).toBe(false);
    expect(existsSync(fileURLToPath(new URL('../../src/canvas/draw-inspection.ts', import.meta.url)))).toBe(false);
  });

  it('canonicalizes a valid ordered layer sequence as deeply frozen data', () => {
    const layers = validateReadonlyLayers([makeLayer()]);

    expect(layers).toHaveLength(1);
    expect(Object.isFrozen(layers)).toBe(true);
    expect(Object.isFrozen(layers[0])).toBe(true);
    expect(Object.isFrozen(layers[0]?.transform)).toBe(true);
    expect(Object.isFrozen(layers[0]?.scene)).toBe(true);
  });

  it('deeply freezes mutable children even when the layer envelope is already frozen', () => {
    const scene = makeScene();
    const layer = Object.freeze(makeLayer({ scene }));

    const layers = validateReadonlyLayers([layer]);

    expect(Object.isFrozen(layers[0]?.scene)).toBe(true);
    expect(Object.isFrozen(layers[0]?.scene.primitives)).toBe(true);
  });

  it.each(['', '   '])('rejects empty layer key %j', key => {
    expect(() => validateReadonlyLayers([makeLayer({ key })])).toThrow();
  });

  it('rejects duplicate layer keys within one frame', () => {
    expect(() => validateReadonlyLayers([makeLayer(), makeLayer()])).toThrow();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite transform component %s',
    value => {
      expect(() => validateReadonlyLayers([makeLayer({ transform: [1, 0, 0, 1, value, 0] })])).toThrow();
    },
  );

  it('rejects public primitive identity and metadata in layer Scenes', () => {
    const withId = makeScene({
      primitives: [{ type: 'rect', id: 'public', x: 0, y: 0, width: 1, height: 1 }],
    });
    const withMeta = makeScene({
      primitives: [{ type: 'rect', meta: { source: 'layer' }, x: 0, y: 0, width: 1, height: 1 }],
    });

    expect(() => validateReadonlyLayers([makeLayer({ scene: withId })])).toThrow();
    expect(() => validateReadonlyLayers([makeLayer({ scene: withMeta })])).toThrow();
  });

  it('rejects primitive and root animation semantics in layer Scenes', () => {
    const animation = {
      property: 'opacity' as const,
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 100,
    };
    const primitiveAnimation = makeScene({
      primitives: [{ type: 'rect', x: 0, y: 0, width: 1, height: 1, animations: [animation] }],
    });
    const rootAnimation = makeScene({ animations: [animation] });

    expect(() => validateReadonlyLayers([makeLayer({ scene: primitiveAnimation })])).toThrow();
    expect(() => validateReadonlyLayers([makeLayer({ scene: rootAnimation })])).toThrow();
  });
});
