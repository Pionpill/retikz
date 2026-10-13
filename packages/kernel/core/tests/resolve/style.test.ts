import { describe, expect, it } from 'vitest';

import {
  resolveScopeDefaults,
  cutsStyleChannel,
  resolveDashPattern,
  resolveDropShadow,
  resolveEffectiveNodeStyle,
  resolveEffectivePath,
} from '../../src/resolve/style';
import type { IRPathBase, IRScope } from '../../src/schemas';
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

describe('Scope effective defaults', () => {
  it('按层合并共同样式与通道样式，实例主色在继承完成后展开', () => {
    const parent = resolveScopeDefaults(
      styleScope({
        defaults: {
          style: { color: 'red' },
          node: { style: { stroke: 'blue', opacity: 0.8 } },
          path: { style: { stroke: 'blue' } },
        },
      }),
    );
    const child = resolveScopeDefaults(
      styleScope({
        defaults: {
          style: { stroke: 'green', opacity: 0 },
          node: { style: { stroke: undefined } },
        },
      }),
      parent,
    );
    const node = resolveEffectiveNodeStyle({ type: 'node', position: [0, 0], style: { color: 'gold' } }, child);
    expect(node.style).toMatchObject({ stroke: 'green', opacity: 0, fill: 'gold', textColor: 'gold' });
    expect(resolveEffectivePath(pathOf(), child).style?.stroke).toBe('green');
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, parent).style).toMatchObject({
      stroke: 'blue',
      opacity: 0.8,
      fill: 'red',
    });
  });

  it('子层 reset 和元素箭头主色不污染兄弟使用的配置', () => {
    const parent = resolveScopeDefaults(
      styleScope({
        defaults: {
          style: { color: 'red' },
          node: { style: { fill: 'blue' } },
          arrow: { color: 'purple', end: { color: 'green', scale: 2 } },
          label: { textColor: 'orange' },
        },
      }),
    );
    const child = resolveScopeDefaults(styleScope({ defaults: { reset: ['node', 'arrow'], arrow: {} } }), parent);
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, child).style).toEqual({});
    expect(child.scopeColor).toBe('red');
    expect(child.label).toEqual({ textColor: 'orange' });
    expect(child.arrow).toEqual({});
    const marks = [{ pos: 1, mark: { kind: 'arrow' as const } }];
    expect(resolveEffectivePath(pathOf({ style: { color: 'gold' }, marks }), parent).marks?.[0]?.mark).toMatchObject({
      color: 'gold',
      scale: 2,
    });
    expect(resolveEffectivePath(pathOf({ marks }), parent).marks?.[0]?.mark).toMatchObject({ color: 'red', scale: 2 });
    expect(parent.arrow).toEqual({ color: 'purple', end: { color: 'green', scale: 2 } });
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, parent).style?.fill).toBe('blue');
  });

  it('cuts only the channels named by resetStyle', () => {
    expect(cutsStyleChannel(['node'], 'node')).toBe(true);
    expect(cutsStyleChannel(['node'], 'path')).toBe(false);
    expect(cutsStyleChannel(['label', 'arrow'], 'label')).toBe(true);
    expect(cutsStyleChannel(['label', 'arrow'], 'arrow')).toBe(true);
    expect(cutsStyleChannel(['label', 'arrow'], 'node')).toBe(false);
  });

  it('propagates a scope master color to node and path channels', () => {
    const frame = resolveScopeDefaults(
      styleScope({
        defaults: { style: { color: 'red' } },
      }),
    );
    const node = NodeSchema.parse({ type: 'node', position: [0, 0] });

    expect(resolveEffectiveNodeStyle(node, frame)).toMatchObject({
      style: { fill: 'red', stroke: 'red', textColor: 'red' },
    });
    expect(resolveEffectivePath(pathOf(), frame)).toMatchObject({
      style: { color: 'red' },
    });
  });

  it('applies label font fields by per-field priority', () => {
    const frame = resolveScopeDefaults(
      styleScope({
        defaults: { label: { font: { family: 'default', size: 20, weight: 'bold' } } },
      }),
    );
    const label = GeometryLabelSchema.parse({ text: 'x', font: { family: 'label', size: 10 } });
    const resolved = resolveEffectivePath(pathOf({ label }), frame);

    expect(resolved.label).toMatchObject({
      font: { family: 'label', size: 10, weight: 'bold' },
    });
  });

  it('applies arrow start and end overrides after shared defaults', () => {
    const frame = resolveScopeDefaults(
      styleScope({
        defaults: {
          arrow: {
            shape: 'stealth',
            scale: 2,
            start: { shape: 'triangle' },
            end: { shape: 'circle' },
          },
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
      frame,
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
