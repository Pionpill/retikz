import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import type { IRClip, IRScene } from '../../src';
import { compileToScene, CompositeBaseSchema, defineClip, defineComposite, RetikzCoreError } from '../../src';

const clippedIr = (clip: IRClip): IRScene => ({
  version: 1,
  type: 'scene',
  children: [{ type: 'scope', clip, children: [{ type: 'node', position: [0, 0], text: 'A' }] }],
});

type RecursiveClip = {
  kind: 'recursive';
  /** 裁剪参数 */
  params: {
    depth: number;
  };
};

const RecursiveClipDefinition = defineClip<RecursiveClip>({
  kind: 'recursive',
  schema: strictObject({ kind: literal('recursive'), params: strictObject({ depth: number().int().nonnegative() }) }),
  lower: (spec, context) =>
    spec.params.depth > 0
      ? context.lower({ kind: 'recursive', params: { depth: spec.params.depth - 1 } })
      : {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [10, 0] },
            { kind: 'line', to: [10, 10] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
});
const OperationCycleDefinition = defineClip({
  kind: 'operationCycle',
  schema: strictObject({ kind: literal('operationCycle'), params: strictObject({}) }),
  lower: (spec, context) => context.lower(spec),
});
describe('裁剪递归防护', () => {
  it('在同级节点之间共享预算并允许重复使用已完成的子级', () => {
    const child: IRClip = { kind: 'recursive', params: { depth: 0 } };
    const pair = defineClip({
      kind: 'pair',
      schema: strictObject({ kind: literal('pair'), params: strictObject({}) }),
      lower: (_, context) => ({
        commands: [...context.lower(child).commands, ...context.lower(child).commands],
        fillRule: 'nonzero',
      }),
    });
    const scene = clippedIr({ kind: 'pair', params: {} });
    const clips = [pair, RecursiveClipDefinition];

    expect(compileToScene(scene, { clips, maxClipDepth: 3 }).scene.resources).toMatchObject([
      { kind: 'clip', path: { commands: expect.arrayContaining([{ kind: 'line', to: [10, 10] }]) } },
    ]);
    expect(() => compileToScene(scene, { clips, maxClipDepth: 2 })).toThrow(/maxClipDepth.*2/i);
  });

  it('对每个裁剪转换计数一次', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 3,
      }).scene.resources,
    ).toHaveLength(1);

    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 2 } }), {
        clips: [RecursiveClipDefinition],
        maxClipDepth: 2,
      }),
    ).toThrow(/maxClipDepth.*2/i);
  });

  it('当运行时 Scope 导入其准备好的路径时，不会再次花费预算', () => {
    const runtimeScope = defineComposite({
      namespace: 'test',
      type: 'runtimeScopeClip',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('runtimeScopeClip'),
      }),
      compile: (_, context) => ({
        children: [
          context.createScope({ clip: { kind: 'recursive', params: { depth: 2 } } }, [
            { type: 'node', position: [0, 0], text: 'A' },
          ]),
        ],
      }),
    });
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'test', type: 'runtimeScopeClip' }],
    };

    expect(
      compileToScene(scene, {
        clips: [RecursiveClipDefinition],
        composites: [runtimeScope],
        maxClipDepth: 3,
      }).scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(scene, {
        clips: [RecursiveClipDefinition],
        composites: [runtimeScope],
        maxClipDepth: 2,
      }),
    ).toThrow(/maxClipDepth.*2/i);
  });

  it('使用 32 个裁剪转换的默认预算', () => {
    expect(
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 31 } }), { clips: [RecursiveClipDefinition] })
        .scene.resources,
    ).toHaveLength(1);
    expect(() =>
      compileToScene(clippedIr({ kind: 'recursive', params: { depth: 32 } }), { clips: [RecursiveClipDefinition] }),
    ).toThrow(/maxClipDepth.*32/i);
  });

  it('拒绝深度溢出之前的活动操作对象循环', () => {
    expect(() =>
      compileToScene(clippedIr({ kind: 'operationCycle', params: {} }), {
        clips: [OperationCycleDefinition],
        maxClipDepth: 100,
      }),
    ).toThrow(/cyclic clip/i);
  });
});

describe('裁剪失败边界', () => {
  it('报告缺失定义并列出可用注册表键', () => {
    expect(() => compileToScene(clippedIr({ kind: 'missingOperation', params: {} }))).toThrow(
      /Unknown provider .*available: rect/i,
    );
  });

  it('将格式错误的下沉输出保留为致命的提供者契约错误', () => {
    const malformed = defineClip({
      kind: 'malformed',
      schema: strictObject({ kind: literal('malformed'), params: strictObject({}) }),

      lower: () => {
        return { commands: [], fillRule: 'nonzero' };
      },
    });

    expect(() => compileToScene(clippedIr({ kind: 'malformed', params: {} }), { clips: [malformed] })).toThrow(
      RetikzCoreError,
    );
  });
});
