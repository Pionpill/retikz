import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRScene, LoweredIRScene, LowerIRToKernelOptions } from '../../src';

import { CompositeBaseSchema, defineComposite, lowerIRToKernel } from '../../src';

const PanelSchema = CompositeBaseSchema.extend({
  namespace: z.literal('demo'),
  type: z.literal('panel'),
  id: z.string(),
});

/** demo.panel → 同 id 的 Tier 1 node */
const panelComposite = defineComposite({
  namespace: 'demo',
  type: 'panel',
  schema: PanelSchema,
  expand: panel => ({ type: 'node', id: panel.id, position: [0, 0], text: panel.id }),
});

/** demo.wrapper → 继续展开为 demo.panel，验证 fixpoint */
const wrapperComposite = defineComposite({
  namespace: 'demo',
  type: 'wrapper',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('wrapper'),
    id: z.string(),
  }),
  expand: wrapper => ({ namespace: 'demo', type: 'panel', id: wrapper.id }),
});

/** demo.loop → 自身，用于深度守卫 */
const loopComposite = defineComposite({
  namespace: 'demo',
  type: 'loop',
  schema: CompositeBaseSchema.extend({ namespace: z.literal('demo'), type: z.literal('loop') }),
  expand: () => ({ namespace: 'demo', type: 'loop' }),
});

/** demo.batch → 零个或多个节点，验证 flatMap 语义 */
const batchComposite = defineComposite({
  namespace: 'demo',
  type: 'batch',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('demo'),
    type: z.literal('batch'),
    ids: z.array(z.string()),
  }),
  expand: batch => batch.ids.map(id => ({ type: 'node' as const, id, position: [0, 0] as [number, number] })),
});

/** Unicode provider key 也应按原值参与注册与诊断 */
const unicodeComposite = defineComposite({
  namespace: '示例',
  type: '面板',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('示例'),
    type: z.literal('面板'),
  }),
  expand: () => ({ type: 'node', id: 'unicode', position: [0, 0] }),
});

describe('lowerIRToKernel', () => {
  it('returns an empty LoweredIRScene for an empty scene', () => {
    const options: LowerIRToKernelOptions = {};
    const lowered: LoweredIRScene = lowerIRToKernel({ version: 1, type: 'scene', children: [] }, options);

    expect(lowered).toEqual({ version: 1, type: 'scene', children: [] });
  });

  it('keeps Tier 1 scenes structurally equal without definitions', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [1, 2], text: 'A' }],
    };

    expect(lowerIRToKernel(ir)).toEqual(ir);
    expect(lowerIRToKernel(ir, { composites: [] })).toEqual(ir);
  });

  it('returns JSON-serializable data that survives a JSON roundtrip', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'json' }],
    };

    const lowered = lowerIRToKernel(ir, { composites: [panelComposite] });

    expect(JSON.parse(JSON.stringify(lowered))).toEqual(lowered);
  });

  it('lowers a registered top-level composite to Tier 1', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'panel-a' }],
    };

    expect(lowerIRToKernel(ir, { composites: [panelComposite] })).toEqual({
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'panel-a', position: [0, 0], text: 'panel-a' }],
    });
  });

  it('lowers composites recursively inside scopes while preserving scope fields', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'group',
          color: '#123456',
          transforms: [{ kind: 'translate', x: 4, y: 5 }],
          children: [{ namespace: 'demo', type: 'panel', id: 'nested' }],
        },
      ],
    };

    expect(lowerIRToKernel(ir, { composites: [panelComposite] })).toEqual({
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          id: 'group',
          color: '#123456',
          transforms: [{ kind: 'translate', x: 4, y: 5 }],
          children: [{ type: 'node', id: 'nested', position: [0, 0], text: 'nested' }],
        },
      ],
    });
  });

  it('continues lowering composite output to a Tier 1 fixpoint', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'wrapper', id: 'wrapped' }],
    };

    expect(lowerIRToKernel(ir, { composites: [wrapperComposite, panelComposite] }).children).toEqual([
      { type: 'node', id: 'wrapped', position: [0, 0], text: 'wrapped' },
    ]);
  });

  it('flattens empty and multiple composite outputs without partial placeholders', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { namespace: 'demo', type: 'batch', ids: [] },
        { namespace: 'demo', type: 'batch', ids: ['a', 'b'] },
      ],
    };

    expect(lowerIRToKernel(ir, { composites: [batchComposite] }).children).toEqual([
      { type: 'node', id: 'a', position: [0, 0] },
      { type: 'node', id: 'b', position: [0, 0] },
    ]);
  });

  it('supports Unicode composite registry keys', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: '示例', type: '面板' }],
    };

    expect(lowerIRToKernel(ir, { composites: [unicodeComposite] }).children).toEqual([
      { type: 'node', id: 'unicode', position: [0, 0] },
    ]);
  });

  it('fails loudly for an unregistered top-level composite with key and path', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'missing' }],
    };

    expect(() => lowerIRToKernel(ir)).toThrow(/demo\.panel.*children\[0\]/);
  });

  it('fails loudly for an unregistered nested composite with its full path', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [{ namespace: 'demo', type: 'panel', id: 'missing' }],
        },
      ],
    };

    expect(() => lowerIRToKernel(ir)).toThrow(/demo\.panel.*children\[0\]\.children\[0\]/);
  });

  it('preserves provider and path diagnostics for invalid payloads', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 123 as unknown as string }],
    };

    expect(() => lowerIRToKernel(ir, { composites: [panelComposite] })).toThrow(/demo\.panel/);
    expect(() => lowerIRToKernel(ir, { composites: [panelComposite] })).toThrow(/children\[0\]/);
  });

  it('respects maxCompositeDepth and fails instead of returning partial IR', () => {
    const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: 'demo', type: 'loop' }] };

    expect(() => lowerIRToKernel(ir, { composites: [loopComposite], maxCompositeDepth: 1 })).toThrow(
      /COMPOSITE_NEST_TOO_DEEP/,
    );
  });

  it('treats maxCompositeDepth zero as a strict prohibition on composite expansion', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'demo', type: 'panel', id: 'blocked' }],
    };

    expect(() => lowerIRToKernel(ir, { composites: [panelComposite], maxCompositeDepth: 0 })).toThrow(
      /COMPOSITE_NEST_TOO_DEEP/,
    );
  });
});
