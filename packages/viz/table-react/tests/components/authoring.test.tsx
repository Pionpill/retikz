import type { IRChild } from '@retikz/core';
import type { EmbeddableTier2Adapter } from '@retikz/react';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import {
  createDetailTableSpec,
  createManualTableSpec,
  defineCellPresentation,
  defineTableStructure,
} from '@retikz/table';
import { Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { DetailTableProps, ManualTableProps } from '../../src';
import type { CellProps } from '../../src/components/cell';
import type { DetailColumnProps } from '../../src/components/detail-column';

import * as TableReact from '../../src';
import { DetailTable, ManualTable } from '../../src';
import { buildDetailColumns } from '../../src/components/build-detail-columns';
import { buildManualStructure } from '../../src/components/build-manual-structure';
import { Cell } from '../../src/components/cell';
import { DetailColumn } from '../../src/components/detail-column';
import { Row } from '../../src/components/row';
import { ReactTableRuntimeKind, resolveReactTableRuntime } from '../../src/table-runtime';

const content: IRChild = { type: 'node', position: [0, 0], text: 'Badge' };

/** 读取根组件的嵌入式 adapter */
const adapterOf = <TProps,>(component: {
  embeddableAdapter?: EmbeddableTier2Adapter<TProps>;
}): EmbeddableTier2Adapter<TProps> => {
  const adapter = component.embeddableAdapter;
  if (adapter === undefined) throw new Error('expected embeddable adapter');
  return adapter;
};

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
    expect(createDetailTableSpec({ dataRef: 'scores', header: false, columns })).toEqual(
      createDetailTableSpec({
        dataRef: 'scores',
        header: false,
        columns: [
          { id: 'name', field: 'name', header: 'Name', headerLayout: { padding: 2 } },
          { id: 'score', field: 'score', bodyLayout: { wrap: true } },
        ],
      }),
    );
  });

  it('collects addressed manual Cells and preserves explicit row kinds', () => {
    const structure = buildManualStructure(
      <>
        <Row kind="columnHeader">
          <Cell>Name</Cell>
          <Cell value={false} presentation={{ name: 'text' }} />
        </Row>
        <Row>
          <Cell content={content} />
          <Cell>{null}</Cell>
        </Row>
      </>,
      2,
      2,
    );

    expect(structure).toEqual({
      rowKinds: ['columnHeader', 'body'],
      cells: [
        { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Name' } },
        {
          address: { row: 0, column: 1 },
          payload: { kind: 'value', value: false, presentation: { name: 'text' } },
        },
        { address: { row: 1, column: 0 }, payload: { kind: 'content', content } },
        { address: { row: 1, column: 1 }, payload: { kind: 'value', value: null } },
      ],
    });
    expect(createManualTableSpec({ rows: 2, columns: 2, ...structure })).toEqual(
      createManualTableSpec({
        rows: 2,
        columns: 2,
        rowKinds: ['columnHeader', 'body'],
        cells: [
          { address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Name' } },
          {
            address: { row: 0, column: 1 },
            payload: { kind: 'value', value: false, presentation: { name: 'text' } },
          },
          { address: { row: 1, column: 0 }, payload: { kind: 'content', content } },
          { address: { row: 1, column: 1 }, payload: { kind: 'value', value: null } },
        ],
      }),
    );
  });

  it('keeps empty Rows and trailing sparse Cells valid without emitting row kinds', () => {
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
        2,
        3,
      ),
    ).toEqual({
      cells: [{ address: { row: 1, column: 0 }, payload: { kind: 'value', value: 1 } }],
    });
  });

  it('places span-aware markers in the first unoccupied slot across future rows', () => {
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
        2,
        3,
      ).cells.map(cell => ({
        address: cell.address,
        span: cell.span,
        value: cell.payload.kind === 'value' ? cell.payload.value : null,
      })),
    ).toEqual([
      { address: { row: 0, column: 0 }, span: { rows: 2, columns: 2 }, value: 'A' },
      { address: { row: 0, column: 2 }, span: undefined, value: 'B' },
      { address: { row: 1, column: 2 }, span: undefined, value: 'C' },
    ]);
  });

  it('rejects marker spans that overflow, cross row kinds, or leave no free slot', () => {
    expect(() =>
      buildManualStructure(
        <Row>
          <Cell span={{ columns: 2 }}>wide</Cell>
        </Row>,
        1,
        1,
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
        2,
        1,
      ),
    ).toThrow(/span.*row kind/i);
    expect(() =>
      buildManualStructure(
        <>
          <Row>
            <Cell span={{ rows: 2 }}>occupied</Cell>
          </Row>
          <Row>
            <Cell>extra</Cell>
          </Row>
        </>,
        2,
        1,
      ),
    ).toThrow(/no unoccupied Cell slot/i);
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
    const invalidMarker = (
      <DetailColumn {...({ id: 'name', field: 'name', children: 'bad' } as unknown as DetailColumnProps)} />
    );
    expect(() => buildDetailColumns(invalidMarker)).toThrow(
      'table react: DetailTable children only accept DetailColumn',
    );
  });

  it('rejects invalid ManualTable and Row child grammars', () => {
    expect(() => buildManualStructure(<Cell value="orphan" />, 1, 1)).toThrow(
      'table react: ManualTable children only accept Row',
    );
    expect(() =>
      buildManualStructure(
        <Row>
          <span />
        </Row>,
        1,
        1,
      ),
    ).toThrow('table react: Row children only accept Cell');
  });

  it('rejects row and Cell counts outside explicit dimensions', () => {
    expect(() => buildManualStructure(<Row />, 2, 1)).toThrow(/table react: ManualTable rows expected 2, received 1/);
    expect(() =>
      buildManualStructure(
        <Row>
          <Cell value="A" />
          <Cell value="B" />
        </Row>,
        1,
        1,
      ),
    ).toThrow(/table react: Row 0 received 2 Cell children, columns is 1/);
  });

  it('rejects Cell payload sources that are absent, multiple, or React elements', () => {
    const absent = <Cell {...({} as CellProps)} />;
    const multiple = <Cell {...({ value: 'A', content, children: 'B' } as unknown as CellProps)} />;
    const invalid = <Cell {...({ children: <span>A</span> } as unknown as CellProps)} />;

    expect(() => buildManualStructure(<Row>{absent}</Row>, 1, 1)).toThrow(
      /table react: Cell at row 0, column 0 requires exactly one payload source/,
    );
    expect(() => buildManualStructure(<Row>{multiple}</Row>, 1, 1)).toThrow(
      /table react: Cell at row 0, column 0 requires exactly one payload source/,
    );
    expect(() => buildManualStructure(<Row>{invalid}</Row>, 1, 1)).toThrow(
      /table react: Cell at row 0, column 0 value must be a JSON scalar/,
    );
  });

  it('rejects presentation paired with a content Cell payload', () => {
    const invalid = <Cell {...({ content, presentation: { name: 'text' } } as unknown as CellProps)} />;

    expect(() => buildManualStructure(<Row>{invalid}</Row>, 1, 1)).toThrow(
      'table react: Cell at row 0, column 0 content cannot be combined with presentation',
    );
  });

  it('treats an undefined content presentation as omitted', () => {
    const withoutPresentation = buildManualStructure(
      <Row>
        <Cell content={content} />
      </Row>,
      1,
      1,
    );
    const withUndefinedPresentation = buildManualStructure(
      <Row>
        <Cell content={content} presentation={undefined} />
      </Row>,
      1,
      1,
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

    expect(adapterOf(DetailTable).contribute(childrenMode).node).toEqual(
      adapterOf(DetailTable).contribute(propsMode).node,
    );
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
    const compositeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('root-props'),
      type: z.literal('content'),
    });
    const composites = [
      defineComposite({
        namespace: 'root-props',
        type: 'content',
        schema: compositeSchema,
        expand: () => content,
      }),
    ];
    const onManifest = vi.fn();
    const style = { color: 'rebeccapurple' };
    const runtime = resolveReactTableRuntime(ReactTableRuntimeKind.Detail, {
      id: 'detail-root-props',
      dataRef: 'people',
      data: [{ name: 'Ada' }],
      model: [{ name: 'name' }],
      header: false,
      layout: { columnSize: { kind: 'fixed', value: 96 } },
      meta: { source: 'root-props-test' },
      children: <DetailColumn id="name" field="name" />,
      structureDefinitions,
      presentationDefinitions,
      composites,
      onManifest,
      width: 640,
      height: 320,
      className: 'table-fixture',
      style,
      renderer: 'svg',
      viewBox: { x: 0, y: 0, width: 320, height: 180 },
      animate: false,
      snapshotAt: 120,
      idPrefix: 'table-test',
      nodeDistance: 28,
      fontSize: 14,
    });

    expect(runtime.spec).toMatchObject({
      id: 'detail-root-props',
      data: { reference: 'people', model: [{ name: 'name' }] },
      structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
      layout: { columnSize: { kind: 'fixed', value: 96 } },
      meta: { source: 'root-props-test' },
    });
    expect(runtime.datasets).toMatchObject({ people: [{ name: 'Ada' }] });
    expect(runtime.lowerOptions).toEqual({
      structureDefinitions,
      presentationDefinitions,
    });
    expect(runtime.composites).toBe(composites);
    expect(runtime.onManifest).toBe(onManifest);
    expect(runtime.display).toEqual({
      width: 640,
      height: 320,
      className: 'table-fixture',
      style,
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
      rows: 2,
      columns: 2,
      rowKinds: ['columnHeader' as const, 'body' as const],
      cells: [
        { address: { row: 0, column: 0 }, payload: { kind: 'value' as const, value: 'Name' } },
        { address: { row: 0, column: 1 }, payload: { kind: 'value' as const, value: 'Score' } },
        { address: { row: 1, column: 0 }, payload: { kind: 'value' as const, value: 'Ada' } },
        { address: { row: 1, column: 1 }, payload: { kind: 'value' as const, value: 98 } },
      ],
    };
    const childrenMode = {
      id: 'manual-composition',
      rows: 2,
      columns: 2,
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

    expect(adapterOf(ManualTable).contribute(childrenMode).node).toEqual(
      adapterOf(ManualTable).contribute(propsMode).node,
    );
    const output = renderToStaticMarkup(<ManualTable {...childrenMode} />);
    expect(output).toBe(renderToStaticMarkup(<ManualTable {...propsMode} />));
    expect(output).toContain('Ada');
    expect(output).toContain('98');
  });

  it('keeps DetailTable children data injection and embedded runtime reference', () => {
    const props = {
      id: 'detail-runtime-reference',
      dataRef: 'people',
      data: [{ name: 'Grace' }],
      header: false,
      children: <DetailColumn id="name" field="name" />,
    };
    const contribution = adapterOf(DetailTable).contribute(props);

    expect(contribution.node).toEqual(
      createDetailTableSpec({
        id: 'detail-runtime-reference',
        dataRef: 'people',
        header: false,
        columns: [{ id: 'name', field: 'name' }],
      }),
    );
    expect(contribution.datasets).toMatchObject({ people: [{ name: 'Grace' }] });
    expect(Object.keys(contribution.datasets)).toContain('@@retikz/table/runtime/detail-runtime-reference');
    expect(renderToStaticMarkup(<DetailTable {...props} />)).toContain('Grace');
  });

  it('rejects mixed and absent DetailTable structure sources through the shared runtime', () => {
    const adapter = adapterOf(DetailTable);
    const shared = { id: 'detail-invalid', dataRef: 'people', data: [] };
    const child = <DetailColumn id="name" field="name" />;

    expect(() =>
      adapter.contribute({
        ...shared,
        columns: [{ id: 'name', field: 'name' }],
        children: child,
      } as unknown as DetailTableProps),
    ).toThrow('table react: DetailTable columns cannot be mixed with DetailColumn children');
    expect(() => adapter.contribute(shared as unknown as DetailTableProps)).toThrow(
      'table react: DetailTable requires columns or DetailColumn children',
    );
  });

  it('rejects mixed and absent ManualTable structure sources through the shared runtime', () => {
    const adapter = adapterOf(ManualTable);
    const shared = { id: 'manual-invalid', rows: 1, columns: 1 };
    const children = (
      <Row>
        <Cell value="Ada" />
      </Row>
    );
    const cells = [{ address: { row: 0, column: 0 }, payload: { kind: 'value' as const, value: 'Ada' } }];

    expect(() => adapter.contribute({ ...shared, cells, children } as unknown as ManualTableProps)).toThrow(
      'table react: ManualTable Row children cannot be mixed with cells or rowKinds',
    );
    expect(() =>
      adapter.contribute({ ...shared, rowKinds: ['body'], cells: [], children } as unknown as ManualTableProps),
    ).toThrow('table react: ManualTable Row children cannot be mixed with cells or rowKinds');
    expect(() => adapter.contribute(shared as unknown as ManualTableProps)).toThrow(
      'table react: ManualTable requires cells or Row children',
    );
  });
});
