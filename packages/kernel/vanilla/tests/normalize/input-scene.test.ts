import type { AnyCompositeDefinition, CompileWarning, IRPath } from '@retikz/core';
import { BuiltinCompileWarningCode, CompositeBaseSchema, defineComposite, SceneSchema } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { literal, string } from 'zod';

import type { InputEmbedAdapter, InputPath, InputScene, InputStep } from '../../src';
import {
  coordinate,
  embed,
  layer,
  node,
  normalizePath,
  normalizeScene,
  RetikzVanillaError,
  RetikzVanillaErrorCode,
  path,
  scene,
  scope,
} from '../../src';
import { compileTestResult } from '../helpers/compilation';

it('Node 与 Coordinate 的 opaque authoring 只进入来源站点，不进入嵌套 Core IR', () => {
  const marker = { request: 'opaque' };
  const result = normalizeScene(
    scene({
      children: [
        {
          type: 'scope',
          children: [
            node({ id: 'n', position: [0, 0], authoring: marker }),
            coordinate({ id: 'c', position: [1, 2], authoring: marker }),
            node({ position: [2, 0] }),
            node({ position: [3, 0], authoring: false }),
          ],
        },
      ],
    }),
  );

  expect(result.ir.children).toEqual([
    {
      type: 'scope',
      children: [
        { type: 'node', id: 'n', position: [0, 0] },
        { type: 'coordinate', id: 'c', position: [1, 2] },
        { type: 'node', position: [2, 0] },
        { type: 'node', position: [3, 0] },
      ],
    },
  ]);
  expect(result.authoringSites).toEqual([
    {
      kind: 'node',
      type: 'node',
      sourcePath: 'children[0].scope.children[0].node',
      authoring: marker,
    },
    {
      kind: 'coordinate',
      type: 'coordinate',
      sourcePath: 'children[0].scope.children[1].coordinate',
      authoring: marker,
    },
    { kind: 'node', type: 'node', sourcePath: 'children[0].scope.children[3].node', authoring: false },
  ]);
});

it('嵌套作用域只替换含简写或作者字段的分支', () => {
  const unchanged = scope({}, [node({ position: [0, 0] })]);
  const authored = scope({ authoring: undefined }, [path({ way: ['A', 'B'] })]);
  const result = normalizeScene(scene([scope({}, [unchanged, authored])]));
  const parent = result.ir.children[0];
  if ('namespace' in parent || parent.type !== 'scope') throw new Error('Expected scope');
  expect(parent.children[0]).toBe(unchanged);
  expect(parent.children[1]).toEqual({
    type: 'scope',
    children: [
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          { type: 'step', kind: 'line', to: { id: 'B' } },
        ],
      },
    ],
  });
  expect(parent.children[1]).not.toHaveProperty('authoring');
  expect(result.authoringSites).toEqual([]);
});

const EMPTY_COMPOSITE_DEPENDENCIES = Object.freeze({ roots: [], providers: [] });

const boxComposite = defineComposite({
  namespace: 'fixture',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: literal('fixture'),
    type: literal('box'),
    text: string(),
  }),
  compile: composite => ({
    children: [
      {
        type: 'node',
        id: `fixture-${composite.text}`,
        position: [0, 0],
        shape: 'rectangle',
        text: composite.text,
      },
    ],
  }),
});

const createBoxAdapter = (
  makeDefinition = vi.fn<(contributions: ReadonlyArray<{ shared: object }>) => AnyCompositeDefinition>(
    () => boxComposite,
  ),
): InputEmbedAdapter<{ text: string; data: object }> => ({
  kind: 'fixture-box',
  lower: props => ({
    node: { namespace: 'fixture', type: 'box', text: props.text },
    providerDependencies: {
      roots: [{ capability: 'composite', namespace: 'fixture', type: 'box' }],
      providers: [
        {
          key: { capability: 'composite', namespace: 'fixture', type: 'box' },
          params: { shared: props.data },
          makeDefinition,
        },
      ],
    },
  }),
});

describe('@retikz/vanilla InputScene', () => {
  it('scene/path helper 只构造 Input，不提前解析 path grammar', () => {
    const input = scene({
      layers: [
        layer({
          name: 'main',
          children: [
            node({ id: 'source', position: [0, 0] }),
            path({ id: 'edge', way: ['source', [24, 0]], style: { strokeWidth: 2 } }),
          ],
        }),
      ],
    });

    expect(input).toMatchObject({
      type: 'scene',
      layers: [
        {
          name: 'main',
          children: [
            { type: 'node', id: 'source' },
            { type: 'path', id: 'edge', way: ['source', [24, 0]], style: { strokeWidth: 2 } },
          ],
        },
      ],
    });
    expect(input).not.toHaveProperty('version');
  });

  it('InputScene 的 children 简写归一为唯一 IR', () => {
    const input: InputScene = { type: 'scene', children: [{ type: 'node', id: 'node', position: [0, 0] }] };

    expect(normalizeScene(input)).toMatchObject({
      ir: {
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'node', position: [0, 0] }],
      },
      contributions: [],
    });
  });

  it('显式 type 的 Path Input 仍由 Vanilla 归一为路径 IR', () => {
    const input: InputScene = {
      type: 'scene',
      children: [
        {
          type: 'path',
          way: [
            [0, 0],
            [24, 0],
          ],
        },
      ],
    };

    expect(normalizeScene(input).ir.children).toEqual([
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
      },
    ]);
  });

  it('显式 type 的 Scope Input 仍由 Vanilla 归一为 Scope IR', () => {
    const input: InputScene = {
      type: 'scene',
      children: [{ type: 'scope', transforms: [], children: [{ type: 'node', id: 'nested', position: [0, 0] }] }],
    };

    expect(normalizeScene(input).ir.children).toEqual([
      {
        type: 'scope',
        transforms: [],
        children: [{ type: 'node', id: 'nested', position: [0, 0] }],
      },
    ]);
  });

  it.each([
    { type: 'step', kind: 'line', to: 'b.center' },
    { type: 'step', kind: 'rectangle', from: 'a.center', to: [1, 1] },
    { type: 'step', kind: 'arc', center: 'a.center', startAngle: 0, endAngle: 90, radius: 1 },
    { type: 'step', kind: 'smooth', points: [[0, 0], 'b.center'] },
  ] satisfies Array<InputStep>)('显式 Path 的 $kind 字符串目标在 Scene 和嵌套 Scope 使用相同归一化', step => {
    const input: InputPath = { type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }, step] };
    const expected = normalizePath(input);
    expect(normalizeScene({ type: 'scene', children: [input] }).ir.children).toEqual([expected]);
    expect(
      normalizeScene({ type: 'scene', children: [{ type: 'scope', children: [input] }] }).ir.children,
    ).toMatchObject([{ type: 'scope', children: [expected] }]);
  });

  it('同步 adapter 失败由 Vanilla 报告并保留原始异常', () => {
    const cause = new Error('external adapter failure');
    const adapter: InputEmbedAdapter = {
      kind: 'broken',
      lower: () => {
        throw cause;
      },
    };
    expect(() => normalizeScene(scene([embed({ adapter, props: {} })]))).toThrow(
      expect.objectContaining({ constructor: RetikzVanillaError, code: RetikzVanillaErrorCode.Normalize, cause }),
    );
  });

  it('由 helper 构造的 Scope 和 Path 保留类别和显式首段', () => {
    const edge = path({
      children: [
        { type: 'step', kind: 'line', to: [1, 2] },
        { type: 'step', kind: 'line', to: [3, 4] },
      ],
    });
    const group = scope({}, [edge]);
    expect(group.type).toBe('scope');
    expect(edge.type).toBe('path');
    expect(normalizeScene(scene([group])).ir.children).toMatchObject([
      {
        type: 'scope',
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'line', to: [1, 2] },
              { type: 'step', kind: 'line', to: [3, 4] },
            ],
          },
        ],
      },
    ]);
  });

  it('直接传入的 Core Path 保持原有步骤语义，不进入 InputPath 归一化', () => {
    const corePath: IRPath = {
      type: 'path',
      children: [
        { type: 'step', kind: 'line', to: [10, 0] },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    };

    expect(normalizeScene({ type: 'scene', children: [corePath] }).ir.children[0]).toBe(corePath);
    const nested = normalizeScene({
      type: 'scene',
      children: [{ type: 'scope', children: [corePath, node({ id: 'sibling', authoring: true })] }],
    }).ir.children[0];
    expect(nested.type === 'scope' && !('namespace' in nested) && nested.children[0]).toBe(corePath);
  });

  it('直接 Core Path 的 host 与 step label interrupt 经归一化后保持 JSON 合法', () => {
    const normalized = normalizeScene({
      type: 'scene',
      children: [
        {
          type: 'path',
          label: { text: 'host', interrupt: false },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0], label: { text: 'step', interrupt: true } },
          ],
        },
      ],
    });

    expect(SceneSchema.parse(JSON.parse(JSON.stringify(normalized.ir))).children).toMatchObject([
      {
        type: 'path',
        label: { text: 'host', interrupt: false },
        children: [{ kind: 'move' }, { kind: 'line', label: { text: 'step', interrupt: true } }],
      },
    ]);
  });

  it('localNamespace InputScope 允许遮蔽外层 identity', () => {
    expect(
      normalizeScene(
        scene([
          node({ id: 'A', position: [0, 0] }),
          scope({ localNamespace: true }, [node({ id: 'A', position: [20, 0] })]),
        ]),
      ).ir.children,
    ).toEqual([
      { type: 'node', id: 'A', position: [0, 0] },
      { type: 'scope', localNamespace: true, children: [{ type: 'node', id: 'A', position: [20, 0] }] },
    ]);
  });

  it('同一 namespace 的后定义 identity 保留给 Core 以警告并覆盖解析目标', () => {
    const normalized = normalizeScene(
      scene([
        node({ id: 'A', position: [0, 0] }),
        scope({}, [node({ id: 'A', position: [120, 0] })]),
        path({ id: 'edge', way: [[0, -40], 'A'] }),
      ]),
    );
    const warnings: Array<CompileWarning> = [];

    const compiled = compileTestResult(normalized.ir, { onWarn: warning => warnings.push(warning) }).scene;
    const edge = compiled.primitives.find(primitive => primitive.type === 'path' && primitive.id === 'edge');
    const line = edge?.type === 'path' ? edge.commands.find(command => command.kind === 'line') : undefined;

    expect(warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: BuiltinCompileWarningCode.DuplicateNodeId })]),
    );
    expect(line?.to[0]).toBeGreaterThan(60);
  });

  it('显式的空 Scope 保留空子列表', () => {
    expect(normalizeScene({ type: 'scene', children: [{ type: 'scope', children: [] }] }).ir.children).toEqual([
      { type: 'scope', children: [] },
    ]);
  });

  it('默认 Layer identity 不占用公开 child identity', () => {
    expect(normalizeScene(scene([node({ id: 'default', position: [0, 0] })])).ir.children).toEqual([
      { type: 'node', id: 'default', position: [0, 0] },
    ]);
  });

  it('显式层序优先，同层序保持声明顺序', () => {
    const normalized = normalizeScene(
      scene({
        layers: [layer({ name: 'overlay', zIndex: 0, children: [] }), layer({ name: 'background', children: [] })],
      }),
    );
    expect(normalized.map(({ name }) => name)).toEqual(['overlay', 'background']);
  });

  it('normalizeScene 解析 path shorthand，并保留零线宽', () => {
    const normalized = normalizeScene(
      scene([
        path({
          id: 'edge',
          way: [
            [0, 0],
            [24, 0],
          ],
          style: { strokeWidth: 0 },
        }),
      ]),
    );

    expect(normalized.ir.children).toEqual([
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
        style: { strokeWidth: 0 },
      },
    ]);
  });

  it('Path arrow authoring 由 Vanilla normalizer 统一收敛为 marks', () => {
    const arrowPath = {
      type: 'path' as const,
      id: 'edge',
      way: [
        [0, 0],
        [24, 0],
      ] as const,
      arrow: { start: { shape: 'stealth', color: '#dc2626' }, end: { shape: 'stealth', color: '#2563eb' } },
    };

    expect(normalizeScene(scene([arrowPath])).ir.children).toEqual([
      {
        type: 'path',
        id: 'edge',
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [24, 0] },
        ],
        arrow: { start: { shape: 'stealth', color: '#dc2626' }, end: { shape: 'stealth', color: '#2563eb' } },
      },
    ]);
  });

  it('authoring provenance 不进入 Core IR', () => {
    const authoring = Object.freeze({ extension: 'fixture' });
    const normalized = normalizeScene(
      scene({
        authoring,
        children: [
          scope({ authoring }, [
            path({
              id: 'curve',
              authoring,
              way: [
                [0, 0],
                [30, 10],
              ],
            }),
          ]),
        ],
      }),
    );

    expect(normalized.authoringSites.map(site => site.authoring)).toEqual([authoring, authoring, authoring]);
    expect(JSON.stringify(normalized.ir)).not.toContain('authoring');
  });

  it('embed normalizer 只收集 contribution，不调用 provider maker', () => {
    const makeDefinition = vi.fn(() => boxComposite);
    const adapter = createBoxAdapter(makeDefinition);
    const normalized = normalizeScene(
      scene([embed({ adapter, id: 'box', props: { text: 'A', data: { rows: [1] } } })]),
    );

    expect(normalized.ir.children).toEqual([{ namespace: 'fixture', type: 'box', text: 'A' }]);
    expect(normalized.contributions).toHaveLength(1);
    expect(makeDefinition).not.toHaveBeenCalled();
  });

  it('为匿名 embed 分配稳定且互异的运行时 identity，而不写入 Source', () => {
    const identities: Array<string> = [];
    const adapter: InputEmbedAdapter<{ text: string }> = {
      kind: 'anonymous-output',
      lower: (props, context) => {
        identities.push(context.id);
        return {
          node: { namespace: 'fixture', type: 'box', text: props.text },
          providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
        };
      },
    };
    const createInput = () =>
      scene([embed({ adapter, props: { text: 'left' } }), embed({ adapter, props: { text: 'right' } })]);

    const first = normalizeScene(createInput());
    const firstIdentities = [...identities];
    identities.length = 0;
    const second = normalizeScene(createInput());

    expect(firstIdentities).toHaveLength(2);
    expect(new Set(firstIdentities)).toHaveLength(2);
    expect(identities).toEqual(firstIdentities);
    expect(first.ir).toEqual(second.ir);
    expect(first.ir.children).toEqual([
      { namespace: 'fixture', type: 'box', text: 'left' },
      { namespace: 'fixture', type: 'box', text: 'right' },
    ]);
  });

  it('保留 adapter 输出的嵌套节点身份', () => {
    const adapter: InputEmbedAdapter<{ label: string }> = {
      kind: 'named-output',
      lower: props => ({
        node: {
          type: 'scope',
          id: 'chart/root',
          children: [{ type: 'node', id: 'chart/label', position: [0, 0], text: props.label }],
        },
        providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
      }),
    };

    const normalized = normalizeScene(
      scene({
        layers: [layer({ name: 'main', children: [embed({ adapter, id: 'chart', props: { label: 'A' } })] })],
      }),
    );

    expect(normalized[0].result.ir.children).toMatchObject([{ id: 'chart/root', children: [{ id: 'chart/label' }] }]);

    const wrappedAdapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'wrapped-output',
      lower: (_props, context) => ({
        node: {
          type: 'scope',
          children: [{ type: 'node', id: context.id, position: [0, 0] }],
        },
        providerDependencies: EMPTY_COMPOSITE_DEPENDENCIES,
      }),
    };

    const wrapped = normalizeScene(scene([embed({ adapter: wrappedAdapter, id: 'chart', props: {} })]));

    expect(wrapped.ir.children).toEqual([
      { type: 'scope', children: [{ type: 'node', id: 'chart', position: [0, 0] }] },
    ]);
  });
});
