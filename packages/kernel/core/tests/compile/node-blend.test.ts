import { describe, expect, it } from 'vitest';

import type { ScenePrimitive } from '../../src/contract';
import type { IR } from '../../src/schemas';

import { compileToScene } from '../../src/compile/compile';
import { NodeSchema } from '../../src/schemas';
import { BlendMode } from '../../src/schemas';
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

describe('[blend] Happy', () => {
  it('node-blend：Node + blendMode="multiply" → shape 图元带 blendMode', () => {
    const compiled = compileNode({ shape: 'circle', text: 'x', fill: 'magenta', blendMode: 'multiply' });
    const el = findByType(compiled.primitives, 'ellipse');
    expect(el).toBeDefined();
    expect(el!.blendMode).toBe('multiply');
  });

  it('node-blend-rect：rectangle 节点 → RectPrim 带 blendMode', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x', blendMode: 'screen' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.blendMode).toBe('screen');
  });

  it('all-16-modes-accepted：16 个值 schema 全过', () => {
    for (const mode of Object.values(BlendMode)) {
      const parsed = NodeSchema.safeParse({ type: 'node', position: [0, 0], shape: 'rectangle', blendMode: mode });
      expect(parsed.success, mode).toBe(true);
    }
  });
});

// ════════════════ 边界 ════════════════

describe('[blend] 边界', () => {
  it('blend-omitted-noop：不设 → 几何图元无 blendMode', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'x' });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.blendMode).toBeUndefined();
  });

  it('blend-normal-equals-omitted：blendMode="normal" 与省略编译等价', () => {
    const withNormal = findByType(
      compileNode({ shape: 'rectangle', text: 'x', blendMode: 'normal' }).primitives,
      'rect',
    );
    const omitted = findByType(compileNode({ shape: 'rectangle', text: 'x' }).primitives, 'rect');
    expect(withNormal!.blendMode ?? 'normal').toBe(omitted!.blendMode ?? 'normal');
  });
});

// ════════════════ 错误路径（schema 拒，PASS now） ════════════════

describe('[blend] 错误路径（schema 拒）', () => {
  const node = (blendMode: unknown): unknown => ({ type: 'node', position: [0, 0], shape: 'rectangle', blendMode });

  it('reject-unknown-mode：blendMode="glow" → 枚举外拒', () => {
    expect(NodeSchema.safeParse(node('glow')).success).toBe(false);
  });

  it('reject-non-string：数字 / null → 拒', () => {
    expect(NodeSchema.safeParse(node(3)).success).toBe(false);
    expect(NodeSchema.safeParse(node(null)).success).toBe(false);
  });
});

// ════════════════ 交互 ════════════════

describe('[blend] 交互', () => {
  it('blend-text-not-inherited：Node text + blendMode → text 图元不带', () => {
    const compiled = compileNode({ shape: 'rectangle', text: 'hi', blendMode: 'multiply' });
    const rect = findByType(compiled.primitives, 'rect');
    const text = findByType(compiled.primitives, 'text');
    expect(rect!.blendMode).toBe('multiply');
    expect(text).toBeDefined();
    expect((text as unknown as { blendMode?: unknown }).blendMode).toBeUndefined();
  });

  it('blend-with-opacity-shadow：blendMode + opacity + shadow 三者共存正确', () => {
    const compiled = compileNode({
      shape: 'rectangle',
      text: 'x',
      opacity: 0.7,
      shadow: 'md',
      blendMode: 'multiply',
    });
    const rect = findByType(compiled.primitives, 'rect');
    expect(rect!.opacity).toBe(0.7);
    expect(rect!.blendMode).toBe('multiply');
    expect(rect!.shadow).toBeDefined();
  });
});

// ════════════════ round-trip ════════════════

describe('[blend] round-trip', () => {
  it('含 blendMode 的 IRNode JSON 往返 parse 深等', () => {
    const node = {
      type: 'node',
      id: 'n',
      position: [0, 0] as [number, number],
      shape: 'rectangle',
      blendMode: 'multiply',
    };
    const parsed = NodeSchema.parse(node);
    const round = NodeSchema.parse(JSON.parse(JSON.stringify(parsed)));
    expect(round.blendMode).toBe(parsed.blendMode);
  });
});
