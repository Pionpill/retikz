import type { AnyCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineTheme,
  resolveCoreProviderDependencies,
  RetikzCoreError,
  RetikzCoreErrorCode,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal, strictObject } from 'zod';

import type { TableProviderParams, TablesLoweringOptions, TableStructureOutput } from '../../../src';
import {
  createTableRuntimeContribution,
  defineCellFormatter,
  defineCellPresentation,
  defineCellVisualScale,
  defineTableStructure,
  defineTableTheme,
  TABLE_NAMESPACE,
  TableComposite,
  TableRowKind,
} from '../../../src';

const outputOf = (kind: string): TableStructureOutput => ({
  rows: [{ id: 'row.0', kind: TableRowKind.Body }],
  columns: [{ id: 'column.0' }],
  cells: [
    {
      id: 'cell.0',
      row: 0,
      column: 0,
      payload: { kind: 'value', value: kind },
      location: 'body',
      roles: ['data'],
      source: { kind: 'generated', structureKind: kind },
    },
  ],
});

const structureOf = (kind: string) =>
  defineTableStructure({
    schema: strictObject({ kind: literal(kind) }),
    build: () => outputOf(kind),
  });

const presentationOf = (name: string) =>
  defineCellPresentation({
    name,
    optionsSchema: strictObject({}),
    present: input => ({ type: 'node', position: [0, 0], text: String(input.value) }),
  });

const formatterOf = (name: string) =>
  defineCellFormatter({
    name,
    optionsSchema: strictObject({}),
    format: input => input.value,
  });

const visualScaleOf = (name: string) =>
  defineCellVisualScale({
    name,
    optionsSchema: strictObject({}),
    resolve: () => ({ of: () => '#2563eb', legendForm: 'swatch', domain: [1], range: ['#2563eb'] }),
  });

const themeNameOf = (name: string) =>
  defineTableTheme({
    name,
    resolve: () => ({}),
  });

const compositeOf = (namespace: string, type: string): AnyCompositeDefinition => {
  const schema = CompositeBaseSchema.extend({ namespace: literal(namespace), type: literal(type) });
  return defineComposite({
    namespace,
    type,
    schema,
    compile: () => ({ children: [{ type: 'scope', children: [] }] }),
  });
};

const definitionsOf = (...contributions: Array<ReturnType<typeof createTableRuntimeContribution>>) =>
  resolveCoreProviderDependencies({ contributions });

const tableProviderOf = (contribution: ReturnType<typeof createTableRuntimeContribution>) =>
  contribution.providers.find(
    provider =>
      provider.key.capability === 'composite' &&
      provider.key.namespace === TABLE_NAMESPACE &&
      provider.key.type === 'table',
  ) as CoreDependencyProvider<TableProviderParams> | undefined;

/** 验证 provider 边界包装错误，同时保留领域冲突原因 */
const expectProviderFailure = (action: () => unknown, message: RegExp): void => {
  let failure: unknown;
  try {
    action();
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(RetikzCoreError);
  if (!(failure instanceof RetikzCoreError)) throw new Error('Expected provider failure');
  expect(failure.code).toBe(RetikzCoreErrorCode.Provider);
  expect(failure.cause).toBeInstanceOf(Error);
  if (!(failure.cause instanceof Error)) throw new Error('Expected original domain failure');
  expect(failure.cause.message).toMatch(message);
};

describe('Table 运行时贡献', () => {
  it('复用同名行数组，拒绝不同引用覆盖同名数据集', () => {
    const rows = [{ value: 1 }];
    const first = createTableRuntimeContribution({ data: { sales: rows } });
    const shared = createTableRuntimeContribution({ data: { sales: rows } });
    const conflict = createTableRuntimeContribution({ data: { sales: [...rows] } });

    expect(definitionsOf(first, shared).composites).toHaveLength(1);
    expectProviderFailure(() => definitionsOf(first, conflict), /sales.*conflicts by identity/);
  });

  it('使用稳定的工厂参考，同时保留数据集身份', () => {
    const rows: Array<Record<string, unknown>> = [{ value: 1 }];
    const contribution = createTableRuntimeContribution({
      data: { sales: rows },
    });
    const another = createTableRuntimeContribution({});

    const provider = tableProviderOf(contribution);
    const anotherProvider = tableProviderOf(another);

    expect(provider?.makeDefinition).toBe(anotherProvider?.makeDefinition);
    expect(contribution.roots).toEqual([
      { capability: 'composite', namespace: TABLE_NAMESPACE, type: TableComposite.Table },
    ]);
    expect(provider?.dependencies ?? []).toEqual([]);
    expect(provider?.params?.datasets.sales).toBe(rows);
    expect(Object.keys(provider?.params?.datasets ?? {})).toEqual(['sales']);
  });

  it('下沉数据集并在附加项之前排序 Table 定义', () => {
    const extra = compositeOf('fixture', 'badge');
    const rows = [{ name: 'Ada' }];
    const contribution = createTableRuntimeContribution({
      data: { people: rows },
      composites: [extra],
    });
    const definitions = definitionsOf(contribution);

    expect(definitions.composites?.map(definition => `${definition.namespace}.${definition.type}`)).toEqual([
      `${TABLE_NAMESPACE}.${TableComposite.Table}`,
      'fixture.badge',
    ]);

    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            namespace: TABLE_NAMESPACE,
            type: TableComposite.Table,
            data: { reference: 'people' },
            structure: {
              kind: 'detail',
              header: false,
              columns: [{ id: 'name', field: 'name' }],
            },
          },
        ],
      },
      definitions,
    );

    expect(JSON.stringify(result.scene)).toContain('Ada');
  });

  it('通过嵌入运行时参数传递自定义 Table 样式定义', () => {
    const tableStyle = themeNameOf('brand');
    const contribution = createTableRuntimeContribution({
      lowerOptions: { tableThemeDefinitions: [tableStyle] },
    });
    const result = compileToScene(
      {
        version: 1,
        type: 'scene',
        theme: { name: 'brand', mode: 'light' },
        children: [
          {
            namespace: TABLE_NAMESPACE,
            type: TableComposite.Table,
            structure: { kind: 'manual', rows: [['x']] },
          },
        ],
      },
      {
        ...definitionsOf(contribution),
        themeDefinitions: [
          defineTheme({
            name: 'brand',
            resolve: () => ({}),
          }),
        ],
      },
    );
    const manifest = result.artifacts.find(artifact => artifact.namespace === TABLE_NAMESPACE);

    expect(manifest?.value).toMatchObject({
      style: { name: 'brand', themeMode: 'light' },
    });
  });

  it('按首次贡献顺序合并定义和组合，并对相同对象进行去重', () => {
    const structureA = structureOf('fixture-a');
    const structureB = structureOf('fixture-b');
    const presentationA = presentationOf('fixture-a');
    const presentationB = presentationOf('fixture-b');
    const formatterA = formatterOf('fixture-a');
    const formatterB = formatterOf('fixture-b');
    const visualScaleA = visualScaleOf('fixture-a');
    const visualScaleB = visualScaleOf('fixture-b');
    const themeNameA = themeNameOf('fixture-a');
    const themeNameB = themeNameOf('fixture-b');
    const compositeA = compositeOf('fixture', 'a');
    const compositeB = compositeOf('fixture', 'b');
    const first = createTableRuntimeContribution({
      lowerOptions: {
        structureDefinitions: [structureA],
        formatterDefinitions: [formatterA],
        presentationDefinitions: [presentationA],
        visualScaleDefinitions: [visualScaleA],
        tableThemeDefinitions: [themeNameA],
      },
      composites: [compositeA],
    });
    const second = createTableRuntimeContribution({
      lowerOptions: {
        structureDefinitions: [structureA, structureB],
        formatterDefinitions: [formatterA, formatterB],
        presentationDefinitions: [presentationA, presentationB],
        visualScaleDefinitions: [visualScaleA, visualScaleB],
        tableThemeDefinitions: [themeNameA, themeNameB],
      },
      composites: [compositeA, compositeB],
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
    expect(definitionsOf(first, second).composites?.slice(1)).toEqual([compositeA, compositeB]);
  });

  it.each([
    ['structure', { structureDefinitions: [structureOf('same')] }, { structureDefinitions: [structureOf('same')] }],
    ['formatter', { formatterDefinitions: [formatterOf('same')] }, { formatterDefinitions: [formatterOf('same')] }],
    [
      'presentation',
      { presentationDefinitions: [presentationOf('same')] },
      { presentationDefinitions: [presentationOf('same')] },
    ],
    [
      'visual scale',
      { visualScaleDefinitions: [visualScaleOf('same')] },
      { visualScaleDefinitions: [visualScaleOf('same')] },
    ],
    ['theme', { tableThemeDefinitions: [themeNameOf('same')] }, { tableThemeDefinitions: [themeNameOf('same')] }],
  ] as const)('对于具有不同定义对象的相同 %s 键，明确报错', (_label, firstOptions, secondOptions) => {
    const first = createTableRuntimeContribution({ lowerOptions: firstOptions });
    const second = createTableRuntimeContribution({ lowerOptions: secondOptions });

    expectProviderFailure(() => definitionsOf(first, second), /conflict/i);
  });

  it('对于具有不同对象的相同复合键，明确报错', () => {
    const first = createTableRuntimeContribution({
      composites: [compositeOf('fixture', 'same')],
    });
    const second = createTableRuntimeContribution({
      composites: [compositeOf('fixture', 'same')],
    });

    expectProviderFailure(() => definitionsOf(first, second), /nested definition conflict/i);
  });

  it('需要未来的非定义下沉选项来共享相同的对象标识', () => {
    const shared = {};
    const optionsOf = (futureMode: object) => ({ futureMode }) as TablesLoweringOptions & { futureMode: object };
    const first = createTableRuntimeContribution({ lowerOptions: optionsOf(shared) });
    const second = createTableRuntimeContribution({ lowerOptions: optionsOf(shared) });
    const conflict = createTableRuntimeContribution({ lowerOptions: optionsOf({}) });

    expect(() => definitionsOf(first, second)).not.toThrow();
    expectProviderFailure(() => definitionsOf(first, conflict), /lower option.*futureMode/i);
  });

  it('创建贡献时防御性地复制格式化程序定义数组', () => {
    const original = formatterOf('original');
    const late = formatterOf('late');
    const formatterDefinitions = [original];
    const first = createTableRuntimeContribution({ lowerOptions: { formatterDefinitions } });
    formatterDefinitions.push(late);
    const second = createTableRuntimeContribution({
      lowerOptions: { formatterDefinitions: [formatterOf('late')] },
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
  });

  it('创建贡献时防御性地复制视觉比例定义数组', () => {
    const original = visualScaleOf('original');
    const late = visualScaleOf('late');
    const visualScaleDefinitions = [original];
    const first = createTableRuntimeContribution({ lowerOptions: { visualScaleDefinitions } });
    visualScaleDefinitions.push(late);
    const second = createTableRuntimeContribution({
      lowerOptions: { visualScaleDefinitions: [visualScaleOf('late')] },
    });

    expect(() => definitionsOf(first, second)).not.toThrow();
  });

  it('冻结复制的运行时容器，而不克隆或冻结调用者定义', () => {
    const structure = structureOf('original-structure');
    const formatter = formatterOf('original-formatter');
    const presentation = presentationOf('original-presentation');
    const visualScale = visualScaleOf('original-scale');
    const themeName = themeNameOf('original-style');
    const composite = compositeOf('fixture', 'original');
    const structureDefinitions = [structure];
    const formatterDefinitions = [formatter];
    const presentationDefinitions = [presentation];
    const visualScaleDefinitions = [visualScale];
    const tableThemeDefinitions = [themeName];
    const composites = [composite];
    const originalFrozenStates = [structure, formatter, presentation, visualScale, themeName, composite].map(value =>
      Object.isFrozen(value),
    );

    const contribution = createTableRuntimeContribution({
      lowerOptions: {
        structureDefinitions,
        formatterDefinitions,
        presentationDefinitions,
        visualScaleDefinitions,
        tableThemeDefinitions,
      },
      composites,
    });
    const params = tableProviderOf(contribution)!.params;
    expect(params).toBeDefined();
    if (params === undefined) throw new Error('Table provider must contribute its parameters');

    structureDefinitions.push(structureOf('late-structure'));
    formatterDefinitions.push(formatterOf('late-formatter'));
    presentationDefinitions.push(presentationOf('late-presentation'));
    visualScaleDefinitions.push(visualScaleOf('late-scale'));
    tableThemeDefinitions.push(themeNameOf('late-style'));
    composites.push(compositeOf('fixture', 'late'));

    expect(Object.isFrozen(params)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions.structureDefinitions)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions.formatterDefinitions)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions.presentationDefinitions)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions.visualScaleDefinitions)).toBe(true);
    expect(Object.isFrozen(params.lowerOptions.tableThemeDefinitions)).toBe(true);
    expect(params.lowerOptions.structureDefinitions).toEqual([structure]);
    expect(params.lowerOptions.formatterDefinitions).toEqual([formatter]);
    expect(params.lowerOptions.presentationDefinitions).toEqual([presentation]);
    expect(params.lowerOptions.visualScaleDefinitions).toEqual([visualScale]);
    expect(params.lowerOptions.tableThemeDefinitions).toEqual([themeName]);
    expect(params.lowerOptions.structureDefinitions?.[0]).toBe(structure);
    expect(params.lowerOptions.formatterDefinitions?.[0]).toBe(formatter);
    expect(params.lowerOptions.presentationDefinitions?.[0]).toBe(presentation);
    expect(params.lowerOptions.visualScaleDefinitions?.[0]).toBe(visualScale);
    expect(params.lowerOptions.tableThemeDefinitions?.[0]).toBe(themeName);
    expect(definitionsOf(contribution).composites?.slice(1)).toEqual([composite]);
    expect(
      [structure, formatter, presentation, visualScale, themeName, composite].map(value => Object.isFrozen(value)),
    ).toEqual(originalFrozenStates);
  });
});
