import type { CompositeDefinition } from '@retikz/core';
import type { EmbeddableTier2Adapter } from '@retikz/react';
import type { IRTableSpec, TableStructureOutput } from '@retikz/table';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { Layout } from '@retikz/react';
import {
  createDetailTableSpec,
  createManualTableSpec,
  defineTableStructure,
  TABLE_NAMESPACE,
  TableComposite,
  TableRowKind,
} from '@retikz/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { DetailTable, ManualTable, Table } from '../../src';

const manualSpec = (id?: string): IRTableSpec =>
  createManualTableSpec({
    ...(id === undefined ? {} : { id }),
    rows: 1,
    columns: 1,
    cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Ada' } }],
  });

const adapterOf = <TProps,>(component: {
  embeddableAdapter?: EmbeddableTier2Adapter<TProps>;
}): EmbeddableTier2Adapter<TProps> => {
  const adapter = component.embeddableAdapter;
  if (adapter === undefined) throw new Error('expected embeddable adapter');
  return adapter;
};

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
    const customSpec: IRTableSpec = {
      namespace: TABLE_NAMESPACE,
      type: TableComposite.Table,
      structure: { kind: 'fixture' },
    };
    const detailSpec = createDetailTableSpec({
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
      rows: 1,
      columns: 1,
      cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value' as const, value: 98 } }],
    };
    const detailContribution = adapterOf(DetailTable).contribute(detailProps);
    const manualContribution = adapterOf(ManualTable).contribute(manualProps);

    expect(detailContribution.node).toEqual(
      createDetailTableSpec({
        id: 'people-table',
        dataRef: 'people',
        header: false,
        columns: [{ id: 'name', field: 'name', header: 'Name' }],
      }),
    );
    expect(manualContribution.node).toEqual(createManualTableSpec(manualProps));
    expect(renderToStaticMarkup(<DetailTable {...detailProps} />)).toContain('Ada');
    expect(renderToStaticMarkup(<DetailTable {...detailProps} />)).not.toContain('Name');
    expect(renderToStaticMarkup(<ManualTable {...manualProps} />)).toContain('98');
  });

  it('gives all three components independent embeddable adapters with stable runtime references', () => {
    const tableAdapter = adapterOf(Table);
    const detailAdapter = adapterOf(DetailTable);
    const manualAdapter = adapterOf(ManualTable);
    const tableContribution = tableAdapter.contribute({ spec: manualSpec('generic') });
    const detailContribution = detailAdapter.contribute({
      id: 'detail',
      dataRef: 'people',
      data: [],
      columns: [{ id: 'name', field: 'name' }],
    });
    const manualContribution = manualAdapter.contribute({
      id: 'manual',
      rows: 1,
      columns: 1,
      cells: [],
    });

    expect([tableAdapter.displayName, detailAdapter.displayName, manualAdapter.displayName]).toEqual([
      'Table',
      'DetailTable',
      'ManualTable',
    ]);
    expect(new Set([tableAdapter, detailAdapter, manualAdapter]).size).toBe(3);
    expect(tableContribution.node).toMatchObject({ id: 'generic' });
    expect(detailContribution.node).toMatchObject({ id: 'detail' });
    expect(manualContribution.node).toMatchObject({ id: 'manual' });
    expect(Object.keys(detailContribution.datasets)).toContain('@@retikz/table/runtime/detail');
    expect(tableContribution.makeComposites).toBe(detailContribution.makeComposites);
    expect(detailContribution.makeComposites).toBe(manualContribution.makeComposites);
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
        <ManualTable
          id="manual"
          rows={1}
          columns={1}
          cells={[{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Lin' } }]}
        />
      </Layout>,
    );

    expect(svg).toContain('Ada');
    expect(svg).toContain('Grace');
    expect(svg).toContain('Lin');
  });

  it('requires explicit unique ids and rejects onManifest in embedded mode', () => {
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <Table spec={manualSpec()} />
        </Layout>,
      ),
    ).toThrow(/embedded.*id.*non-empty/i);
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="same" rows={1} columns={1} cells={[]} />
          <ManualTable id="same" rows={1} columns={1} cells={[]} />
        </Layout>,
      ),
    ).toThrow(/reference.*@@retikz\/table\/runtime\/same/i);
    expect(() =>
      renderToStaticMarkup(
        <Layout>
          <ManualTable id="manifest" rows={1} columns={1} cells={[]} onManifest={vi.fn()} />
        </Layout>,
      ),
    ).toThrow(/onManifest.*lowerTableWithArtifacts/i);
  });

  it('passes nested composite definitions through standalone Table runtime', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge: CompositeDefinition = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema,
      expand: node => ({ type: 'node', position: [0, 0], text: node.label }),
    });
    const spec = createManualTableSpec({
      rows: 1,
      columns: 1,
      cells: [
        {
          address: { row: 0, column: 0 },
          payload: { kind: 'content', content: { namespace: 'fixture', type: 'badge', label: 'Nested' } },
        },
      ],
    });

    expect(renderToStaticMarkup(<Table spec={spec} composites={[badge]} />)).toContain('Nested');
  });
});
