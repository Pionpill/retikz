import type { IRTableSpec } from '@retikz/table';
import type { VanillaEmbedContext } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { createManualTableSpec } from '@retikz/table';
import { embed, figure, layer, normalizeFigureSpec, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createTableAdapter, embedTable } from '../../src';

const contextOf = (id: string): VanillaEmbedContext => ({
  id,
  kind: 'table',
  namespace: 'table',
  layerId: 'content',
  identityPath: ['content', id],
});

const detailSpec = (): IRTableSpec => ({
  namespace: 'table',
  type: 'table',
  data: { reference: 'people' },
  structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
});

describe('Table Vanilla adapter', () => {
  it('validates handwritten embed ids/specs and namespaces the Table root identity', () => {
    const adapter = createTableAdapter();
    const anonymous = createManualTableSpec({ rows: 1, columns: 1, cells: [] });
    const named = createManualTableSpec({ id: 'scores', rows: 1, columns: 1, cells: [] });

    expect(adapter.lower({ spec: anonymous }, contextOf('panel')).node).toMatchObject({ id: 'panel/table' });
    expect(adapter.lower({ spec: named }, contextOf('panel')).node).toMatchObject({ id: 'panel/scores' });
    expect(() => adapter.lower({ spec: anonymous }, contextOf(''))).toThrow(
      'table vanilla: embed id must be non-empty',
    );
    expect(() =>
      adapter.lower({ spec: { namespace: 'table' } as unknown as IRTableSpec }, contextOf('invalid')),
    ).toThrow();
  });

  it('returns the shared stable composite maker for every lower call', () => {
    const adapter = createTableAdapter();
    const spec = createManualTableSpec({ rows: 1, columns: 1, cells: [] });
    const first = adapter.lower({ spec }, contextOf('first'));
    const second = adapter.lower({ spec }, contextOf('second'));

    expect(first.makeComposites).toBe(second.makeComposites);
    expect(Object.keys(first.datasets)).toContain('@@retikz/table/runtime/first');
  });

  it('enters figure/layer SSR and reads each embed runtime data', () => {
    const adapter = createTableAdapter();
    const spec = detailSpec();
    const tableFigure = figure({
      layers: [
        layer('content', [
          embedTable('first', spec, { data: { people: [{ name: 'Ada' }] } }),
          embedTable('second', { ...spec, data: { reference: 'others' } }, { data: { others: [{ name: 'Lin' }] } }),
        ]),
      ],
    });
    const svg = renderToSvgString(tableFigure, { adapters: [adapter] });

    expect(svg).toContain('Ada');
    expect(svg).toContain('Lin');
    expect(normalizeFigureSpec(tableFigure, { adapters: [adapter] }).runtimeMeta.layers[0].childIds).toEqual([
      'first',
      'second',
    ]);
  });

  it('passes extra composites through the shared adapter contribution', () => {
    const adapter = createTableAdapter();
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
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
    const tableFigure = figure([embedTable('nested', spec, { composites: [badge] })]);

    expect(renderToSvgString(tableFigure, { adapters: [adapter] })).toContain('Nested');
  });

  it('rejects handwritten empty ids and duplicate embed identities through the standard runtime', () => {
    const adapter = createTableAdapter();
    const spec = createManualTableSpec({ rows: 1, columns: 1, cells: [] });
    const handwritten = embed('table', '', { spec });

    expect(() => normalizeFigureSpec(figure([handwritten]), { adapters: [adapter] })).toThrow(
      'table vanilla: embed id must be non-empty',
    );
    expect(() =>
      normalizeFigureSpec(figure([embedTable('same', spec), embedTable('same', spec)]), { adapters: [adapter] }),
    ).toThrow(/duplicate identity/i);
  });
});
