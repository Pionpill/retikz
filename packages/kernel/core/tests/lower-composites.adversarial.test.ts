import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, compileToScene, defineComposite } from '../src';
import type { CompileWarning, IR, ScenePrimitive } from '../src';
import { flattenPrims } from './helpers/flatten';

const findByType = <T extends ScenePrimitive['type']>(
  prims: Array<ScenePrimitive>,
  type: T,
): Extract<ScenePrimitive, { type: T }> | undefined =>
  flattenPrims(prims).find((p): p is Extract<ScenePrimitive, { type: T }> => p.type === type);

const labeledBox = defineComposite({
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('example'),
    type: z.literal('labeledBox'),
    text: z.string(),
  }),
  expand: node => ({ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: node.text }),
});

describe('lowerComposites — adversarial', () => {
  it('duplicate-registration-throws: 两个 def 同 namespace.type → 注册期 throw（即使 IR 无 tier2）', () => {
    const dupA = defineComposite({
      schema: CompositeBaseSchema.extend({ namespace: z.literal('x'), type: z.literal('y') }),
      expand: () => [],
    });
    const dupB = defineComposite({
      schema: CompositeBaseSchema.extend({ namespace: z.literal('x'), type: z.literal('y') }),
      expand: () => [],
    });
    const ir: IR = { version: 1, type: 'scene', children: [] };
    expect(() => compileToScene(ir, { composites: [dupA, dupB] })).toThrow(/Duplicate composite registration: 'x\.y'/);
  });

  it('non-zodobject-schema-throws: schema 非 ZodObject（z.string）→ 注册期可诊断 throw', () => {
    const bad = defineComposite({ schema: z.string(), expand: () => [] });
    const ir: IR = { version: 1, type: 'scene', children: [] };
    expect(() => compileToScene(ir, { composites: [bad] })).toThrow(/ZodObject/);
  });

  it('non-literal-discriminator-throws: namespace/type 非 z.literal → 注册期可诊断 throw', () => {
    const bad = defineComposite({
      schema: z.object({ namespace: z.string(), type: z.string() }),
      expand: () => [],
    });
    const ir: IR = { version: 1, type: 'scene', children: [] };
    expect(() => compileToScene(ir, { composites: [bad] })).toThrow(/literal/);
  });

  it('mutual-cycle-throws: A 展开 B、B 展开 A → 深度守卫 throw、非死循环', () => {
    const aDef = defineComposite({
      schema: CompositeBaseSchema.extend({ namespace: z.literal('m'), type: z.literal('a') }),
      expand: () => ({ namespace: 'm', type: 'b' }),
    });
    const bDef = defineComposite({
      schema: CompositeBaseSchema.extend({ namespace: z.literal('m'), type: z.literal('b') }),
      expand: () => ({ namespace: 'm', type: 'a' }),
    });
    const ir: IR = { version: 1, type: 'scene', children: [{ namespace: 'm', type: 'a' }] };
    expect(() => compileToScene(ir, { composites: [aDef, bDef] })).toThrow(/COMPOSITE_NEST_TOO_DEEP/);
  });

  it('custom-maxdepth-respected: maxCompositeDepth=0 → 任何 tier2 即 throw', () => {
    const ir: IR = { version: 1, type: 'scene', children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }] };
    expect(() => compileToScene(ir, { composites: [labeledBox], maxCompositeDepth: 0 })).toThrow(
      /COMPOSITE_NEST_TOO_DEEP/,
    );
    // 默认 32 下同 IR 正常
    expect(findByType(compileToScene(ir, { composites: [labeledBox] }).primitives, 'rect')).toBeDefined();
  });

  it('scope-nested-tier2-expands: scope.children 含 tier2 → 递归展开（与手写 scope 等价）', () => {
    const irComposite: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', children: [{ namespace: 'example', type: 'labeledBox', text: 'Hi' }] }],
    };
    const irManual: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'scope', children: [{ type: 'node', id: 'lb', position: [0, 0], shape: 'rectangle', text: 'Hi' }] }],
    };
    expect(compileToScene(irComposite, { composites: [labeledBox] })).toEqual(compileToScene(irManual));
  });

  it('tier1-with-namespace-skipped: tier1 节点误带 namespace → 视 tier2、未注册 warn + 跳过（设计陷阱可诊断）', () => {
    const warnings: Array<CompileWarning> = [];
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'core', type: 'node', position: [0, 0], text: 'A' }],
    };
    const scene = compileToScene(ir, { composites: [], onWarn: w => warnings.push(w) });
    expect(warnings.some(w => w.code === 'COMPOSITE_NOT_REGISTERED')).toBe(true);
    expect(scene.primitives.filter(p => p.type === 'rect' || p.type === 'text')).toHaveLength(0); // 节点被跳过
  });

  it('expand-mixed-tier1-and-tier2: expand 返回 [tier1, tier2] 混合 → tier2 继续展开、tier1 原样', () => {
    const mixed = defineComposite({
      schema: CompositeBaseSchema.extend({ namespace: z.literal('mix'), type: z.literal('pair') }),
      expand: () => [
        { type: 'node', id: 'kept', position: [0, 0], text: 'kept' },
        { namespace: 'example', type: 'labeledBox', text: 'inner' },
      ],
    });
    const ir: IR = { version: 1, type: 'scene', children: [{ namespace: 'mix', type: 'pair' }] };
    const scene = compileToScene(ir, { composites: [mixed, labeledBox] });
    // 两个 node（kept + 展开的 lb）都产 rect/text
    expect(flattenPrims(scene.primitives).filter(p => p.type === 'rect').length).toBeGreaterThanOrEqual(1);
  });
});
