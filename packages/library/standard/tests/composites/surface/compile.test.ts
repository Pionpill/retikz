import type { IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';
import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { boolean, literal, number, string } from 'zod';

import type { InputSurfaceConfig } from '../../../src/presentation';
import { createSurface, surfaceDefinition } from '../../../src/presentation';
import { sceneNodeBounds } from '../../helpers/scene-geometry';

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const LeafSchema = CompositeBaseSchema.extend({
  namespace: literal('surface-test'),
  type: literal('leaf'),
  id: string(),
  width: number().nonnegative(),
  height: number().nonnegative(),
  originX: number().default(0),
  originY: number().default(0),
  reject: boolean().default(false),
});

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'surface-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => {
      logs.push({ id: node.id, proposal: context.proposal });
      if (node.reject) throw new Error(`Leaf '${node.id}' rejected its proposal`);

      return {
        allocationBounds: {
          x: node.originX,
          y: node.originY,
          width: node.width,
          height: node.height,
        },
        children: [
          context.createScope({ id: node.id }, [
            {
              type: 'node',
              id: node.id,
              position: [node.originX + node.width / 2, node.originY + node.height / 2],
              layout: {
                width: node.width,
                minimumSize: { width: node.width, height: node.height },
                padding: 0,
                margin: 0,
              },
            },
          ]),
        ],
      };
    },
  });

const leaf = (overrides: Record<string, unknown> = {}): IRChild => ({
  namespace: 'surface-test',
  type: 'leaf',
  id: 'content',
  width: 20,
  height: 10,
  ...overrides,
});

const naturalProposal = (): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
});

const compileSurface = (
  child: IRChild,
  proposal: LayoutProposal = naturalProposal(),
  padding: InputSurfaceConfig['padding'] = 0,
  appearance: Pick<InputSurfaceConfig, 'background' | 'border' | 'cornerRadius' | 'overflow'> = {},
) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'surface-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: literal('surface-test'),
      type: literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const result = context.layoutChild(node.child, proposal);
      if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);

      observed = result.result;

      return { children: [context.replay(result.result)] };
    },
  });
  const surface = createSurface({
    namespace: 'standard',
    type: 'surface',
    child,
    padding,
    ...appearance,
  });
  const output = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'surface-test', type: 'harness', child: surface }],
    },
    { composites: [surfaceDefinition, createLeafDefinition(logs), harness], padding: 0 },
  );
  if (observed === undefined) throw new Error('Expected Surface probe to resolve');

  return { logs, observed, output };
};

describe('Surface 布局编译', () => {
  it('向内在槽添加填充并对齐非零子分配原点', () => {
    const result = compileSurface(leaf({ originX: -5, originY: 3 }), naturalProposal(), {
      top: 2,
      right: 5,
      bottom: 4,
      left: 3,
    });

    expect(result.logs).toEqual([{ id: 'content', proposal: naturalProposal() }]);
    expect(result.observed.slotSize).toEqual({ width: 28, height: 16 });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 28, height: 16 });
    expect(sceneNodeBounds(result.output.scene, 'content')).toEqual({
      x: 3,
      y: 2,
      width: 20,
      height: 10,
    });
  });

  it('从范围建议中减去填充并将子最小值固定为零', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 40 },
      y: { kind: LayoutAxisProposalKind.Range, min: 4 },
    };
    const result = compileSurface(leaf(), proposal, { top: 3, right: 5, bottom: 3, left: 3 });

    expect(result.logs[0]?.proposal).toEqual({
      x: { kind: LayoutAxisProposalKind.Range, min: 22, max: 32 },
      y: { kind: LayoutAxisProposalKind.Range, min: 0 },
    });
    expect(result.observed.slotSize).toEqual({ width: 30, height: 16 });
  });

  it('从精确提案中减去填充，同时保留父固定槽', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Exact, value: 50 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 30 },
    };
    const result = compileSurface(leaf(), proposal, { top: 3, right: 5, bottom: 3, left: 3 });

    expect(result.logs[0]?.proposal).toEqual({
      x: { kind: LayoutAxisProposalKind.Exact, value: 42 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 24 },
    });
    expect(result.observed.slotSize).toEqual({ width: 50, height: 30 });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 50, height: 30 });
  });

  it.each([
    {
      label: 'finite range',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 7 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      } satisfies LayoutProposal,
    },
    {
      label: 'exact',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Exact, value: 7 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      } satisfies LayoutProposal,
    },
  ])('在探测子级之前，小于水平填充的 $label 提案失败', ({ proposal }) => {
    const logs: Array<ProbeLog> = [];
    const harness = defineComposite({
      namespace: 'surface-test',
      type: 'failure-harness',
      schema: CompositeBaseSchema.extend({
        namespace: literal('surface-test'),
        type: literal('failure-harness'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const result = context.layoutChild(node.child, proposal);
        if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
        return { children: [context.replay(result.result)] };
      },
    });
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      child: leaf(),
      padding: { left: 3, right: 5 },
    });

    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [{ namespace: 'surface-test', type: 'failure-harness', child: surface }],
        },
        { composites: [surfaceDefinition, createLeafDefinition(logs), harness] },
      ),
    ).toThrow(/surface.*x.*padding/i);
    expect(logs).toEqual([]);
  });

  it('传播子探测故障而不替换内在布局', () => {
    expect(() => compileSurface(leaf({ reject: true }))).toThrow(/Leaf 'content' rejected/);
  });

  it('保留边界框的分配，同时将边界描边报告为视觉溢出', () => {
    const result = compileSurface(leaf(), naturalProposal(), 2, {
      border: { stroke: '#0f172a', strokeWidth: 6 },
    });

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 24, height: 14 });
    expect(result.observed.visualBounds).toEqual({ x: -30, y: -30, width: 84, height: 74 });
  });
});

it('Surface 完整 Scope 属性透传独立外框', () => {
  const surface = createSurface({
    namespace: 'standard',
    type: 'surface',
    padding: 8,
    background: { fill: 'red' },
    meta: { owner: 'surface' },
    child: { type: 'node', position: [0, 0], text: 'A' },
  });
  const { scene } = compileToScene(
    { version: 1, type: 'scene', children: [surface] },
    { composites: [surfaceDefinition] },
  );
  const serialized = JSON.stringify(scene.primitives);

  expect(serialized).toContain('"owner":"surface"');
  expect(serialized).toContain('"fill":"red"');
});
