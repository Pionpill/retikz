import type { IRDetailTableSpec, IRTableSpec } from '@retikz/table';
import type { VanillaEmbedContext } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { createManualTableSpec, TableSpecSchema } from '@retikz/table';
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

const detailSpec = (): IRDetailTableSpec => ({
  namespace: 'table',
  type: 'table',
  data: { reference: 'people' },
  structure: { kind: 'detail', header: false, columns: [{ id: 'name', field: 'name' }] },
});

describe('Table Vanilla adapter', () => {
  it('validates handwritten embed ids/specs and namespaces the Table root identity', () => {
    const adapter = createTableAdapter();
    const anonymous = createManualTableSpec({ rows: [[null]] });
    const named = createManualTableSpec({ id: 'scores', rows: [[null]] });

    expect(adapter.lower({ spec: anonymous }, contextOf('panel')).node).toMatchObject({ id: 'panel/table' });
    expect(adapter.lower({ spec: named }, contextOf('panel')).node).toMatchObject({ id: 'panel/scores' });
    expect(() => adapter.lower({ spec: anonymous }, contextOf(''))).toThrow(
      'table vanilla: embed id must be non-empty',
    );
    expect(() =>
      adapter.lower({ spec: { namespace: 'table' } as unknown as IRTableSpec }, contextOf('invalid')),
    ).toThrow();
  });

  it('contextualizes only the Table id and preserves root authoring fields', () => {
    const adapter = createTableAdapter();
    const spec = createManualTableSpec({
      id: 'scores',
      rows: [[98]],
      rules: [{ selector: { cellIds: ['cell.r0.c0'] }, appearance: { content: { color: '#b91c1c' } } }],
      encodings: [
        {
          id: 'score-color',
          selector: { locations: ['body'] },
          channel: 'backgroundFill',
          scale: { name: 'ordinal-color' },
          legend: false,
        },
      ],
      tableThemeTokens: { 'cell.content.color': '#fafafa' },
    });

    const lowered = TableSpecSchema.parse(adapter.lower({ spec }, contextOf('panel')).node);

    expect(lowered).toEqual({ ...spec, id: 'panel/scores' });
    expect(lowered.rules).toEqual(spec.rules);
    expect(lowered.encodings).toEqual(spec.encodings);
    expect(lowered.tableThemeTokens).toEqual(spec.tableThemeTokens);
  });

  it('returns the shared stable composite maker for every lower call', () => {
    const adapter = createTableAdapter();
    const spec = createManualTableSpec({ rows: [[null]] });
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
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });
    const tableFigure = figure([embedTable('nested', spec, { composites: [badge] })]);

    expect(renderToSvgString(tableFigure, { adapters: [adapter] })).toContain('Nested');
  });

  it('rejects handwritten empty ids and duplicate embed identities through the standard runtime', () => {
    const adapter = createTableAdapter();
    const spec = createManualTableSpec({ rows: [[null]] });
    const handwritten = embed('table', '', { spec });

    expect(() => normalizeFigureSpec(figure([handwritten]), { adapters: [adapter] })).toThrow(
      'table vanilla: embed id must be non-empty',
    );
    expect(() =>
      normalizeFigureSpec(figure([embedTable('same', spec), embedTable('same', spec)]), { adapters: [adapter] }),
    ).toThrow(/duplicate identity/i);
  });
});
