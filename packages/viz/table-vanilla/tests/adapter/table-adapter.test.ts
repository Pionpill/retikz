import type { IRDetailTableSpec } from '@retikz/table';
import type { InputEmbedContext } from '@retikz/vanilla';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { createManualTableSpec, TableSpecSchema } from '@retikz/table';
import { embed, layer, normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { embedTable, inputTableFromSpec, TableInputEmbedAdapter } from '../../src';

const contextOf = (id: string): InputEmbedContext => ({
  id,
  kind: 'table',
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
  it('validates handwritten embed ids and namespaces the Table root identity', () => {
    const anonymous = createManualTableSpec({ rows: [[null]] });
    const named = createManualTableSpec({ id: 'scores', rows: [[null]] });

    expect(
      TableInputEmbedAdapter.lower({ table: inputTableFromSpec(anonymous) }, contextOf('panel')).node,
    ).toMatchObject({
      id: 'panel/table',
    });
    expect(TableInputEmbedAdapter.lower({ table: inputTableFromSpec(named) }, contextOf('panel')).node).toMatchObject({
      id: 'panel/scores',
    });
    expect(() => TableInputEmbedAdapter.lower({ table: inputTableFromSpec(anonymous) }, contextOf(''))).toThrow(
      'table vanilla: embed id must be non-empty',
    );
  });

  it('contextualizes only the Table id and preserves root authoring fields', () => {
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

    const lowered = TableSpecSchema.parse(
      TableInputEmbedAdapter.lower({ table: inputTableFromSpec(spec) }, contextOf('panel')).node,
    );

    expect(lowered).toEqual({ ...spec, id: 'panel/scores' });
    expect(lowered.rules).toEqual(spec.rules);
    expect(lowered.encodings).toEqual(spec.encodings);
    expect(lowered.tableThemeTokens).toEqual(spec.tableThemeTokens);
  });

  it('returns table.table roots and the shared stable provider maker for every lower call', () => {
    const spec = createManualTableSpec({ rows: [[null]] });
    const first = TableInputEmbedAdapter.lower({ table: inputTableFromSpec(spec) }, contextOf('first'));
    const second = TableInputEmbedAdapter.lower({ table: inputTableFromSpec(spec) }, contextOf('second'));

    expect(first).not.toHaveProperty('datasets');
    expect(first).not.toHaveProperty('makeComposites');
    expect(first.providerDependencies.roots).toEqual([{ capability: 'composite', namespace: 'table', type: 'table' }]);
    expect(first.providerDependencies.providers[0]?.makeDefinition).toBe(
      second.providerDependencies.providers[0]?.makeDefinition,
    );
    expect(Object.keys(first.providerDependencies.providers[0]?.datasets ?? {})).toContain(
      '@@retikz/table/runtime/first',
    );
  });

  it('enters scene/layer SSR and reads each embed runtime data', () => {
    const spec = detailSpec();
    const inputScene = scene({
      layers: [
        layer('content', [
          embedTable('first', spec, { data: { people: [{ name: 'Ada' }] } }),
          embedTable('second', { ...spec, data: { reference: 'others' } }, { data: { others: [{ name: 'Lin' }] } }),
        ]),
      ],
    });
    const svg = renderToSvgString(inputScene, { adapters: [TableInputEmbedAdapter] });

    expect(svg).toContain('Ada');
    expect(svg).toContain('Lin');
    expect(normalizeScene(inputScene, { adapters: [TableInputEmbedAdapter] }).runtimeMeta.layers[0].childIds).toEqual([
      'first',
      'second',
    ]);
  });

  it('passes extra composites through the shared adapter contribution', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema,
      expand: node => ({ children: [{ type: 'node', position: [0, 0], text: node.label }] }),
    });
    const spec = createManualTableSpec({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });
    const inputScene = scene([embedTable('nested', spec, { composites: [badge] })]);

    expect(renderToSvgString(inputScene, { adapters: [TableInputEmbedAdapter] })).toContain('Nested');
  });

  it('rejects handwritten empty ids and duplicate embed identities through the standard runtime', () => {
    const spec = createManualTableSpec({ rows: [[null]] });
    const handwritten = embed('table', '', { table: inputTableFromSpec(spec) });

    expect(() => normalizeScene(scene([handwritten]), { adapters: [TableInputEmbedAdapter] })).toThrow(
      'table vanilla: embed id must be non-empty',
    );
    expect(() =>
      normalizeScene(scene([embedTable('same', spec), embedTable('same', spec)]), {
        adapters: [TableInputEmbedAdapter],
      }),
    ).toThrow(/duplicate identity/i);
  });
});
