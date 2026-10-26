import type { IRChild } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineTheme } from '@retikz/core';
import {
  compileTable,
  createDetailTableIR,
  createManualTableIR,
  defineCellFormatter,
  defineCellPresentation,
  defineTableStructure,
  defineTableTheme,
  TableSchema,
} from '@retikz/table';
import type { InputTable } from '@retikz/table-vanilla';
import { manualTable, TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';
import { Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { literal, strictObject } from 'zod';

import type { DetailTableProps } from '../../src';
import * as TableReact from '../../src';
import { DetailTable, ManualTable } from '../../src';
import { buildDetailColumns } from '../../src/components/build-detail-columns';
import { buildManualStructure } from '../../src/components/build-manual-structure';
import { Cell } from '../../src/components/cell';
import { DetailColumn } from '../../src/components/detail-column';
import { Row } from '../../src/components/row';
import { ReactTableRuntimeKind, resolveReactTableRuntime } from '../../src/table-runtime';

const content: IRChild = { type: 'node', position: [0, 0], text: 'Badge' };

/** 创建 Table Vanilla adapter 的嵌入上下文 */
const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'default',
  identityPath: ['default', id],
});

type InputTableComponent = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => InputTable<unknown>;
};

/** 读取 React 根组件构造的唯一 Table Vanilla 输入 */
const inputOf = <TProps,>(component: InputTableComponent, props: TProps): InputTable<unknown> => {
  if (component.inputEmbedAdapter !== TableInputEmbedAdapter) throw new Error('expected Table Vanilla adapter');
  if (component.createInputEmbedProps === undefined) throw new Error('expected Table Vanilla input factory');
  return component.createInputEmbedProps(props as Readonly<Record<string, unknown>>);
};

/** 经 Vanilla adapter 取得当前 React authoring 的 Core contribution */
const contributionOf = <TProps,>(component: InputTableComponent, props: TProps, id: string) =>
  TableInputEmbedAdapter.lower(inputOf(component, props), contextOf(id));

describe('Table React 组成编写收集器', () => {
  it('通过 Fragments、数组和空节点收集有序的 DetailColumn 标记', () => {
    const columns = buildDetailColumns(
      <>
        <DetailColumn id="name" field="name" header="Name" headerLayout={{ padding: 2 }} />
        <Fragment>
          {null}
          {[false, <DetailColumn key="score" id="score" field="score" bodyLayout={{ wrap: true }} />]}
        </Fragment>
        {undefined}
      </>,
    );

    expect(columns).toEqual([
      { id: 'name', field: 'name', header: 'Name', headerLayout: { padding: 2 } },
      { id: 'score', field: 'score', bodyLayout: { wrap: true } },
    ]);
    expect(createDetailTableIR({ dataRef: 'scores', header: false, columns })).toEqual(
      createDetailTableIR({
        dataRef: 'scores',
        header: false,
        columns: [
          { id: 'name', field: 'name', header: 'Name', headerLayout: { padding: 2 } },
          { id: 'score', field: 'score', bodyLayout: { wrap: true } },
        ],
      }),
    );
  });

  it('收集矩形行矩阵并保留显式行类型', () => {
    const structure = buildManualStructure(
      <>
        <Row kind="columnHeader">
          <Cell formatter={{ name: 'identity' }}>Name</Cell>
          <Cell value={false} formatter={{ name: 'boolean' }} presentation={{ name: 'text' }} />
        </Row>
        <Row>
          <Cell content={content} />
          <Cell>{null}</Cell>
        </Row>
      </>,
    );

    expect(structure).toEqual({
      rowKinds: ['columnHeader', 'body'],
      rows: [
        [
          { value: 'Name', formatter: { name: 'identity' } },
          { value: false, formatter: { name: 'boolean' }, presentation: { name: 'text' } },
        ],
        [{ content }, { value: null }],
      ],
    });
    expect(createManualTableIR(structure)).toEqual(
      createManualTableIR({
        rowKinds: ['columnHeader', 'body'],
        rows: [
          [
            { value: 'Name', formatter: { name: 'identity' } },
            { value: false, formatter: { name: 'boolean' }, presentation: { name: 'text' } },
          ],
          [{ content }, { value: null }],
        ],
      }),
    );
  });

  it('将空行填充到推断的宽度，而不发出行类型', () => {
    expect(
      buildManualStructure(
        <>
          <Row />
          {[
            null,
            <Row key="body">
              <Cell value={1} />
            </Row>,
          ]}
        </>,
      ),
    ).toEqual({ rows: [[null], [{ value: 1 }]] });
  });

  it('将跨度感知标记放置在第一个未占用的槽位和焊盘覆盖的坐标处', () => {
    expect(
      buildManualStructure(
        <>
          <Row>
            <Cell span={{ rows: 2, columns: 2 }}>A</Cell>
            <Cell>B</Cell>
          </Row>
          <Row>
            <Cell>C</Cell>
          </Row>
        </>,
      ),
    ).toEqual({
      rows: [
        [{ value: 'A', span: { rows: 2, columns: 2 } }, null, { value: 'B' }],
        [null, null, { value: 'C' }],
      ],
    });
  });

  it('拒绝溢出行、跨行类型或重叠未来占用的标记跨度', () => {
    expect(() =>
      buildManualStructure(
        <Row>
          <Cell span={{ rows: 2 }}>tall</Cell>
        </Row>,
      ),
    ).toThrow(/span.*out of bounds/i);
    expect(() =>
      buildManualStructure(
        <>
          <Row kind="columnHeader">
            <Cell span={{ rows: 2 }}>header</Cell>
          </Row>
          <Row kind="body" />
        </>,
      ),
    ).toThrow(/span.*row kind/i);
    expect(() =>
      buildManualStructure(
        <>
          <Row>
            <Cell>A</Cell>
            <Cell span={{ rows: 2 }}>occupied</Cell>
          </Row>
          <Row>
            <Cell span={{ columns: 2 }}>overlap</Cell>
          </Row>
        </>,
      ),
    ).toThrow(/span.*overlaps/i);
  });

  it('拒绝无效的 DetailTable 子项', () => {
    expect(() => buildDetailColumns(<span>name</span>)).toThrow(
      'table react: DetailTable children only accept DetailColumn',
    );
    expect(() =>
      buildDetailColumns(
        <>
          {null}
          {false}
        </>,
      ),
    ).toThrow('table react: DetailTable children require at least one DetailColumn');
  });

  it('拒绝无效的 ManualTable 和 Row 子语法', () => {
    expect(() => buildManualStructure(<Cell value="orphan" />)).toThrow(
      'table react: ManualTable children only accept Row',
    );
    expect(() =>
      buildManualStructure(
        <Row>
          <span />
        </Row>,
      ),
    ).toThrow('table react: Row children only accept Cell');
  });

  it('拒绝缺失行和宽度无法推断的全空标记矩阵', () => {
    expect(() => buildManualStructure(null)).toThrow(/require.*at least one Row/i);
    expect(() => buildManualStructure(<Row />)).toThrow(/require.*at least one Cell/i);
  });

  it('将 undefined 的内容呈现视为省略', () => {
    const withoutPresentation = buildManualStructure(
      <Row>
        <Cell content={content} />
      </Row>,
    );
    const withUndefinedPresentation = buildManualStructure(
      <Row>
        <Cell content={content} presentation={undefined} />
      </Row>,
    );

    expect(withUndefinedPresentation).toEqual(withoutPresentation);
  });
});

describe('Table React 组成根集成', () => {
  it('在 Direct、Vanilla 和 React 编写中保留一个等效的稀疏默认测试数据', () => {
    const input = {
      id: 'sparse-defaults-parity',
      defaultCellLayout: { body: { padding: 3 }, columnHeader: { padding: 4 } },
      rows: [[1]],
      defaultTable: { defaultAppearance: { body: { content: { defaults: { style: { color: '#111111' } } } } } },
      defaultAppearance: { body: { background: { fill: '#f8fafc', fillOpacity: 0 } } },
      layout: { borders: { horizontal: { kind: 'line' as const, stroke: '#cbd5e1', width: 1 } } },
      defaultVisual: { categorical: ['#2563eb'], sequential: ['#eff6ff', '#1d4ed8'] as [string, string] },
    };
    const direct = createManualTableIR(input);
    const vanilla = manualTable(input);
    const react = TableSchema.parse(contributionOf(ManualTable, input, 'sparse-defaults-parity').node);

    expect(vanilla).toEqual(direct);
    expect(react).toEqual(direct);

    const directResult = compileTable(direct, {}, { compile: { padding: 0 } });

    expect(compileTable(vanilla, {}, { compile: { padding: 0 } })).toEqual(directResult);
    expect(compileTable(react, {}, { compile: { padding: 0 } })).toEqual(directResult);
  });

  it('从包根导出合成标记而不暴露收集器', () => {
    expect(TableReact.DetailColumn).toBe(DetailColumn);
    expect(TableReact.Row).toBe(Row);
    expect(TableReact.Cell).toBe(Cell);
    expect(TableReact).not.toHaveProperty('buildDetailColumns');
    expect(TableReact).not.toHaveProperty('buildManualStructure');
  });

  it('将 DetailTable props 和 DetailColumn 子项标准化为相同的嵌入节点和独立主体', () => {
    const propsMode = {
      id: 'detail-composition',
      dataRef: 'people',
      data: [{ name: 'Ada' }],
      header: false,
      model: [{ name: 'name' }],
      layout: { columnSize: { kind: 'fixed' as const, value: 96 } },
      meta: { source: 'authoring-test' },
      columns: [{ id: 'name', field: 'name', header: 'Name' }],
    };
    const childrenMode = {
      id: 'detail-composition',
      dataRef: 'people',
      data: [{ name: 'Ada' }],
      header: false,
      model: [{ name: 'name' }],
      layout: { columnSize: { kind: 'fixed' as const, value: 96 } },
      meta: { source: 'authoring-test' },
      children: <DetailColumn id="name" field="name" header="Name" />,
    };

    expect(inputOf(DetailTable, childrenMode).table).toEqual(inputOf(DetailTable, propsMode).table);
    expect(renderToStaticMarkup(<DetailTable {...childrenMode} />)).toBe(
      renderToStaticMarkup(<DetailTable {...propsMode} />),
    );
  });

  it('在 DetailColumn 儿童模式下保留每个 DetailTable 根 props', () => {
    const structureDefinitions = [
      defineTableStructure({
        schema: strictObject({ kind: literal('root-props-structure') }),
        build: () => ({
          rows: [{ id: 'row.0', kind: 'body' }],
          columns: [{ id: 'column.0' }],
          cells: [],
        }),
      }),
    ];
    const presentationDefinitions = [
      defineCellPresentation({
        name: 'root-props-presentation',
        optionsSchema: strictObject({}),
        present: () => content,
      }),
    ];
    const formatterDefinitions = [
      defineCellFormatter({
        name: 'root-props-formatter',
        optionsSchema: strictObject({}),
        format: input => input.value,
      }),
    ];
    const themeDefinitions = [
      defineTheme({
        name: 'root-props-theme',
        resolve: () => ({}),
      }),
    ];
    const tableThemeDefinitions = [
      defineTableTheme({
        name: 'root-props-theme',
        resolve: () => ({}),
      }),
    ];
    const compositeSchema = CompositeBaseSchema.extend({
      namespace: literal('root-props'),
      type: literal('content'),
    });
    const composites = [
      defineComposite({
        namespace: 'root-props',
        type: 'content',
        schema: compositeSchema,
        compile: () => ({ children: [content] }),
      }),
    ];
    const onManifest = vi.fn();
    const containerStyle = { color: 'rebeccapurple' };
    const rules: NonNullable<DetailTableProps['rules']> = [
      { selector: { fields: ['name'] }, appearance: { background: { fill: '#f3f4f6' } } },
    ];
    const encodings: NonNullable<DetailTableProps['encodings']> = [
      {
        id: 'name-color',
        selector: { fields: ['name'] },
        channel: 'backgroundFill',
        scale: { name: 'ordinal-color' },
        legend: false,
      },
    ];
    const runtime = resolveReactTableRuntime(ReactTableRuntimeKind.Detail, {
      id: 'detail-root-props',
      dataRef: 'people',
      data: [{ name: 'Ada' }],
      model: [{ name: 'name' }],
      header: false,
      layout: { columnSize: { kind: 'fixed', value: 96 } },
      meta: { source: 'root-props-test' },
      rules,
      encodings,
      theme: { name: 'academic', mode: 'dark' },
      themeDefinitions,
      defaultAppearance: { body: { content: { defaults: { style: { color: '#fafafa' } } } } },
      defaultCellLayout: { body: { padding: 0 } },
      children: <DetailColumn id="name" field="name" formatter={{ name: 'root-props-formatter' }} />,
      structureDefinitions,
      formatterDefinitions,
      presentationDefinitions,
      tableThemeDefinitions,
      composites,
      onManifest,
      width: 640,
      height: 320,
      className: 'table-fixture',
      containerStyle,
      renderer: 'svg',
      viewBox: { x: 0, y: 0, width: 320, height: 180 },
      animate: false,
      snapshotAt: 120,
      idPrefix: 'table-test',
      nodeDistance: 28,
      fontSize: 14,
    });

    expect(runtime.table).toMatchObject({
      kind: 'detail',
      input: {
        id: 'detail-root-props',
        dataRef: 'people',
        model: [{ name: 'name' }],
        header: false,
        columns: [{ id: 'name', field: 'name', formatter: { name: 'root-props-formatter' } }],
        layout: { columnSize: { kind: 'fixed', value: 96 } },
        meta: { source: 'root-props-test' },
        rules,
        encodings,
        defaultAppearance: { body: { content: { defaults: { style: { color: '#fafafa' } } } } },
        defaultCellLayout: { body: { padding: 0 } },
      },
    });
    expect(runtime.table).not.toHaveProperty('namespace');
    expect(runtime.table).not.toHaveProperty('type');
    expect(runtime.datasets).toMatchObject({ people: [{ name: 'Ada' }] });
    expect(runtime.lowerOptions).toEqual({
      structureDefinitions,
      formatterDefinitions,
      presentationDefinitions,
      tableThemeDefinitions,
      visualScaleDefinitions: undefined,
    });
    expect(runtime.composites).toBe(composites);
    expect(runtime.onManifest).toBe(onManifest);
    expect(runtime.display).toEqual({
      width: 640,
      height: 320,
      theme: { name: 'academic', mode: 'dark' },
      themeDefinitions,
      className: 'table-fixture',
      style: containerStyle,
      renderer: 'svg',
      viewBox: { x: 0, y: 0, width: 320, height: 180 },
      animate: false,
      snapshotAt: 120,
      idPrefix: 'table-test',
      nodeDistance: 28,
      fontSize: 14,
    });
  });

  it('将 ManualTable 属性和 Row 子项标准化为相同的嵌入节点和独立值', () => {
    const propsMode = {
      id: 'manual-composition',
      rows: [
        [{ value: 'Name' }, { value: 'Score' }],
        [{ value: 'Ada' }, { value: 98 }],
      ],
      rowKinds: ['columnHeader' as const, 'body' as const],
    };
    const childrenMode = {
      id: 'manual-composition',
      children: (
        <>
          <Row kind="columnHeader">
            <Cell>Name</Cell>
            <Cell>Score</Cell>
          </Row>
          <Row>
            <Cell>Ada</Cell>
            <Cell value={98} />
          </Row>
        </>
      ),
    };

    expect(inputOf(ManualTable, childrenMode).table).toEqual(inputOf(ManualTable, propsMode).table);

    const output = renderToStaticMarkup(<ManualTable {...childrenMode} />);

    expect(output).toBe(renderToStaticMarkup(<ManualTable {...propsMode} />));
    expect(output).toContain('Ada');
    expect(output).toContain('98');
  });

  it('以行和标记模式保留每个 ManualTable 根编写字段', () => {
    const root = {
      id: 'manual-root-fields',
      rules: [
        {
          selector: { locations: ['body' as const] },
          appearance: { content: { defaults: { style: { color: '#b91c1c' } } } },
        },
      ],
      encodings: [
        {
          id: 'score-color',
          selector: { locations: ['body' as const] },
          channel: 'backgroundFill' as const,
          scale: { name: 'ordinal-color' },
          legend: false as const,
        },
      ],
      defaultAppearance: { body: { content: { defaults: { style: { color: '#fafafa' } } } } },
      defaultCellLayout: { body: { padding: 0 } },
    };
    const propsRuntime = resolveReactTableRuntime(ReactTableRuntimeKind.Manual, {
      ...root,
      rows: [[{ value: 98, formatter: { name: 'number' } }]],
    });
    const markerRuntime = resolveReactTableRuntime(ReactTableRuntimeKind.Manual, {
      ...root,
      children: (
        <Row>
          <Cell value={98} formatter={{ name: 'number' }} />
        </Row>
      ),
    });

    expect(markerRuntime.table).toEqual(propsRuntime.table);
    expect(markerRuntime.table).toMatchObject({
      kind: 'manual',
      input: {
        ...root,
        rows: [[{ value: 98, formatter: { name: 'number' } }]],
      },
    });
  });

  it('在独立渲染中使用规则选择的自定义格式化程序定义', () => {
    const formatter = defineCellFormatter({
      name: 'rule-prefix',
      optionsSchema: strictObject({}),
      format: input => `#${String(input.value)}`,
    });
    const output = renderToStaticMarkup(
      <ManualTable
        rows={[[7]]}
        rules={[{ selector: { rowIndices: [0], columnIndices: [0] }, formatter: { name: 'rule-prefix' } }]}
        formatterDefinitions={[formatter]}
      />,
    );

    expect(output).toContain('#7');
  });

  it('保留 DetailTable 子级数据注入和嵌入式运行时引用', () => {
    const props = {
      id: 'detail-runtime-reference',
      dataRef: 'people',
      data: [{ name: 'Grace' }],
      header: false,
      children: <DetailColumn id="name" field="name" />,
    };
    const contribution = contributionOf(DetailTable, props, 'detail-runtime-reference');

    expect(contribution.node).toEqual(
      createDetailTableIR({
        id: 'detail-runtime-reference',
        dataRef: 'people',
        header: false,
        columns: [{ id: 'name', field: 'name' }],
      }),
    );

    const tableProvider = contribution.providerDependencies.providers[0];

    expect(tableProvider.params).toMatchObject({ datasets: { people: [{ name: 'Grace' }] } });
    expect(renderToStaticMarkup(<DetailTable {...props} />)).toContain('Grace');
  });
});
