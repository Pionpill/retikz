import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { FlowLayoutDefinition, IRFlowRelation, IRFlowRouting } from '../../src/flow';
import { LayeredFlowLayoutDefinition, FlowEndpointSchema } from '../../src/flow';
import { FlowDiagramSchema, FlowDiagramArtifactSchema, createFlowDiagramProviderContribution } from '../../src/flow';

const compileEndpoints = (count: number, shared = false) => {
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities: [
      ...Array.from({ length: count }, (_, index) => ({ id: `input${index}`, text: `Input ${index}` })),
      { id: 'output', text: 'Output', role: 'activity' },
    ],
    groups: [],
    layouts: [],
    children: [...Array.from({ length: count }, (_, index) => `input${index}`), 'output'],
    relations: Array.from({ length: count }, (_, index) => ({
      source: `input${index}`,
      target: { id: 'output', side: 'left', overlap: shared && index < 2 ? 'allow' : 'separate' },
    })),
  });
  const result = compileToScene(
    { type: 'scene', version: 1, children: [source] },
    resolveCoreProviderDependencies({ contributions: [createFlowDiagramProviderContribution()] }),
  );

  return FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
  );
};

describe('Flow 端点等分', () => {
  it.each([1, 2, 3, 4])('同侧 %i 个独立端点保留完整精度等分', count => {
    const artifact = compileEndpoints(count);

    expect(artifact.relations.map(relation => relation.target)).toEqual(
      Array.from({ length: count }, (_, index) => ({
        id: 'output',
        anchor: { side: 'left', fraction: (index + 1) / (count + 1) },
      })),
    );
  });

  it('allow 共用一槽，separate 独占另一槽', () => {
    const artifact = compileEndpoints(3, true);

    expect(artifact.relations.map(relation => relation.target)).toEqual([
      { id: 'output', anchor: { side: 'left', fraction: 1 / 3 } },
      { id: 'output', anchor: { side: 'left', fraction: 1 / 3 } },
      { id: 'output', anchor: { side: 'left', fraction: 2 / 3 } },
    ]);
  });
});

const compileRelations = (
  relations: Array<IRFlowRelation>,
  extra: Record<string, unknown> = {},
  definition?: FlowLayoutDefinition,
) => {
  const source = FlowDiagramSchema.parse({
    namespace: 'diagram',
    type: 'flow',
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
      { id: 'c', text: 'C' },
    ],
    groups: [],
    layouts: [],
    children: ['a', 'b', 'c'],
    relations,
    ...extra,
  });
  const result = compileToScene(
    { type: 'scene', version: 1, children: [source] },
    resolveCoreProviderDependencies({
      contributions: [
        createFlowDiagramProviderContribution(
          definition === undefined ? {} : { flowLayouts: [definition], defaultFlowLayout: definition.name },
        ),
      ],
    }),
  );

  return FlowDiagramArtifactSchema.parse(
    result.artifacts.find(item => item.kind === 'composite' && item.namespace === 'diagram')?.value,
  );
};

it('字符串继承端点默认，局部 allow 可覆盖 separate', () => {
  const artifact = compileRelations(
    [
      { source: 'a', target: 'c' },
      { source: 'b', target: { id: 'c', overlap: 'allow' } },
    ],
    { flowDefaults: { relation: { target: { overlap: 'separate' } } } },
  );

  expect(artifact.relations.map(relation => relation.target.anchor)).toEqual([
    { side: 'left', fraction: 1 / 3 },
    { side: 'left', fraction: 2 / 3 },
  ]);
  expect(compileRelations([{ source: 'a', target: 'c' }]).relations[0].target).toEqual({ id: 'c' });
});

it('固定锚点不移动，自动端点避开中点', () => {
  const artifact = compileRelations([
    { source: 'a', target: { id: 'c', anchor: { side: 'left', fraction: 0.5 } } },
    { source: 'b', target: { id: 'c', side: 'left', overlap: 'separate' } },
  ]);

  expect(artifact.relations.map(relation => relation.target.anchor)).toEqual([
    { side: 'left', fraction: 0.5 },
    { side: 'left', fraction: 0.25 },
  ]);
});

it('固定锚点冲突明确失败，不移动任一固定端点', () => {
  expect(() =>
    compileRelations([
      { source: 'a', target: { id: 'c', anchor: 'left', overlap: 'separate' } },
      { source: 'b', target: { id: 'c', anchor: { side: 'left', fraction: 0.5 } } },
    ]),
  ).toThrow('fixed-endpoint-conflict');
});

it.each(['top', 'right', 'bottom', 'left'] as const)('在 %s 侧自动选择中点', side => {
  const relation = compileRelations([{ source: 'a', target: { id: 'c', side } }]).relations[0];

  expect(relation.target.anchor).toEqual({ side, fraction: 0.5 });
});

it.each<IRFlowRouting>([
  { kind: 'straight' },
  { kind: 'orthogonal' },
  { kind: '-|' },
  { kind: '|-' },
  { kind: 'bend', bendAngle: 30 },
  { kind: 'curve' },
  { kind: 'cubic' },
  { kind: 'smooth', points: [[80, -60]] },
])('路线 $kind 使用同一已分配端点', routing => {
  const artifact = compileRelations([
    { source: { id: 'a', side: 'right' }, target: { id: 'c', side: 'left' }, routing, direction: 'forward' },
  ]);
  const relation = artifact.relations[0];
  const source = artifact.elements.find(element => element.id === 'a')!.bounds;
  const target = artifact.elements.find(element => element.id === 'c')!.bounds;

  expect(relation.route.points[0][0]).toBeCloseTo(source.x + source.width);
  expect(relation.route.points[0][1]).toBeCloseTo(source.y + source.height / 2);
  expect(relation.route.points.at(-1)![0]).toBeCloseTo(target.x);
  expect(relation.route.points.at(-1)![1]).toBeCloseTo(target.y + target.height / 2);
});

it('schema 拒绝混用 side 和 anchor，不给省略 overlap 提前补默认', () => {
  expect(FlowEndpointSchema.safeParse({ id: 'a', side: 'left', anchor: 'left' }).success).toBe(false);
  expect(FlowEndpointSchema.parse({ id: 'a', side: 'left' })).toEqual({ id: 'a', side: 'left' });
});

it('不支持端点能力的 provider 在回调前拒绝请求', () => {
  let called = false;
  const definition: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'no-endpoints',
    capabilities: { ...LayeredFlowLayoutDefinition.capabilities, endpointPlacement: false },
    layout: (input, context) => {
      called = true;
      return LayeredFlowLayoutDefinition.layout(input, context);
    },
  };

  expect(() => compileRelations([{ source: 'a', target: { id: 'c', side: 'left' } }], {}, definition)).toThrow();
  expect(called).toBe(false);
});

it('校验 provider 必须保持指定侧', () => {
  const definition: FlowLayoutDefinition = {
    ...LayeredFlowLayoutDefinition,
    name: 'wrong-side',
    layout: (input, context) => {
      const output = LayeredFlowLayoutDefinition.layout(input, context);
      return {
        ...output,
        relations: output.relations.map(relation => ({
          ...relation,
          target: { id: relation.target.id, anchor: { side: 'right', fraction: 0.5 } },
        })),
      };
    },
  };

  expect(() => compileRelations([{ source: 'a', target: { id: 'c', side: 'left' } }], {}, definition)).toThrow(
    'preserve requested side',
  );
});

it('Group 端点与 Entity 使用同一分离合同', () => {
  const artifact = compileRelations(
    [
      { source: 'a', target: { id: 'group', side: 'left', overlap: 'separate' } },
      { source: 'b', target: { id: 'group', side: 'left', overlap: 'separate' } },
    ],
    { groups: [{ id: 'group', children: ['c'] }], children: ['a', 'b', 'group'] },
  );

  expect(artifact.relations.map(relation => relation.target.anchor)).toEqual([
    { side: 'left', fraction: 1 / 3 },
    { side: 'left', fraction: 2 / 3 },
  ]);
});

it('重复编译保持确定结果且不向 Source 回写 fraction', () => {
  const relations: Array<IRFlowRelation> = [
    { source: 'a', target: { id: 'c', side: 'left', overlap: 'separate' } },
    { source: 'b', target: { id: 'c', side: 'left', overlap: 'separate' } },
  ];
  const snapshot = JSON.stringify(relations);

  expect(compileRelations(relations)).toEqual(compileRelations(relations));
  expect(JSON.stringify(relations)).toBe(snapshot);
});

it('不支持比例锚点的形状明确失败，保留 Core 原因', () => {
  try {
    compileRelations([{ source: 'a', target: { id: 'c', side: 'left' } }], {
      entities: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'Decision', role: 'gateway' },
      ],
    });

    expect.unreachable('Expected unsupported boundary error');
  } catch (error) {
    const messages: Array<string> = [];
    let cause = error;

    while (cause instanceof Error) {
      messages.push(cause.message);
      cause = cause.cause;
    }

    expect(messages.join(' ')).toContain('Endpoint boundary query failed');
    expect(messages.join(' ')).toContain('does not support side anchors');
  }
});
