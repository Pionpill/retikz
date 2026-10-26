import type { CompileObservation, IRScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import type { InspectionSelection, InspectorRegistry } from '../../src';
import { createInspectorRegistry, defineInspector, RetikzInspectError } from '../../src';
import { admitInspectionSelection, resolveAdmittedInspectionSelection } from '../../src/compile/selection';

/** 按真实 admission 与最终 observation 两阶段解析测试请求 */
const resolveSelection = ({
  ir,
  registry,
  selection,
  observations,
}: {
  ir: IRScene;
  registry: InspectorRegistry;
  selection: InspectionSelection;
  observations: ReadonlyArray<CompileObservation>;
}) =>
  resolveAdmittedInspectionSelection({
    registry,
    admittedRules: admitInspectionSelection(ir, registry, selection),
    observations,
  });

const owner = { kind: 'composite' as const, namespace: 'demo', type: 'box' };

const key = { namespace: 'test', type: 'box' };

const definition = defineInspector({
  ...key,
  owner,
  optionsSchema: strictObject({ label: string().default('default'), tone: string().default('normal') }),
  mergeOptionsInput: (inherited, local) => ({ ...inherited, ...local }),
  inspect: () => [],
});

const registry = createInspectorRegistry([definition]);

const ir: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'scope',
      children: [
        { namespace: 'demo', type: 'box' },
        { namespace: 'demo', type: 'box' },
      ],
    },
  ],
};

const observation = (index: number): CompileObservation => ({
  owner,
  occurrence: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
  provenance: {
    origin: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
    final: { sourcePath: `children[0].scope.children[${index}]`, expansionPath: [] },
  },
  ancestors: [],
  transform: [1, 0, 0, 1, 0, 0],
  value: { value: index },
});

const colocatedObservation = (index: number): CompileObservation => ({
  ...observation(0),
  occurrence: {
    sourcePath: 'children[0].scope.children[0]',
    expansionPath: index === 0 ? [] : [{ kind: 'replay', index: index - 1 }],
  },
  provenance: {
    origin: {
      sourcePath: 'children[0].scope.children[0]',
      expansionPath: index === 0 ? [] : [{ kind: 'probe', index: index - 1 }],
    },
    final: {
      sourcePath: 'children[0].scope.children[0]',
      expansionPath: index === 0 ? [] : [{ kind: 'replay', index: index - 1 }],
    },
  },
  value: { value: index },
});

describe('检查选择', () => {
  it('使用 schema 默认值和转换后的输出，无需直接注册解析器', () => {
    const rawDefinition = {
      ...key,
      owner,
      optionsSchema: strictObject({ count: string().default('2').transform(Number) }),
      inspect: () => [],
    };

    for (const [options, count] of [
      [true, 2],
      [{ count: '5' }, 5],
    ] as const) {
      const requests = resolveSelection({
        ir,
        registry: createInspectorRegistry([rawDefinition]),
        observations: [observation(0)],
        selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options }] },
      });

      expect(requests[0]?.options).toEqual({ count });
    }
  });

  it('将解析的输出传递给具有不同消费者形状的自定义解析器', () => {
    const inspector = defineInspector({
      ...key,
      owner,
      optionsSchema: strictObject({ count: string().default('2').transform(Number) }),
      resolveOptions: options => ({ label: options.count.toFixed(1) }),
      inspect: (_subject, context) => ({ type: 'node', position: [0, 0], content: context.options.label }),
    });
    const requests = resolveSelection({
      ir,
      registry: createInspectorRegistry([inspector]),
      observations: [observation(0)],
      selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
    });

    expect(requests[0]?.options).toEqual({ label: '2.0' });
  });

  it('将合并回调突变与编写选项和后来发生的事件隔离开来', () => {
    const sourceOptions = { label: 'parent' };
    const mutating = defineInspector({
      ...definition,
      mergeOptionsInput: inherited => {
        inherited.label = `${inherited.label ?? ''}!`;
        return inherited;
      },
    });
    const resolved = resolveSelection({
      ir,
      registry: createInspectorRegistry([mutating]),
      observations: [observation(0), observation(1)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: sourceOptions },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: {},
          },
        ],
      },
    });

    expect(resolved.map(request => request.options.label)).toEqual(['parent!', 'parent!']);
    expect(sourceOptions).toEqual({ label: 'parent' });
  });

  it('在转换有效选项之前合并三个编写的图层', () => {
    const transformed = defineInspector({
      ...key,
      owner,
      inspect: () => [],
      optionsSchema: strictObject({
        label: string()
          .transform(label => `${label}!`)
          .default('default'),
      }),
      mergeOptionsInput: (inherited, local) => ({ ...inherited, ...local }),
    });
    const resolved = resolveSelection({
      ir,
      registry: createInspectorRegistry([transformed]),
      observations: [observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { label: 'once' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: {},
          },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: {},
          },
        ],
      },
    });

    expect(resolved[0]?.options).toEqual({ label: 'once!' });
  });

  it.each([true, false])('即使不匹配或被覆盖，也会拒绝无效的源规则：%s', matched => {
    expect(() =>
      resolveSelection({
        ir,
        registry,
        observations: matched ? [observation(0)] : [],
        selection: {
          rules: [
            { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { label: 42 } },
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'subtree', sourcePath: 'children[0].scope' },
              options: { label: 'valid' },
            },
          ],
        },
      }),
    ).toThrow();
  });

  it('评估场景、外子树、编写自身并在稳定排序后分配外观', () => {
    const resolved = resolveSelection({
      ir,
      registry,
      observations: [observation(1), observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: { tone: 'scene' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[0].scope' },
            options: { label: 'nested' },
          },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[1]' } },
            options: { tone: 'self' },
          },
        ],
      },
    });

    expect(resolved.map(request => request.occurrence.sourcePath)).toEqual([
      'children[0].scope.children[0]',
      'children[0].scope.children[1]',
    ]);
    expect(resolved.map(request => request.options)).toEqual([
      { label: 'nested', tone: 'scene' },
      { label: 'nested', tone: 'self' },
    ]);
    expect(resolved.map(request => request.colorScope)).toEqual([0, 1]);
  });

  it('barrier 下方无法重新启用检查', () => {
    const resolved = resolveSelection({
      ir,
      registry,
      observations: [observation(0)],
      selection: {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: true },
          { kind: 'barrier', target: { kind: 'subtree', sourcePath: 'children[0].scope' } },
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: true,
          },
        ],
      },
    });

    expect(resolved).toEqual([]);
  });

  it('允许仅错误的自我规则，而不请求所属模块输出', () => {
    expect(
      resolveSelection({
        ir,
        registry,
        observations: [],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
              options: false,
            },
          ],
        },
      }),
    ).toEqual([]);
  });

  it('显式自身所属模块不匹配失败，但允许没有匹配所属模块的场景规则', () => {
    const pathDefinition = defineInspector({
      ...key,
      owner: { kind: 'path' as const, name: 'stroke' },
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: () => [],
    });
    const pathRegistry = createInspectorRegistry([pathDefinition]);

    expect(() =>
      resolveSelection({
        ir,
        registry: pathRegistry,
        observations: [observation(0)],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
              options: true,
            },
          ],
        },
      }),
    ).toThrow(/owner/i);
    expect(
      resolveSelection({
        ir,
        registry: pathRegistry,
        observations: [observation(0)],
        selection: { rules: [{ kind: 'request', inspector: key, target: { kind: 'scene' }, options: true }] },
      }),
    ).toEqual([]);
  });

  it('当一个编写源发布多个所属模块输出时，选择匹配的所属模块', () => {
    const colocatedPath: CompileObservation = {
      ...observation(0),
      owner: { kind: 'path', name: 'stroke' },
    };

    const resolved = resolveSelection({
      ir,
      registry,
      observations: [colocatedPath, observation(0)],
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope.children[0]' } },
            options: true,
          },
        ],
      },
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.owner).toEqual(owner);
  });

  it('按 occurrenceIndex 区分同 source path 与 owner 的嵌套 occurrence', () => {
    const resolved = resolveSelection({
      ir,
      registry,
      observations: [colocatedObservation(1), colocatedObservation(0)],
      selection: {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: {
              kind: 'self',
              locator: {
                kind: 'authored',
                sourcePath: 'children[0].scope.children[0]',
                occurrenceIndex: 1,
              },
            },
            options: true,
          },
        ],
      },
    });

    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.occurrence.expansionPath).toEqual([{ kind: 'replay', index: 0 }]);
  });

  it('拒绝最终所属模块出现之外的编写 occurrenceIndex', () => {
    expect(() =>
      resolveSelection({
        ir,
        registry,
        observations: [colocatedObservation(0), colocatedObservation(1)],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: key,
              target: {
                kind: 'self',
                locator: {
                  kind: 'authored',
                  sourcePath: 'children[0].scope.children[0]',
                  occurrenceIndex: 2,
                },
              },
              options: true,
            },
          ],
        },
      }),
    ).toThrow(/final owner output/i);
  });

  it('支持第三方 Path Inspector 的场景和自选', () => {
    const pathKey = { namespace: 'third-party', type: 'path-geometry' };
    const pathDefinition = defineInspector({
      ...pathKey,
      owner: { kind: 'path' as const, name: 'stroke' },
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: () => [],
    });
    const pathRegistry = createInspectorRegistry([pathDefinition]);
    const pathIr: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'path', children: [{ type: 'step', kind: 'move', to: [0, 0] }] }],
    };
    const pathObservation: CompileObservation = {
      owner: { kind: 'path', name: 'stroke' },
      occurrence: { sourcePath: 'children[0].path', expansionPath: [] },
      provenance: {
        origin: { sourcePath: 'children[0].path', expansionPath: [] },
        final: { sourcePath: 'children[0].path', expansionPath: [] },
      },
      transform: [1, 0, 0, 1, 0, 0],
      ancestors: [],
      value: { value: 1 },
    };

    expect(
      resolveSelection({
        ir: pathIr,
        registry: pathRegistry,
        observations: [pathObservation],
        selection: { rules: [{ kind: 'request', inspector: pathKey, target: { kind: 'scene' }, options: true }] },
      }),
    ).toHaveLength(1);
    expect(
      resolveSelection({
        ir: pathIr,
        registry: pathRegistry,
        observations: [pathObservation],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: pathKey,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].path' } },
              options: true,
            },
          ],
        },
      }),
    ).toHaveLength(1);
  });

  it('不允许编写的 Scope 自定位器选择同一源路径中的裁剪应用程序', () => {
    const clipKey = { namespace: 'test', type: 'clip' };
    const clipDefinition = defineInspector({
      ...clipKey,
      owner: { kind: 'clip' as const },
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: () => [],
    });
    const clipObservation: CompileObservation = {
      owner: { kind: 'clip' },
      occurrence: { sourcePath: 'children[0].scope', expansionPath: [{ kind: 'clip', index: 0 }] },
      provenance: {
        origin: { sourcePath: 'children[0].scope', expansionPath: [] },
        final: { sourcePath: 'children[0].scope', expansionPath: [{ kind: 'clip', index: 0 }] },
      },
      ancestors: [],
      transform: [1, 0, 0, 1, 0, 0],
      value: { value: 1 },
    };
    const clipIr: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'scope', clip: { kind: 'rect', params: { x: 0, y: 0, width: 10, height: 10 } }, children: [] },
      ],
    };

    try {
      resolveSelection({
        ir: clipIr,
        registry: createInspectorRegistry([clipDefinition]),
        observations: [clipObservation],
        selection: {
          rules: [
            {
              kind: 'request',
              inspector: clipKey,
              target: { kind: 'self', locator: { kind: 'authored', sourcePath: 'children[0].scope' } },
              options: true,
            },
          ],
        },
      });
      throw new Error('expected authored Scope self selection to reject Clip output');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'selection' });
    }
  });

  it.each([
    [
      'duplicate target and key',
      {
        rules: [
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: true },
          { kind: 'request', inspector: key, target: { kind: 'scene' }, options: false },
        ],
      },
    ],
    [
      'invalid source locator',
      {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: { kind: 'subtree', sourcePath: 'children[99].scope' },
            options: true,
          },
        ],
      },
    ],
    [
      'invalid authored occurrence index',
      {
        rules: [
          {
            kind: 'request',
            inspector: key,
            target: {
              kind: 'self',
              locator: {
                kind: 'authored',
                sourcePath: 'children[0].scope.children[0]',
                occurrenceIndex: -1,
              },
            },
            options: true,
          },
        ],
      },
    ],
  ] as const)('在解析回调之前，%s 的准入失败', (_label, selection) => {
    expect(() =>
      resolveSelection({
        ir,
        registry,
        observations: [observation(0)],
        selection,
      }),
    ).toThrow();
  });
});
