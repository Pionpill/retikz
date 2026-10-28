import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineTheme } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject, string } from 'zod';

import { compileInspectionToScene, createInspectorRegistry, defineInspector, RetikzInspectError } from '../../src';

const key = { namespace: 'test', type: 'artifact' };

const owner = { kind: 'composite' as const, namespace: 'demo', type: 'artifact' };

const composite = defineComposite({
  namespace: owner.namespace,
  type: owner.type,
  schema: CompositeBaseSchema.extend({ namespace: literal(owner.namespace), type: literal(owner.type) }),
  artifactSchema: strictObject({ label: string() }),
  compile: () => ({ artifact: { label: 'settled' }, children: [{ type: 'node', position: [0, 0], text: 'primary' }] }),
});

const ir: IRScene = { version: 1, type: 'scene', children: [{ namespace: owner.namespace, type: owner.type }] };

const selection = {
  rules: [
    {
      kind: 'request' as const,
      inspector: key,
      target: { kind: 'self' as const, locator: { kind: 'authored' as const, sourcePath: 'children[0]' } },
      options: true as const,
    },
  ],
};

describe('检查编译驱动程序', () => {
  it('当选项解析器更改其表示形式时，使用承认的 Source 值', () => {
    const inspector = defineInspector({
      ...key,
      owner,
      optionsSchema: strictObject({ label: string().transform(label => `${label}!`) }),
      resolveOptions: options => options,
      inspect: (_subject, context) => [{ type: 'node', position: [0, 0], text: context.options.label }],
    });
    const result = compileInspectionToScene(ir, {
      registry: createInspectorRegistry([inspector]),
      selection: { rules: [{ ...selection.rules[0], options: { label: 'once' } }] },
      compileOptions: { composites: [composite] },
    });

    expect(JSON.stringify(result.inspection)).toContain('once!');
    expect(JSON.stringify(result.inspection)).not.toContain('once!!');
  });

  it('保持解析器故障原子性并保留其选择来源和原因', () => {
    const cause = new Error('Cannot resolve options');
    const inspector = defineInspector({
      ...key,
      owner,
      optionsSchema: strictObject({}),
      resolveOptions: () => {
        throw cause;
      },
      inspect: () => [],
    });

    expect(() =>
      compileInspectionToScene(ir, {
        registry: createInspectorRegistry([inspector]),
        selection,
        compileOptions: { composites: [composite] },
      }),
    ).toThrow(
      expect.objectContaining({
        cause,
        details: expect.objectContaining({ origin: expect.objectContaining({ stage: 'selection', ruleIndex: 0 }) }),
      }),
    );
  });

  it('解析捕获的实例主题的外观', () => {
    let appearance:
      | {
          colorScope: number;
          scopeColor: string;
          semanticColors: {
            error: string;
            success: string;
            warning: string;
            guide: string;
          };
        }
      | undefined;
    const themeName = defineTheme({
      name: 'inspect-brand',
      resolve: () => ({
        semantic: { error: '#error', success: '#success', warning: '#warning', guide: '#guide' },
        categorical: ['#scope'],
      }),
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: (_subject, context) => {
          appearance = context.appearance;
          return [];
        },
      }),
    ]);

    compileInspectionToScene(
      { ...ir, theme: { name: themeName.name } },
      { registry, selection, compileOptions: { composites: [composite], themeDefinitions: [themeName] } },
    );

    expect(appearance).toEqual({
      colorScope: 0,
      scopeColor: '#scope',
      semanticColors: { error: '#error', success: '#success', warning: '#warning', guide: '#guide' },
    });
    expect(Object.isFrozen(appearance?.semanticColors)).toBe(true);
  });

  it('校验检查对象并将每份稠密输出编译为封闭条目', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: (_subject, context) => [
          {
            type: 'node',
            id: 'private-a',
            meta: { source: 'inspect' },
            position: [0, 0],
            text: `${context.appearance.colorScope}`,
          },
          { type: 'node', id: 'private-b', position: [10, 0], text: 'b' },
        ],
      }),
    ]);

    const result = compileInspectionToScene(ir, {
      registry,
      selection,
      compileOptions: { composites: [composite], padding: 0 },
    });

    expect(result.primary.scene.primitives).toHaveLength(1);
    expect(result.inspection?.entries).toHaveLength(2);
    expect(result.inspection?.entries[0]?.scene.primitives[0]).not.toHaveProperty('id');
    expect(result.inspection?.entries[0]?.scene.primitives[0]).not.toHaveProperty('meta');
    expect(result.diagnostics).toEqual([]);
    expect(Object.isFrozen(result.inspection?.entries)).toBe(true);
  });

  it('保留选定的空回调颜色范围而不创建平面', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: (_subject, context) => {
          expect(context.appearance.colorScope).toBe(0);
          return [];
        },
      }),
    ]);
    const result = compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });

    expect(result.inspection).toBeNull();
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
  });

  it('在遍历之前捕获选择，因此提供者代码无法更改最终解析结果', () => {
    const mutableSelection = {
      rules: [
        {
          kind: 'request' as const,
          inspector: key,
          target: { kind: 'self' as const, locator: { kind: 'authored' as const, sourcePath: 'children[0]' } },
          options: true as const,
        },
      ],
    };
    const mutatingComposite = defineComposite({
      namespace: owner.namespace,
      type: owner.type,
      schema: CompositeBaseSchema.extend({ namespace: literal(owner.namespace), type: literal(owner.type) }),
      artifactSchema: strictObject({ label: string() }),
      compile: () => {
        mutableSelection.rules.length = 0;
        return { artifact: { label: 'settled' }, children: [] };
      },
    });
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: () => ({ type: 'node', position: [0, 0], text: 'captured' }),
      }),
    ]);

    const result = compileInspectionToScene(ir, {
      registry,
      selection: mutableSelection,
      compileOptions: { composites: [mutatingComposite] },
    });

    expect(mutableSelection.rules).toEqual([]);
    expect(result.inspection?.entries).toHaveLength(1);
  });

  it('将类型化所属模块输出直接传递给 Inspector 回调', () => {
    const subjects: Array<unknown> = [];
    const registry = createInspectorRegistry([
      defineInspector<{ label: string }>({
        ...key,
        owner,
        inspect: subject => {
          subjects.push(subject);
          return [];
        },
      }),
    ]);
    compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [composite] } });
    expect(subjects).toEqual([{ label: 'settled' }]);
  });

  it('拒绝具有片段来源的交叉主片段引用', () => {
    const registry = createInspectorRegistry([
      defineInspector({
        ...key,
        owner,
        optionsSchema: strictObject({}),
        resolveOptions: options => options,
        inspect: () => ({
          type: 'node',
          position: { kind: 'anchor', target: { id: 'primary-node' } },
          text: 'invalid reference',
        }),
      }),
    ]);
    const primaryWithId = defineComposite({
      ...composite,
      compile: () => ({
        artifact: { label: 'settled' },
        children: [{ type: 'node', id: 'primary-node', position: [0, 0], text: 'primary' }],
      }),
    });

    try {
      compileInspectionToScene(ir, { registry, selection, compileOptions: { composites: [primaryWithId] } });
      throw new Error('expected compile to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RetikzInspectError);
      expect((error as RetikzInspectError).details.origin).toMatchObject({ stage: 'fragment', outputIndex: 0 });
    }
  });

  it('独立放置混合的本地和场景片段并保留上下文警告', () => {
    const nodeScene: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'translate', x: 20, y: 10 }],
          children: [{ type: 'node', id: 'node-a', position: [0, 0], text: 'A' }],
        },
      ],
    };
    const nodeKey = { namespace: 'test', type: 'node-scene' };
    const nodeInspector = defineInspector({
      ...nodeKey,
      owner: { kind: 'node' as const },
      optionsSchema: strictObject({}),
      resolveOptions: options => options,
      inspect: (_subject, context) => {
        expect(context.transform).toEqual([1, 0, 0, 1, 20, 10]);
        expect(context.ancestors).toHaveLength(1);
        expect(context.ancestors[0]?.owner).toEqual({ kind: 'scope' });
        expect(typeof context.warn).toBe('function');

        context.warn('OptionalGeometry', 'key points are unavailable');

        return [
          {
            type: 'fragment',
            coordinateSpace: 'scene',
            child: { type: 'node', position: [20, 10], text: 'scene output' },
          },
          { type: 'node', position: [0, 0], text: 'local output' },
          {
            type: 'fragment',
            coordinateSpace: 'local',
            child: { type: 'node', position: [0, 0], text: 'explicit local' },
          },
        ];
      },
    });

    const result = compileInspectionToScene(nodeScene, {
      registry: createInspectorRegistry([nodeInspector]),
      selection: {
        rules: [{ kind: 'request', inspector: nodeKey, target: { kind: 'scene' }, options: true }],
      },
      compileOptions: { padding: 0 },
    });

    expect(result.inspection?.entries).toHaveLength(3);
    expect(result.inspection?.entries[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(result.inspection?.entries[1]?.transform).toEqual([1, 0, 0, 1, 20, 10]);
    expect(result.inspection?.entries[2]?.transform).toEqual([1, 0, 0, 1, 20, 10]);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        cause: { code: 'OptionalGeometry', message: 'key points are unavailable', path: expect.any(String) },
      }),
    ]);
  });
});
