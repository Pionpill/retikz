import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { CompileWarning, IRScene, ScenePrimitive } from '../../../src';

import { compileToScene, CompileWarningCode, CompositeBaseSchema, defineComposite } from '../../../src';
import { flattenPrims } from '../../helpers/flatten';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

// ---- 示例 Tier 2 fixtures（非 plot；schema extend CompositeBaseSchema，defineComposite 保强类型） ----

const LabeledBoxSchema = CompositeBaseSchema.extend({
  namespace: z.literal('example'),
  type: z.literal('labeledBox'),
  text: z.string().describe('Box label text'),
});
/** labeledBox → 一个带文字的 rectangle node */
const labeledBox = defineComposite({
  namespace: 'example',
  type: 'labeledBox',
  schema: LabeledBoxSchema,
  expand: node => ({
    children: [{ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }],
  }),
});

/** vanishing → 展开成空（节点消失） */
const vanishing = defineComposite({
  namespace: 'example',
  type: 'vanishing',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('example'), type: z.literal('vanishing') }),
  expand: () => ({ children: [] }),
});

/** panel → 展开出另一个 composite（labeledBox），验证嵌套 fixpoint */
const panel = defineComposite({
  namespace: 'example',
  type: 'panel',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('example'), type: z.literal('panel') }),
  expand: () => ({ children: [{ namespace: 'example', type: 'labeledBox', text: 'inner' }] }),
});

/** loop → 展开出自身，验证环守卫 */
const loop = defineComposite({
  namespace: 'example',
  type: 'loop',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('example'), type: z.literal('loop') }),
  expand: () => ({ children: [{ namespace: 'example', type: 'loop' }] }),
});

/** zbox → 展开出带 zIndex 的 node */
const zbox = defineComposite({
  namespace: 'example',
  type: 'zbox',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('example'), type: z.literal('zbox') }),
  expand: () => ({
    children: [{ type: 'node', id: 'z', position: [0, 0], shape: 'rectangle', text: 'z', zIndex: 10 }],
  }),
});

/** boxWithId → 展开出带 id 的 node，供其它元素 anchor 引用 */
const boxWithId = defineComposite({
  namespace: 'example',
  type: 'boxWithId',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('example'), type: z.literal('boxWithId') }),
  expand: () => ({
    children: [{ type: 'node', id: 'panel', position: [50, 50], shape: 'rectangle', text: 'P' }],
  }),
});

describe('lowerComposites — happy path', () => {
  it('register-and-expand: tier2 节点经注册 expand 展开成 tier1 → Scene 含 rect', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
    };
    expect(findByType(compileToScene(ir, { composites: [labeledBox] }).scene.primitives, 'rect')).toBeDefined();
  });

  it('expand-is-ir-to-ir: 展开后与手写等价 tier1 IR 同 Scene', () => {
    const irComposite: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }],
    };
    const irManual: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: 'Hi' }],
    };
    expect(compileToScene(irComposite, { composites: [labeledBox] }).scene).toEqual(compileToScene(irManual).scene);
  });

  it('object-union-schema: 相同 composite key 的变体共用一次注册与展开', () => {
    const schema = z.union([
      CompositeBaseSchema.extend({
        namespace: z.literal('example'),
        type: z.literal('variantBox'),
        variant: z.literal('text'),
        value: z.string(),
      }),
      CompositeBaseSchema.extend({
        namespace: z.literal('example'),
        type: z.literal('variantBox'),
        variant: z.literal('count'),
        value: z.number(),
      }),
    ]);
    const variantBox = defineComposite({
      namespace: 'example',
      type: 'variantBox',
      schema,
      expand: node => ({ children: [{ type: 'node', position: [0, 0], text: String(node.value) }] }),
    });
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'example', type: 'variantBox', variant: 'text', value: 'A' },
        { namespace: 'example', type: 'variantBox', variant: 'count', value: 2 },
      ],
    };

    expect(() => compileToScene(ir, { composites: [variantBox] }).scene).not.toThrow();
  });
});

describe('lowerComposites — 边界', () => {
  it('nested-fixpoint: tier2 展开出 tier2 → 递归到全 tier1', () => {
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'example', type: 'panel' }] };
    const irDirect: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: 'inner' }],
    };
    expect(compileToScene(ir, { composites: [panel, labeledBox] }).scene).toEqual(compileToScene(irDirect).scene);
  });

  it('empty-expand: expand 返回空 children → 节点消失、不抛、与无该节点等价', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'example', type: 'vanishing' },
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      ],
    };
    const irOnlyA: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    expect(() => compileToScene(ir, { composites: [vanishing] }).scene).not.toThrow();
    expect(compileToScene(ir, { composites: [vanishing] }).scene).toEqual(compileToScene(irOnlyA).scene);
  });

  it('namespace-discriminates: 无 namespace 走 tier1（core4 不受影响）；有 namespace 走 tier2', () => {
    const tier1Ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    // tier1 IR 不传 composites 也正常（不受 lowering 影响）
    expect(compileToScene(tier1Ir).scene).toEqual(compileToScene(tier1Ir, { composites: [labeledBox] }).scene);
    // 有 namespace 的节点被当 tier2 展开
    const tier2Ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'example', type: 'labeledBox', text: 'x' }],
    };
    expect(findByType(compileToScene(tier2Ir, { composites: [labeledBox] }).scene.primitives, 'rect')).toBeDefined();
  });
});

describe('lowerComposites — 错误路径', () => {
  it('unregistered-warns-and-skips: 未注册 namespace.type → warn + 跳过、不抛，其余照常渲染', () => {
    const warnings: Array<CompileWarning> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'plot', type: 'axis' },
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
      ],
    };
    const scene = compileToScene(ir, { composites: [], onWarn: w => warnings.push(w) }).scene;
    expect(warnings.some(w => w.code === CompileWarningCode.CompositeNotRegistered)).toBe(true);
    expect(findByType(scene.primitives, 'rect')).toBeDefined(); // node A 照常
  });

  it('cycle-guard: tier2 展开出自身 → 深度守卫 throw、非死循环', () => {
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'example', type: 'loop' }] };
    expect(() => compileToScene(ir, { composites: [loop] }).scene).toThrow(/COMPOSITE_NEST_TOO_DEEP/);
  });

  it('bad-node-throws: 字段不过注册 schema → 展开时 schema.parse throw', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'example', type: 'labeledBox', text: 123 as unknown as string }],
    };
    expect(() => compileToScene(ir, { composites: [labeledBox] }).scene).toThrow(/composite 'example\.labeledBox'/);
    expect(() => compileToScene(ir, { composites: [labeledBox] }).scene).toThrow(/children\[0\]/);
  });
});

describe('lowerComposites — 交互', () => {
  it('zindex-through-lowering: 展开产物 zIndex → 与手写带 zIndex 等价（穿透排序）', () => {
    const irComposite: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { namespace: 'example', type: 'zbox' },
      ],
    };
    const irManual: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'A', position: [0, 0], text: 'A' },
        { type: 'node', id: 'z', position: [0, 0], shape: 'rectangle', text: 'z', zIndex: 10 },
      ],
    };
    expect(compileToScene(irComposite, { composites: [zbox] }).scene).toEqual(compileToScene(irManual).scene);
  });

  it('anchor-into-tier2-output: kernel 引用 tier2 展开产物的 anchor → 解析成功（展开在 anchor 之前）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'example', type: 'boxWithId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'panel', anchor: 'top' } },
            { type: 'step', kind: 'line', to: [0, 0] },
          ],
        },
      ],
    };
    expect(() => compileToScene(ir, { composites: [boxWithId] }).scene).not.toThrow();
    expect(compileToScene(ir, { composites: [boxWithId] }).scene.primitives.some(p => p.type === 'path')).toBe(true);
  });
});
