import type { AnyCompositeDefinition } from '@retikz/core';
import type { IRTable, TableStructureOutput } from '@retikz/table';
import type { InputTable } from '@retikz/table-vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite, defineThemeStyle } from '@retikz/core';
import { Layout, ThemeProvider } from '@retikz/react';
import {
  createDetailTableIR,
  createManualTableIR,
  defineCellVisualScale,
  defineTableStructure,
  defineTableThemeStyle,
  getDefaultTableThemePreset,
  TABLE_NAMESPACE,
  TableComposite,
  TableRowKind,
} from '@retikz/table';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { DetailTable, ManualTable, Table, TableThemeProvider } from '../../src';

const cleanCoreTheme = defineThemeStyle({
  name: 'clean',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00', guide: '#666666' },
    categorical: ['#112233'],
  }),
});

const cleanTableTheme = defineTableThemeStyle({
  name: 'clean',
  resolve: theme => ({
    ...getDefaultTableThemePreset(theme.mode),
    'cell.background.fill': null,
    'cell.content.color': null,
    'cell.content.font.family': null,
    'cell.content.font.weight': null,
    'columnHeader.background.fill': null,
    'columnHeader.content.color': null,
    'columnHeader.content.font.family': null,
    'columnHeader.content.font.weight': null,
    'table.border.horizontal': null,
    'columnHeader.border.bottom': null,
  }),
});

const manualSpec = (id?: string): IRTable =>
  createManualTableIR({
    ...(id === undefined ? {} : { id }),
    rows: [['Ada']],
  });

type InputTableComponent = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => InputTable;
};

/** 创建 Table Vanilla adapter 的嵌入上下文 */
const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'default',
  identityPath: ['default', id],
});

/** 读取 React 根组件构造的唯一 Table Vanilla 输入 */
const inputOf = <TProps,>(component: InputTableComponent, props: TProps): InputTable => {
  if (component.inputEmbedAdapter !== TableInputEmbedAdapter) throw new Error('expected Table Vanilla adapter');
  if (component.createInputEmbedProps === undefined) throw new Error('expected Table Vanilla input factory');
  return component.createInputEmbedProps(props as Readonly<Record<string, unknown>>);
};

/** 经 Vanilla adapter 取得 React authoring 的 Core contribution */
const contributionOf = <TProps,>(component: InputTableComponent, props: TProps, id: string) =>
  TableInputEmbedAdapter.lower(inputOf(component, props), contextOf(id));

describe('Table React components', () => {
  it('renders generic manual, detail, and custom Table specs through the same Table runtime', () => {
    const customOutput: TableStructureOutput = {
      rows: [{ id: 'row.0', kind: TableRowKind.Body }],
      columns: [{ id: 'column.0' }],
      cells: [
        {
          id: 'cell.0',
          row: 0,
          column: 0,
          payload: { kind: 'value', value: 'Custom' },
          location: 'body',
          roles: ['data'],
          source: { kind: 'generated', structureKind: 'fixture' },
        },
      ],
    };
    const customDefinition = defineTableStructure({
      schema: z.strictObject({ kind: z.literal('fixture') }),
      build: () => customOutput,
    });
    const customSpec: IRTable = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'fixture' },
    };
    const detailSpec = createDetailTableIR({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });

    expect(renderToStaticMarkup(<Table spec={manualSpec()} />)).toContain('Ada');
    expect(renderToStaticMarkup(<Table spec={detailSpec} data={{ people: [{ name: 'Grace' }] }} />)).toContain('Grace');
    expect(renderToStaticMarkup(<Table spec={customSpec} structureDefinitions={[customDefinition]} />)).toContain(
      'Custom',
    );
  });

  it('keeps Table tokens, encodings, and custom visual scales equal in standalone and embedded runtimes', () => {
    const visualScale = defineCellVisualScale({
      name: 'react-palette',
      optionsSchema: z.strictObject({}),
      resolve: (_options, _values, context) => ({
        of: () => context.categoricalColors[0],
        legendForm: 'swatch',
        domain: [1],
        range: [context.categoricalColors[0]],
      }),
    });
    const spec = createManualTableIR({
      id: 'encoded',
      rows: [[1]],
      tableThemeTokens: { 'data.categorical': ['#123456'] },
      encodings: [
        {
          id: 'palette',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'react-palette' },
          legend: { title: 'Palette' },
        },
      ],
    });

    const standalone = renderToStaticMarkup(<Table spec={spec} visualScaleDefinitions={[visualScale]} />);
    const embedded = renderToStaticMarkup(
      <Layout>
        <Table spec={spec} visualScaleDefinitions={[visualScale]} />
      </Layout>,
    );

    expect(standalone).toContain('#123456');
    expect(embedded).toContain('#123456');
    expect(embedded).toContain('1');
  });

  it('uses the effective Core Theme to select a different Table preset', () => {
    const defaultTheme = renderToStaticMarkup(<Table spec={createManualTableIR({ rows: [['Ada']] })} />);
    const clean = renderToStaticMarkup(
      <ThemeProvider theme={{ style: 'clean', mode: 'light' }} themeStyles={[cleanCoreTheme]}>
        <TableThemeProvider tableThemeStyles={[cleanTableTheme]}>
          <Table spec={createManualTableIR({ rows: [['Ada']] })} />
        </TableThemeProvider>
      </ThemeProvider>,
    );

    expect(defaultTheme).toContain('#ffffff');
    expect(defaultTheme).toContain('#18181b');
    expect(clean).not.toContain('#18181b');
    expect(clean).not.toContain('#e4e4e7');
  });

  it('surfaces invalid custom Legend resolution diagnostics through the generic Table entry', () => {
    const invalid = defineCellVisualScale({
      name: 'react-invalid-legend',
      optionsSchema: z.strictObject({}),
      resolve: () =>
        ({
          of: () => 'red',
          legendForm: 'invalid',
          domain: [1],
          range: ['red'],
        }) as never,
    });
    const spec = createManualTableIR({
      id: 'invalid-legend',
      rows: [[1]],
      encodings: [
        {
          id: 'invalid',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'react-invalid-legend' },
          legend: {},
        },
      ],
    });

    expect(() => renderToStaticMarkup(<Table spec={spec} visualScaleDefinitions={[invalid]} />)).toThrow(/legendForm/i);
  });

  it('keeps DetailTable and ManualTable authoring equal to the shared plain constructors', () => {
    const detailProps = {
      id: 'people-table',
      dataRef: 'people',
      data: [{ name: 'Ada' }],
      header: false,
      columns: [{ id: 'name', field: 'name', header: 'Name' }],
    };
    const manualProps = {
      id: 'score-table',
      rows: [[98]],
    };
    const detailContribution = contributionOf(DetailTable, detailProps, 'people-table');
    const manualContribution = contributionOf(ManualTable, manualProps, 'score-table');

    expect(detailContribution.node).toEqual(
      createDetailTableIR({
        id: 'people-table',
        dataRef: 'people',
        header: false,
        columns: [{ id: 'name', field: 'name', header: 'Name' }],
      }),
    );
    expect(manualContribution.node).toEqual(createManualTableIR(manualProps));
    expect(renderToStaticMarkup(<DetailTable {...detailProps} />)).toContain('Ada');
    expect(renderToStaticMarkup(<DetailTable {...detailProps} />)).not.toContain('Name');
    expect(renderToStaticMarkup(<ManualTable {...manualProps} />)).toContain('98');
  });

  it('routes all three components through the shared Vanilla adapter with stable runtime references', () => {
    const tableContribution = contributionOf(Table, { spec: manualSpec('generic') }, 'generic');
    const detailContribution = contributionOf(
      DetailTable,
      {
        id: 'detail',
        dataRef: 'people',
        data: [],
        columns: [{ id: 'name', field: 'name' }],
      },
      'detail',
    );
    const manualContribution = contributionOf(
      ManualTable,
      {
        id: 'manual',
        rows: [[null]],
      },
      'manual',
    );

    expect(Table.inputEmbedAdapter).toBe(TableInputEmbedAdapter);
    expect(DetailTable.inputEmbedAdapter).toBe(TableInputEmbedAdapter);
    expect(ManualTable.inputEmbedAdapter).toBe(TableInputEmbedAdapter);
    expect(tableContribution.node).toMatchObject({ id: 'generic' });
    expect(detailContribution.node).toMatchObject({ id: 'detail' });
    expect(manualContribution.node).toMatchObject({ id: 'manual' });
    expect(Object.keys(detailContribution.providerDependencies.providers[0]?.datasets ?? {})).toContain(
      '@@retikz/table/runtime/detail',
    );
    expect(tableContribution.providerDependencies.providers[0]?.makeDefinition).toBe(
      detailContribution.providerDependencies.providers[0]?.makeDefinition,
    );
    expect(detailContribution.providerDependencies.providers[0]?.makeDefinition).toBe(
      manualContribution.providerDependencies.providers[0]?.makeDefinition,
    );
  });

  it('renders all three components as embedded Layout children without calling their render functions', () => {
    const svg = renderToStaticMarkup(
      <Layout>
        <Table spec={manualSpec('generic')} />
        <DetailTable
          id="detail"
          dataRef="people"
          data={[{ name: 'Grace' }]}
          header={false}
          columns={[{ id: 'name', field: 'name' }]}
        />
        <ManualTable id="manual" rows={[['Lin']]} />
      </Layout>,
    );

    expect(svg).toContain('Ada');
    expect(svg).toContain('Grace');
    expect(svg).toContain('Lin');
  });

  it('allows anonymous embedded Tables while retaining explicit-id and host-prop diagnostics', () => {
    expect(
      renderToStaticMarkup(
        <Layout>
          <Table spec={manualSpec()} />
        </Layout>,
      ),
    ).toContain('Ada');
    const renderBlankId = () =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id={'\u2003'} rows={[[null]]} />
        </Layout>,
      );
    expect(renderBlankId).toThrow(/id|non-whitespace/i);
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="same" rows={[[null]]} />
          <ManualTable id="same" rows={[[null]]} />
        </Layout>,
      ),
    ).toThrow('normalizeScene: duplicate identity "same" at default > same');
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="manifest" rows={[[null]]} onManifest={vi.fn()} />
        </Layout>,
      ),
    ).toThrow(/onManifest.*outer.*Layout/i);
  });

  it('rejects standalone-only host props together in embedded mode', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable
            id="embedded-host"
            rows={[[null]]}
            width={320}
            viewBox={{ x: 0, y: 0, width: 100, height: 100 }}
            onManifest={vi.fn()}
          />
        </Layout>,
      ),
    ).toThrow(/width.*viewBox.*onManifest.*outer.*Layout/i);

    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable
            id="embedded-explicit-undefined"
            rows={[[null]]}
            width={undefined}
            onManifest={undefined}
            {...({ embeddables: undefined } as { embeddables?: unknown })}
          />
        </Layout>,
      ),
    ).toThrow(/width.*onManifest.*embeddables.*outer.*Layout/i);
  });

  it('rejects containerStyle from all three embedded authoring entries', () => {
    const containerStyle = { color: 'rebeccapurple' };

    expect(() => inputOf(Table, { spec: manualSpec('generic-style'), containerStyle })).toThrow(
      /containerStyle.*outer.*Layout/i,
    );
    expect(() =>
      inputOf(DetailTable, {
        id: 'detail-style',
        dataRef: 'people',
        data: [],
        columns: [{ id: 'name', field: 'name' }],
        containerStyle,
      }),
    ).toThrow(/containerStyle.*outer.*Layout/i);
    expect(() => inputOf(ManualTable, { id: 'manual-style', rows: [[1]], containerStyle })).toThrow(
      /containerStyle.*outer.*Layout/i,
    );
  });

  it('passes nested composite definitions through standalone Table runtime', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge: AnyCompositeDefinition = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema,
      expand: node => ({ children: [{ type: 'node', position: [0, 0], text: node.label }] }),
    });
    const spec = createManualTableIR({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });

    expect(renderToStaticMarkup(<Table spec={spec} composites={[badge]} />)).toContain('Nested');
  });
});
