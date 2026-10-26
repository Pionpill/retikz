import type { AnyCompositeDefinition } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineTheme } from '@retikz/core';
import { Layout, ThemeProvider } from '@retikz/react';
import type { IRTable, TableStructureOutput } from '@retikz/table';
import {
  createDetailTableIR,
  createManualTableIR,
  defineCellVisualScale,
  defineTableStructure,
  defineTableTheme,
  TABLE_NAMESPACE,
  TableSchema,
  TableComposite,
  TableRowKind,
} from '@retikz/table';
import type { InputTable } from '@retikz/table-vanilla';
import { TableInputEmbedAdapter } from '@retikz/table-vanilla';
import type { InputEmbedContext } from '@retikz/vanilla';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { literal, strictObject, string } from 'zod';

import { DetailTable, ManualTable, Table, TableThemeProvider } from '../../src';

const cleanCoreTheme = defineTheme({
  name: 'clean',
  resolve: () => ({
    categorical: ['#112233'],
  }),
});

const cleanTableTheme = defineTableTheme({
  name: 'clean',
  resolve: () => ({
    defaults: {
      defaultAppearance: {
        body: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
        columnHeader: { background: { fill: 'none' }, content: { defaults: { style: { color: 'currentColor' } } } },
      },
      layout: { borders: { horizontal: { kind: 'none' } } },
    },
  }),
});

const manualSpec = (id?: string): IRTable =>
  createManualTableIR({
    ...(id === undefined ? {} : { id }),
    rows: [['Ada']],
  });

type InputTableComponent = {
  inputEmbedAdapter?: unknown;
  createInputEmbedProps?: (props: Readonly<Record<string, unknown>>) => InputTable<unknown>;
};

/** 创建 Table Vanilla adapter 的嵌入上下文 */
const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
  layerId: 'default',
  identityPath: ['default', id],
});

/** 读取 React 根组件构造的唯一 Table Vanilla 输入 */
const inputOf = <TProps,>(component: InputTableComponent, props: TProps): InputTable<unknown> => {
  if (component.inputEmbedAdapter !== TableInputEmbedAdapter) throw new Error('expected Table Vanilla adapter');
  if (component.createInputEmbedProps === undefined) throw new Error('expected Table Vanilla input factory');
  return component.createInputEmbedProps(props as Readonly<Record<string, unknown>>);
};

/** 经 Vanilla adapter 取得 React authoring 的 Core contribution */
const contributionOf = <TProps,>(component: InputTableComponent, props: TProps, id: string) =>
  TableInputEmbedAdapter.lower(inputOf(component, props), contextOf(id));

describe('Table React 元件', () => {
  it('通过相同的 Table 运行时呈现通用手册、详细信息和自定义 Table 规格', () => {
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
      schema: strictObject({ kind: literal('fixture') }),
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

  it('在独立运行时和嵌入式运行时中保持 Table 默认值、编码和自定义视觉比例相同', () => {
    const visualScale = defineCellVisualScale({
      name: 'react-palette',
      optionsSchema: strictObject({}),
      resolve: (_options, _values, context) => ({
        of: () => context.categoricalColors?.[0] ?? '#000000',
        legendForm: 'swatch',
        domain: [1],
        range: [context.categoricalColors?.[0] ?? '#000000'],
      }),
    });
    const spec = createManualTableIR({
      id: 'encoded',
      rows: [[1]],
      defaultVisual: { categorical: ['#123456'] },
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

  it('使用有效的 Core 主题选择不同的 Table 预设', () => {
    const defaultTheme = renderToStaticMarkup(<Table spec={createManualTableIR({ rows: [['Ada']] })} />);
    const clean = renderToStaticMarkup(
      <ThemeProvider theme={{ name: 'clean', mode: 'light' }} themeDefinitions={[cleanCoreTheme]}>
        <TableThemeProvider tableThemeDefinitions={[cleanTableTheme]}>
          <Table spec={createManualTableIR({ rows: [['Ada']] })} />
        </TableThemeProvider>
      </ThemeProvider>,
    );

    expect(defaultTheme).toContain('#ffffff');
    expect(defaultTheme).toContain('#18181b');
    expect(clean).not.toContain('#18181b');
    expect(clean).not.toContain('#e4e4e7');
  });

  it('保持 DetailTable 和 ManualTable 编写与共享普通构造函数相同', () => {
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

  it('通过具有稳定运行时引用的共享 Vanilla 适配器路由所有三个组件', () => {
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
    expect(detailContribution.providerDependencies.providers[0]?.params).toHaveProperty('lowerOptions');
    expect(tableContribution.providerDependencies.providers[0]?.makeDefinition).toBe(
      detailContribution.providerDependencies.providers[0]?.makeDefinition,
    );
    expect(detailContribution.providerDependencies.providers[0]?.makeDefinition).toBe(
      manualContribution.providerDependencies.providers[0]?.makeDefinition,
    );
  });

  it('将所有三个组件渲染为嵌入式 Layout 子组件，而不调用其渲染函数', () => {
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

  it('允许匿名嵌入表，同时保留显式 ID 和宿主属性诊断', () => {
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

    expect(renderBlankId).toThrow(/failed payload validation/i);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="same" rows={[[null]]} />
          <ManualTable id="same" rows={[[null]]} />
        </Layout>,
      );
      expect(warning.mock.calls.flat().join(' ')).toContain('DUPLICATE_NODE_ID');
    } finally {
      warning.mockRestore();
    }
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="manifest" rows={[[null]]} onManifest={vi.fn()} />
        </Layout>,
      ),
    ).toThrow(/onManifest.*outer.*Layout/i);
  });

  it('在嵌入模式下拒绝仅独立的宿主 props', () => {
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

  it('拒绝所有三个嵌入式编写条目中的 containerStyle', () => {
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

  it('通过独立的 Table 运行时传递嵌套复合定义', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: literal('fixture'),
      type: literal('badge'),
      label: string(),
    });
    const badge: AnyCompositeDefinition = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema,
      compile: node => ({ children: [{ type: 'node', position: [0, 0], text: node.label }] }),
    });
    const spec = createManualTableIR({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });

    expect(renderToStaticMarkup(<Table spec={spec} composites={[badge]} />)).toContain('Nested');
  });
});

it.each([false, true])('通过嵌入=%s 的 Table React 传递类别定义', embedded => {
  const spec = TableSchema.parse({
    namespace: 'table',
    type: 'table',
    data: { reference: 'rows', model: [{ name: 'value', type: 'categorical', order: 'custom' }] },
    structure: { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
  });
  const element = (
    <Table
      spec={spec}
      data={{ rows: [{ value: '10.18' }, { value: '10.2' }] }}
      fieldOrderDefinitions={[{ name: 'custom', compare: () => 0 }]}
    />
  );
  const html = renderToStaticMarkup(embedded ? <Layout>{element}</Layout> : element);
  expect(html).toContain('10.18');
  expect(html.indexOf('10.18')).toBeLessThan(html.indexOf('10.2'));
});
