import type { IRChild } from '@retikz/core';
import type { InputTable } from '@retikz/table-vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite, defineThemeStyle, resolveDefaultCoreThemeColors } from '@retikz/core';
import {
  createDetailTableIR,
  createManualTableIR,
  defineCellFormatter,
  defineCellPresentation,
  defineTableStructure,
  defineTableThemeStyle,
  getDefaultTableThemePreset,
} from '@retikz/table';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import { Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

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
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => InputTable;
};

/** 读取 React 根组件构造的唯一 Table Vanilla 输入 */
const inputOf = <TProps,>(component: InputTableComponent, props: TProps): InputTable => {
  if (component.inputEmbedAdapter !== TableInputEmbedAdapter) throw new Error('expected Table Vanilla adapter');
  if (component.createInputEmbedProps === undefined) throw new Error('expected Table Vanilla input factory');
  return component.createInputEmbedProps(props as Readonly<Record<string, unknown>>);
};

/** 经 Vanilla adapter 取得当前 React authoring 的 Core contribution */
const contributionOf = <TProps,>(component: InputTableComponent, props: TProps, id: string) =>
  TableInputEmbedAdapter.lower(inputOf(component, props), contextOf(id));

describe('Table React composition authoring collectors', () => {
  it('collects ordered DetailColumn markers through Fragments, arrays, and empty nodes', () => {
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

  it('collects a rectangular row matrix and preserves explicit row kinds', () => {
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

  it('pads empty Rows to the inferred width without emitting row kinds', () => {
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

  it('places span-aware markers at the first unoccupied slot and pads covered coordinates', () => {
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

  it('rejects marker spans that overflow rows, cross row kinds, or overlap future occupancy', () => {
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

  it('rejects invalid DetailTable children', () => {
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

  it('rejects invalid ManualTable and Row child grammars', () => {
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

  it('rejects missing Rows and all-empty marker matrices whose width cannot be inferred', () => {
    expect(() => buildManualStructure(null)).toThrow(/require.*at least one Row/i);
    expect(() => buildManualStructure(<Row />)).toThrow(/require.*at least one Cell/i);
  });

  it('treats an undefined content presentation as omitted', () => {
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

describe('Table React composition root integration', () => {
  it('exports composition markers from the package root without exposing collectors', () => {
    expect(TableReact.DetailColumn).toBe(DetailColumn);
    expect(TableReact.Row).toBe(Row);
    expect(TableReact.Cell).toBe(Cell);
    expect(TableReact).not.toHaveProperty('buildDetailColumns');
    expect(TableReact).not.toHaveProperty('buildManualStructure');
  });

  it('normalizes DetailTable props and DetailColumn children to the same embedded node and standalone body', () => {
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

  it('preserves every DetailTable root prop in DetailColumn children mode', () => {
    const structureDefinitions = [
      defineTableStructure({
        schema: z.strictObject({ kind: z.literal('root-props-structure') }),
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
        optionsSchema: z.strictObject({}),
        present: () => content,
      }),
    ];
    const formatterDefinitions = [
      defineCellFormatter({
        name: 'root-props-formatter',
        optionsSchema: z.strictObject({}),
        format: input => input.value,
      }),
    ];
    const themeStyles = [
      defineThemeStyle({
        name: 'root-props-theme',
        resolve: ({ mode }) => resolveDefaultCoreThemeColors(mode),
      }),
    ];
    const tableThemeStyles = [
      defineTableThemeStyle({
        name: 'root-props-theme',
        resolve: theme => getDefaultTableThemePreset(theme.mode),
      }),
    ];
    const compositeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('root-props'),
      type: z.literal('content'),
    });
    const composites = [
      defineComposite({
        namespace: 'root-props',
        type: 'content',
        schema: compositeSchema,
        expand: () => ({ children: [content] }),
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
      theme: { style: 'academic', mode: 'dark' },
      themeStyles,
      tableThemeTokens: { 'cell.content.color': '#fafafa' },
      children: <DetailColumn id="name" field="name" formatter={{ name: 'root-props-formatter' }} />,
      structureDefinitions,
      formatterDefinitions,
      presentationDefinitions,
      tableThemeStyles,
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
        tableThemeTokens: { 'cell.content.color': '#fafafa' },
      },
    });
    expect(runtime.table).not.toHaveProperty('namespace');
    expect(runtime.table).not.toHaveProperty('type');
    expect(runtime.datasets).toMatchObject({ people: [{ name: 'Ada' }] });
    expect(runtime.lowerOptions).toEqual({
      structureDefinitions,
      formatterDefinitions,
      presentationDefinitions,
      tableThemeStyles,
      visualScaleDefinitions: undefined,
    });
    expect(runtime.composites).toBe(composites);
    expect(runtime.onManifest).toBe(onManifest);
    expect(runtime.display).toEqual({
      width: 640,
      height: 320,
      theme: { style: 'academic', mode: 'dark' },
      themeStyles,
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

  it('normalizes ManualTable props and Row children to the same embedded node and standalone values', () => {
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

  it('preserves every ManualTable root authoring field in rows and marker modes', () => {
    const root = {
      id: 'manual-root-fields',
      rules: [{ selector: { locations: ['body' as const] }, appearance: { content: { color: '#b91c1c' } } }],
      encodings: [
        {
          id: 'score-color',
          selector: { locations: ['body' as const] },
          channel: 'backgroundFill' as const,
          scale: { name: 'ordinal-color' },
          legend: false as const,
        },
      ],
      tableThemeTokens: { 'cell.content.color': '#fafafa' },
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

  it('uses rule-selected custom formatter definitions in standalone rendering', () => {
    const formatter = defineCellFormatter({
      name: 'rule-prefix',
      optionsSchema: z.strictObject({}),
      format: input => `#${String(input.value)}`,
    });
    const output = renderToStaticMarkup(
      <ManualTable
        rows={[[7]]}
        rules={[{ selector: { cellIds: ['cell.r0.c0'] }, formatter: { name: 'rule-prefix' } }]}
        formatterDefinitions={[formatter]}
      />,
    );

    expect(output).toContain('#7');
  });

  it('keeps DetailTable children data injection and embedded runtime reference', () => {
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
    expect(tableProvider.datasets).toMatchObject({ people: [{ name: 'Grace' }] });
    expect(Object.keys(tableProvider.datasets)).toContain('@@retikz/table/runtime/detail-runtime-reference');
    expect(renderToStaticMarkup(<DetailTable {...props} />)).toContain('Grace');
  });
});
