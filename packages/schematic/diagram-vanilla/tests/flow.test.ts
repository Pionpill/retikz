import * as DiagramFlow from '@retikz/diagram/flow';
import type { InputEmbed, SynchronousInputEmbedAdapter, InputEmbedContext } from '@retikz/vanilla';
import { createProcessingController, processToStaticInputResult } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import * as FlowVanilla from '../src/flow';

it('在保留模式更新期间删除并恢复 Group 标题和标签', () => {
  const source = (visible: boolean) => ({
    children: [
      FlowVanilla.flowDiagram({
        entities: [{ id: 'item', text: 'Item' }],
        children: ['group'],
        groups: [
          {
            id: 'group',
            children: ['item'],
            ...(visible
              ? {
                  caption: { description: { text: 'Description' } },
                  labels: [{ text: 'Boundary', position: 'bottom' as const }],
                }
              : {}),
          },
        ],
      }),
    ],
  });
  const controller = createProcessingController(source(true), {
    adapters: FlowVanilla.createFlowDiagramVanillaAdapters(),
  });

  try {
    const initial = controller.read();
    controller.update(source(false));
    const hidden = controller.read();

    expect(JSON.stringify(hidden.scene)).not.toContain('Description');
    expect(JSON.stringify(hidden.scene)).not.toContain('Boundary');
    expect(JSON.stringify(hidden.scene)).toContain('Item');

    controller.update(source(true));

    expect(controller.read().scene).toEqual(initial.scene);
  } finally {
    controller.dispose();
  }
});

it('通过 Vanilla 编写保留本地 Layout 排除', () => {
  const input: FlowVanilla.InputFlowDiagram = {
    entities: [
      { id: 'canvas', text: 'Canvas' },
      { id: 'png', text: 'PNG' },
    ],
    layouts: [
      { id: 'row', kind: 'linear', direction: 'right', children: ['canvas', 'png'], excludeFromBounds: ['png'] },
    ],
    children: ['row'],
  };
  const source = FlowVanilla.normalizeFlowDiagram(input);

  expect(source.layouts?.[0]?.excludeFromBounds).toEqual(['png']);
  expect(DiagramFlow.FlowDiagramSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(
    DiagramFlow.FlowDiagramSchema.parse(source),
  );
});

type NormalizeFlowDiagram = (input: Readonly<Record<string, unknown>>) => DiagramFlow.IRFlowDiagram;

type CreateFlowDiagramEmbed = (
  input: Readonly<Record<string, unknown>>,
) => InputEmbed<Readonly<Record<string, unknown>>>;

const functionExport = <TFunction extends (...arguments_: never) => unknown>(name: string): TFunction | undefined => {
  const value: unknown = FlowVanilla;
  if (typeof value !== 'object' || value === null || !(name in value)) return undefined;

  const candidate = value[name as keyof typeof value];

  return typeof candidate === 'function' ? candidate : undefined;
};

const adapterExport = (): SynchronousInputEmbedAdapter<Readonly<Record<string, unknown>>> | undefined => {
  const value: unknown = FlowVanilla;
  if (typeof value !== 'object' || value === null || !('flowDiagramInputEmbedAdapter' in value)) return undefined;
  return value.flowDiagramInputEmbedAdapter as SynchronousInputEmbedAdapter<Readonly<Record<string, unknown>>>;
};

const context: InputEmbedContext = {
  id: 'flow-embed',
  kind: 'diagram.flow',
  layerId: 'layer',
  identityPath: ['layer', 'flow-embed'],
};

const sourceInput = {
  id: 'architecture',
  theme: { mode: 'dark' as const },
  entities: [
    {
      id: 'jsx',
      text: 'JSX',
      status: 'success' as const,
      rank: 0,
    },
    { id: 'kernel', text: ['Kernel', 'IR compiler'] },
  ],
  groups: [{ id: 'client', caption: { title: { text: 'Client' } }, children: ['frontend'] }],
  layouts: [{ kind: 'linear' as const, id: 'frontend', direction: 'down' as const, children: ['jsx'] }],
  children: ['client', 'kernel'],
  relations: [
    {
      source: 'jsx',
      target: 'kernel',
      label: 'normalize',
      status: 'warning' as const,
      routing: { kind: 'orthogonal' as const, cornerRadius: 0 },
    },
  ],
  defaultFlow: { layout: { nodeGap: 0, rankGap: 48 } },
  graphRules: [{ type: 'entity' as const, selector: { role: 'activity' }, style: { color: 'dodgerblue' } }],
};

const expectedSource = {
  namespace: 'diagram',
  type: 'flow',
  ...sourceInput,
};

const measureText = (text: string) => ({ width: text.length * 8, height: 12, ascent: 9, descent: 3 });

const artifactValueOf = (
  result: Readonly<{ artifacts: ReadonlyArray<Readonly<{ namespace?: string; type?: string; value?: unknown }>> }>,
) => result.artifacts.find(artifact => artifact.namespace === 'diagram' && artifact.type === 'flow')?.value;

describe('@retikz/diagram-vanilla/flow', () => {
  it.each(['-|', '|-'] as const)('通过公共 Vanilla 适配器编译 %s 路由', kind => {
    const result = processToStaticInputResult(
      {
        children: [
          FlowVanilla.flowDiagram({
            entities: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
            children: ['a', 'b'],
            relations: [{ source: 'a', target: 'b', routing: { kind, cornerRadius: 0 } }],
          }),
        ],
      },
      { adapters: FlowVanilla.createFlowDiagramVanillaAdapters(), compile: { measureText } },
    );

    expect(artifactValueOf(result)).toMatchObject({ relations: [{ route: { kind, cornerRadius: 0 } }] });
  });

  it('从显式子路径导出完整的 Flow 编写表面', () => {
    expect(functionExport('normalizeFlowDiagram')).toBeDefined();
    expect(functionExport('flowDiagram')).toBeDefined();
    expect(functionExport('createFlowDiagramVanillaAdapters')).toBeDefined();
    expect(adapterExport()).toBeDefined();
  });

  it('将平面编写输入标准化为精确的 Direct Flow Source，而不添加默认值', () => {
    const normalizeFlowDiagram = functionExport<NormalizeFlowDiagram>('normalizeFlowDiagram');

    expect(normalizeFlowDiagram).toBeDefined();

    if (normalizeFlowDiagram === undefined) return;

    const source = normalizeFlowDiagram(sourceInput);

    expect(source).toEqual(expectedSource);
    expect(Object.keys(source).at(-1)).toBe('children');
  });

  it('标准化 Core 兼容的 Entity 文本块和 Source 文本布局，无需适配器默认值', () => {
    const normalizeFlowDiagram = functionExport<NormalizeFlowDiagram>('normalizeFlowDiagram');

    expect(normalizeFlowDiagram).toBeDefined();

    if (normalizeFlowDiagram === undefined) return;

    const input = {
      entities: [
        {
          id: 'form',
          text: ['Frontend form', { text: 'Complete user details', fill: 'gray', font: { size: 'sm' } }],
          layout: { align: 'start' as const, lineHeight: 18, maxTextWidth: 160 },
        },
      ],
      children: ['form'],
    };

    expect(normalizeFlowDiagram(input)).toEqual({ namespace: 'diagram', type: 'flow', ...input });
  });

  it('在键入的 Vanilla 编写中保留 id 键控的 Grid 位置', () => {
    const normalizeFlowDiagram = functionExport<NormalizeFlowDiagram>('normalizeFlowDiagram');

    expect(normalizeFlowDiagram).toBeDefined();

    if (normalizeFlowDiagram === undefined) return;

    const input = {
      entities: [
        { id: 'request', text: 'Request' },
        { id: 'result', text: 'Result' },
      ],
      layouts: [
        {
          kind: 'grid' as const,
          id: 'stages',
          children: ['request', 'result'],
          placements: {
            request: { row: 0, column: 0 },
            result: { row: 1, column: 1 },
          },
        },
      ],
      children: ['stages'],
    };

    expect(normalizeFlowDiagram(input)).toEqual({ namespace: 'diagram', type: 'flow', ...input });
  });

  it('将定义选项保留在 Source 之外，并提供相同的 Flow 提供者根', () => {
    const flowDiagram = functionExport<CreateFlowDiagramEmbed>('flowDiagram');
    const adapter = adapterExport();

    expect(flowDiagram).toBeDefined();
    expect(adapter).toBeDefined();

    if (flowDiagram === undefined || adapter === undefined) return;

    const flowTheme = DiagramFlow.defineFlowTheme({ name: 'brand', resolve: () => ({}) });
    const embed = flowDiagram({ ...sourceInput, flowThemeDefinitions: [flowTheme] });
    const contribution = adapter.lower(embed.props, context);

    expect(contribution.node).toEqual(expectedSource);
    expect(contribution.node).not.toHaveProperty('flowThemeDefinitions');
    expect(contribution.providerDependencies.roots).toEqual([DiagramFlow.flowDiagramProviderKey]);
  });

  it('通过贡献的提供者将规范化的 Source 编译为公共 Flow 产物', () => {
    const flowDiagram = functionExport<CreateFlowDiagramEmbed>('flowDiagram');
    const adapter = adapterExport();

    expect(flowDiagram).toBeDefined();
    expect(adapter).toBeDefined();

    if (flowDiagram === undefined || adapter === undefined) return;

    const vanillaResult = processToStaticInputResult(
      { children: [flowDiagram(sourceInput)] },
      { adapters: [adapter], compile: { padding: 0, measureText } },
    );

    expect(artifactValueOf(vanillaResult)).toMatchObject({
      layout: { definition: 'layered' },
      elements: [
        {
          id: 'client',
          kind: 'group',
          elements: [
            {
              id: 'frontend',
              kind: 'layout',
              elements: [{ id: 'jsx', kind: 'entity' }],
            },
          ],
        },
        { id: 'kernel', kind: 'entity' },
      ],
      relations: [{ source: { id: 'jsx' }, target: { id: 'kernel' }, route: { kind: 'orthogonal', cornerRadius: 0 } }],
    });
  });
});

it('容器宽度策略通过 Vanilla 归一化和 JSON 往返保留', () => {
  const source = FlowVanilla.normalizeFlowDiagram({
    entities: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    layouts: [
      { id: 'rows', kind: 'linear', direction: 'down', containerWidth: 'match-largest', children: ['row'] },
      { id: 'row', kind: 'linear', direction: 'right', itemWidth: 'fill', children: ['a', 'b'] },
    ],
    children: ['rows'],
    relations: [{ source: 'a', target: 'b' }],
  });

  expect(source.layouts?.[0]).toMatchObject({ containerWidth: 'match-largest' });
  expect(source.layouts?.[1]).toMatchObject({ itemWidth: 'fill' });
  expect(DiagramFlow.FlowDiagramSchema.parse(JSON.parse(JSON.stringify(source)))).toEqual(
    DiagramFlow.FlowDiagramSchema.parse(source),
  );
});
