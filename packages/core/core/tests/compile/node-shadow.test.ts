/**
 * ADR-01 Scene drop shadow — Node shape shadow 测试象限。
 *
 * 行为断言（已解析 shadow 出现在几何图元上）当前 FAIL：compile 尚未透传 shadow，
 * 属预期红态（Spec Writer 阶段只接 schema / IR / primitive 字段，不接 compile）。
 * schema accept/reject 与 round-trip 当前 PASS。
 *
 * 渲染层断言（SVG feDropShadow / Canvas ctx.shadow* 三端一致、跨端像素 parity）
 * 留 render 测试，本文件不覆盖。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { NodeSchema } from '../../src/ir';
import { SHADOW_PRESETS } from '../../src/ir/effects';
import type { IR } from '../../src/ir';
import type { ScenePrimitive } from '../../src/primitive';
import { flattenPrims } from '../helpers/flatten';

const silent = { onWarn: () => {} };

const scene = (children: IR['children']): IR => ({ version: 1, type: 'scene', children });

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const compileNode = (n: Record<string, unknown>): ReturnType<typeof compileToScene> =>
  compileToScene(scene([{ type: 'node', position: [0, 0], ...n }]), silent);

// ════════════════ Happy ════════════════

describe('[shadow] Happy', () => {
  it('node-shape-shadow：Node + 显式对象 → shape 几何图元带 resolved shadow', () => {
    const compiled = compileNode({
      shape: 'rectangle',
      text: 'card',
      fill: 'white',
      shadow: { offsetX: 1, offsetY: 2, blur: 4, color: 'rgba(0,0,0,0.4)' },
    });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect).toBeDefined();
    expect(rect!.shadow).toEqual({ offsetX: 1, offsetY: 2, blur: 4, color: 'rgba(0,0,0,0.4)' });
  });

  it('shadow-defaults：仅给 offsetX/Y → blur/color 取默认 rgba(0,0,0,0.5)', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', shadow: { offsetX: 2, offsetY: 2 } });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toMatchObject({ offsetX: 2, offsetY: 2, color: 'rgba(0,0,0,0.5)' });
  });

  it('shadow-preset-md：shadow="md" → compile 展开为 SHADOW_PRESETS.md', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', shadow: 'md' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toEqual(SHADOW_PRESETS.md);
  });

  it('shadow-preset-override：{preset:md, color, opacity} → offset/blur 取 md、color/opacity 覆盖', () => {
    const compiled = compileNode({
      shape: 'rectangle',
      text: 'x',
      shadow: { preset: 'md', color: '#3b82f6', opacity: 0.5 },
    });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toEqual({
      offsetX: SHADOW_PRESETS.md!.offsetX,
      offsetY: SHADOW_PRESETS.md!.offsetY,
      blur: SHADOW_PRESETS.md!.blur,
      color: '#3b82f6',
      opacity: 0.5,
    });
  });

  it('node-ellipse-shadow：circle/ellipse 节点 → EllipsePrim 带 shadow', () => {
    const compiled = compileNode({ shape: 'circle', text: 'x', shadow: 'lg' });
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.shadow).toEqual(SHADOW_PRESETS.lg);
  });
});

// ════════════════ 边界 ════════════════

describe('[shadow] 边界', () => {
  it('shadow-omitted-noop：不设 → 几何图元无 shadow（逐字不变）', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toBeUndefined();
  });

  it('blur-zero-hard：blur=0 → 硬边（resolved blur=0）', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', shadow: { offsetX: 1, offsetY: 1, blur: 0 } });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow!.blur).toBe(0);
  });

  it('preset-string-equals-preset-object：shadow="md" ≡ {preset:"md"}（编译逐字一致）', () => {
    const a = findByType(compileNode({ shape: 'rectangle', text: 'x', shadow: 'md' }).primitives, 'rect');
    const b = findByType(
      compileNode({ shape: 'rectangle', text: 'x', shadow: { preset: 'md' } }).primitives,
      'rect',
    );
    expect(a!.shadow).toEqual(b!.shadow);
  });

  it('override-priority：{preset:"sm", offsetY:99} → offsetY=99、其余取 sm', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', shadow: { preset: 'sm', offsetY: 99 } });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toEqual({
      offsetX: SHADOW_PRESETS.sm!.offsetX,
      offsetY: 99,
      blur: SHADOW_PRESETS.sm!.blur,
      color: SHADOW_PRESETS.sm!.color,
    });
  });

  it('preset-none-noop：shadow="none" → 几何图元无 shadow', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', shadow: 'none' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.shadow).toBeUndefined();
  });
});

// ════════════════ 错误路径（schema parse 边界，PASS now） ════════════════

describe('[shadow] 错误路径（schema 拒）', () => {
  const node = (shadow: unknown): unknown => ({ type: 'node', position: [0, 0], shape: 'rectangle', shadow });

  it('reject-nonfinite-offset：offsetX=NaN/Inf → 拒', () => {
    expect(NodeSchema.safeParse(node({ offsetX: NaN, offsetY: 1 })).success).toBe(false);
    expect(NodeSchema.safeParse(node({ offsetX: Infinity, offsetY: 1 })).success).toBe(false);
  });

  it('reject-bad-opacity：opacity>1 / <0 → 拒', () => {
    expect(NodeSchema.safeParse(node({ offsetX: 1, offsetY: 1, opacity: 1.5 })).success).toBe(false);
    expect(NodeSchema.safeParse(node({ offsetX: 1, offsetY: 1, opacity: -0.1 })).success).toBe(false);
  });

  it('reject-negative-blur：blur<0 → 拒', () => {
    expect(NodeSchema.safeParse(node({ offsetX: 1, offsetY: 1, blur: -1 })).success).toBe(false);
  });

  it('reject-unknown-preset：shadow="huge" → 拒', () => {
    expect(NodeSchema.safeParse(node('huge')).success).toBe(false);
  });

  it('reject-object-without-preset-or-offsets：{color:"red"} → refine 拒', () => {
    expect(NodeSchema.safeParse(node({ color: 'red' })).success).toBe(false);
  });

  it('reject-object-with-only-one-offset：{offsetX:1}（缺 offsetY、无 preset）→ refine 拒', () => {
    expect(NodeSchema.safeParse(node({ offsetX: 1 })).success).toBe(false);
  });
});

// ════════════════ 交互 ════════════════

describe('[shadow] 交互', () => {
  it('shadow-text-not-inherited：Node text + shadow → TextPrim 不带 shadow，仅 shape 图元带', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'hi', shadow: 'md' });
    const rect = findByType(compiled.primitives, 'rect');
    const text = findByType(compiled.primitives, 'text');
    expect(rect!.shadow).toEqual(SHADOW_PRESETS.md);
    expect(text).toBeDefined();
    expect((text as unknown as { shadow?: unknown }).shadow).toBeUndefined();
  });

  it('shadow-with-opacity：shadow + 节点 opacity 共存，互不吞没', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', opacity: 0.6, shadow: 'md' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.opacity).toBe(0.6);
    expect(rect!.shadow).toEqual(SHADOW_PRESETS.md);
  });
});

// ════════════════ round-trip ════════════════

describe('[shadow] round-trip', () => {
  it('含 shadow（对象）的 IRNode JSON 往返 parse 深等', () => {
    const node = {
      type: 'node',
      id: 'n',
      position: [0, 0] as [number, number],
      shape: 'rectangle',
      shadow: { preset: 'md', color: '#3b82f6', opacity: 0.5 },
    };
    const parsed = NodeSchema.parse(node);
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shadow).toEqual(parsed.shadow);
  });

  it('含 shadow（预设字符串）的 IRNode JSON 往返保留 "md"', () => {
    const parsed = NodeSchema.parse({ type: 'node', id: 'n', position: [0, 0], shape: 'rectangle', shadow: 'md' });
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.shadow).toBe('md');
  });
});
