import { describe, expect, it } from 'vitest';

import {
  resolveScopeDefaults,
  resolveDashPattern,
  resolveDropShadow,
  resolveEffectiveNodeStyle,
  resolveEffectivePath,
} from '../../src/resolve/style';
import type { IRPathBase, IRScope, IRScopeDefaults } from '../../src/schemas';
import { PathLabelSchema, NodeSchema, PathSchema, SHADOW_PRESETS } from '../../src/schemas';

const styleScope = (properties: Partial<IRScope>): IRScope => ({
  type: 'scope',
  children: [],
  ...properties,
});

const pathOf = (properties: Partial<IRPathBase> = {}): IRPathBase =>
  PathSchema.parse({
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [0, 0] },
      { type: 'step', kind: 'line', to: [20, 0] },
    ],
    ...properties,
  });

describe('Scope 有效默认值', () => {
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
    expect(node.style).toMatchObject({ stroke: 'green', opacity: { overall: 0 }, fill: 'gold', textColor: 'gold' });
    expect(resolveEffectivePath(pathOf(), child).style?.stroke).toBe('green');
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, parent).style).toMatchObject({
      stroke: 'blue',
      opacity: { overall: 0.8 },
      fill: 'red',
    });
  });

  it('子层 reset 和元素箭头主色不污染兄弟使用的配置', () => {
    const parent = resolveScopeDefaults(
      styleScope({
        defaults: {
          style: { color: 'red' },
          node: { style: { fill: 'blue' }, label: { textColor: 'orange' } },
          path: { label: { textColor: 'orange' }, arrow: { color: 'purple', end: { color: 'green', scale: 2 } } },
        },
      }),
    );
    const child = resolveScopeDefaults(
      styleScope({ defaults: { reset: ['node', 'path'], path: { arrow: {} } } }),
      parent,
    );
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, child).style).toEqual({});
    expect(child.node?.label).toBeUndefined();
    expect(child.path?.label).toEqual({});
    expect(child.path?.arrow).toEqual({});
    const arrow = { end: {} };
    expect(resolveEffectivePath(pathOf({ style: { color: 'gold' }, arrow }), parent).arrow?.end).toMatchObject({
      color: 'gold',
      scale: 2,
    });
    expect(resolveEffectivePath(pathOf({ arrow }), parent).arrow?.end).toMatchObject({ color: 'red', scale: 2 });
    expect(parent.path?.arrow).toEqual({ color: 'purple', end: { color: 'green', scale: 2 } });
    expect(resolveEffectiveNodeStyle({ type: 'node', position: [0, 0] }, parent).style?.fill).toBe('blue');
  });

  it.each<{ reset: IRScopeDefaults['reset']; keepNode: boolean; keepPath: boolean }>([
    { reset: ['node'], keepNode: false, keepPath: true },
    { reset: ['path'], keepNode: true, keepPath: false },
    { reset: true, keepNode: false, keepPath: false },
    { reset: [], keepNode: true, keepPath: true },
    { reset: false, keepNode: true, keepPath: true },
    { reset: undefined, keepNode: true, keepPath: true },
  ])('按 reset=$reset 决定节点和路径是否继承父级默认值', ({ reset, keepNode, keepPath }) => {
    const parent = resolveScopeDefaults(styleScope({ defaults: { style: { color: 'red' } } }));
    const child = resolveScopeDefaults(styleScope({ defaults: { reset } }), parent);

    expect(child.node).toEqual(keepNode ? parent.node : undefined);
    expect(child.path).toEqual(keepPath ? parent.path : undefined);
  });

  it('将范围主颜色传播到节点和路径通道', () => {
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

  it('按每个字段优先级应用标签字体字段', () => {
    const frame = resolveScopeDefaults(
      styleScope({
        defaults: {
          node: { label: { font: { family: 'default', size: 20, weight: 'bold' } } },
          path: { label: { font: { family: 'default', size: 20, weight: 'bold' } } },
        },
      }),
    );
    const label = PathLabelSchema.parse({ text: 'x', font: { family: 'label', size: 10 } });
    const resolved = resolveEffectivePath(pathOf({ label }), frame);

    expect(resolved.label).toMatchObject({
      font: { family: 'label', size: 10, weight: 'bold' },
    });
  });

  it('在共享默认值后应用箭头开始和结束覆盖', () => {
    const frame = resolveScopeDefaults(
      styleScope({
        defaults: {
          path: {
            arrow: {
              shape: 'stealth',
              scale: 2,
              start: { shape: 'triangle' },
              end: { shape: 'circle' },
            },
          },
        },
      }),
    );
    const resolved = resolveEffectivePath(
      pathOf({
        arrow: { start: {}, end: { scale: 3 } },
      }),
      frame,
    );

    expect(resolved.arrow?.start).toMatchObject({ shape: 'triangle', scale: 2 });
    expect(resolved.arrow?.end).toMatchObject({ shape: 'circle', scale: 3 });
  });
});

describe('resolveDashPattern', () => {
  it('在虚线和点线预设之前使用显式虚线图案', () => {
    expect(resolveDashPattern([0, 2], true, true)).toEqual([0, 2]);
  });

  it('在点之前使用破折号，并保留显式的错误选择器', () => {
    expect(resolveDashPattern(undefined, true, true)).toEqual([4, 2]);
    expect(resolveDashPattern(undefined, false, true)).toEqual([1, 2]);
    expect(resolveDashPattern(undefined, false, false)).toBeUndefined();
  });
});

describe('resolveDropShadow', () => {
  it('将预设字符串和预设对象扩展为相同的规范阴影', () => {
    expect(resolveDropShadow('md')).toEqual(SHADOW_PRESETS.md);
    expect(resolveDropShadow({ preset: 'md' })).toEqual(SHADOW_PRESETS.md);
  });

  it('在预设后应用显式字段，同时保留虚假值', () => {
    expect(resolveDropShadow({ preset: 'sm', offsetY: 0, blur: 0, opacity: 0 })).toEqual({
      offsetX: SHADOW_PRESETS.sm!.offsetX,
      offsetY: 0,
      blur: 0,
      color: SHADOW_PRESETS.sm!.color,
      opacity: 0,
    });
  });

  it('为显式偏移提供默认颜色，并保持省略或不缺失', () => {
    expect(resolveDropShadow({ offsetX: 0, offsetY: 0 })).toEqual({
      offsetX: 0,
      offsetY: 0,
      color: 'rgba(0,0,0,0.5)',
    });
    expect(resolveDropShadow(undefined)).toBeUndefined();
    expect(resolveDropShadow('none')).toBeUndefined();
  });
});
