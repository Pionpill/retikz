import { describe, expect, it } from 'vitest';

import type { IRPathBase, IRScope } from '../../src/schemas';

import {
  createStyleResolveFrame,
  cutsStyleChannel,
  resolveDashPattern,
  resolveDropShadow,
  resolveEffectiveNodeStyle,
  resolveEffectivePath,
} from '../../src/resolve/style';
import { GeometryLabelSchema, NodeSchema, PathBaseSchema, SHADOW_PRESETS } from '../../src/schemas';

const styleScope = (properties: Partial<IRScope>): IRScope => ({
  type: 'scope',
  children: [],
  ...properties,
});

const pathOf = (properties: Partial<IRPathBase> = {}): IRPathBase =>
  PathBaseSchema.parse({
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [20, 0] },
    ],
    ...properties,
  });

describe('resolve style frame', () => {
  it('cuts only the channels named by resetStyle', () => {
    expect(cutsStyleChannel(['node'], 'node')).toBe(true);
    expect(cutsStyleChannel(['node'], 'path')).toBe(false);
    expect(cutsStyleChannel(['label', 'arrow'], 'label')).toBe(true);
    expect(cutsStyleChannel(['label', 'arrow'], 'arrow')).toBe(true);
    expect(cutsStyleChannel(['label', 'arrow'], 'node')).toBe(false);
  });

  it('propagates a scope master color to node and path channels', () => {
    const frame = createStyleResolveFrame(styleScope({ color: 'red' }));
    const node = NodeSchema.parse({ type: 'node', position: [0, 0] });

    expect(resolveEffectiveNodeStyle(node, [frame])).toMatchObject({
      fill: 'red',
      stroke: 'red',
      textColor: 'red',
    });
    expect(resolveEffectivePath(pathOf(), [frame])).toMatchObject({ stroke: 'red' });
  });

  it('applies label font fields by per-field priority', () => {
    const frame = createStyleResolveFrame(
      styleScope({ labelDefault: { font: { family: 'default', size: 20, weight: 'bold' } } }),
    );
    const label = GeometryLabelSchema.parse({ text: 'x', font: { family: 'label', size: 10 } });
    const resolved = resolveEffectivePath(pathOf({ label }), [frame]);

    expect(resolved.label).toMatchObject({
      font: { family: 'label', size: 10, weight: 'bold' },
    });
  });

  it('applies arrow start and end overrides after shared defaults', () => {
    const frame = createStyleResolveFrame(
      styleScope({
        arrowDefault: {
          shape: 'stealth',
          scale: 2,
          start: { shape: 'triangle' },
          end: { shape: 'circle' },
        },
      }),
    );
    const resolved = resolveEffectivePath(
      pathOf({
        marks: [
          { pos: 0, mark: { kind: 'arrow' } },
          { pos: 1, mark: { kind: 'arrow', scale: 3 } },
        ],
      }),
      [frame],
    );

    expect(resolved.marks?.[0]?.mark).toMatchObject({ shape: 'triangle', scale: 2 });
    expect(resolved.marks?.[1]?.mark).toMatchObject({ shape: 'circle', scale: 3 });
  });
});

describe('resolveDashPattern', () => {
  it('uses an explicit dash pattern before dashed and dotted presets', () => {
    expect(resolveDashPattern([0, 2], true, true)).toEqual([0, 2]);
  });

  it('uses dashed before dotted and preserves explicit false selectors', () => {
    expect(resolveDashPattern(undefined, true, true)).toEqual([4, 2]);
    expect(resolveDashPattern(undefined, false, true)).toEqual([1, 2]);
    expect(resolveDashPattern(undefined, false, false)).toBeUndefined();
  });
});

describe('resolveDropShadow', () => {
  it('expands preset strings and preset objects to the same canonical shadow', () => {
    expect(resolveDropShadow('md')).toEqual(SHADOW_PRESETS.md);
    expect(resolveDropShadow({ preset: 'md' })).toEqual(SHADOW_PRESETS.md);
  });

  it('applies explicit fields after the preset while preserving falsy values', () => {
    expect(resolveDropShadow({ preset: 'sm', offsetY: 0, blur: 0, opacity: 0 })).toEqual({
      offsetX: SHADOW_PRESETS.sm!.offsetX,
      offsetY: 0,
      blur: 0,
      color: SHADOW_PRESETS.sm!.color,
      opacity: 0,
    });
  });

  it('supplies the default color for explicit offsets and keeps omitted or none absent', () => {
    expect(resolveDropShadow({ offsetX: 0, offsetY: 0 })).toEqual({
      offsetX: 0,
      offsetY: 0,
      color: 'rgba(0,0,0,0.5)',
    });
    expect(resolveDropShadow(undefined)).toBeUndefined();
    expect(resolveDropShadow('none')).toBeUndefined();
  });
});
