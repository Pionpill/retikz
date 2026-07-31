import type { CellPresentationInput } from '@retikz/table';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { defineCellFormatter, defineCellPresentation } from '@retikz/table';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { detailTable, manualTable, renderTable } from '../../src';

describe('renderTable', () => {
  it('renders anonymous manual specs without data and detail specs with runtime data in SSR', () => {
    const manual = manualTable({
      rows: [['Ada']],
    });
    const detail = detailTable({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });

    expect(typeof window).toBe('undefined');
    expect(renderTable(manual)).toContain('Ada');
    expect(renderTable(manual, { artifacts: true }).manifest.cells[0].source).toEqual({
      kind: 'manual',
      row: 0,
      column: 0,
    });
    expect(renderTable(detail, { data: { people: [{ name: 'Grace' }] } })).toContain('Grace');
  });

  it('returns manifest artifacts only when requested and keeps output size outside Table geometry', () => {
    const spec = manualTable({
      rows: [
        [null, null],
        [null, null],
      ],
    });
    const plain = renderTable(spec, { output: { width: 640, height: 480 } });
    const artifact = renderTable(spec, { artifacts: true, output: { width: 320, height: 240 } });

    expect(typeof plain).toBe('string');
    expect(plain).toContain('width="640"');
    expect(plain).toContain('height="480"');
    expect(artifact.svg).toContain('width="320"');
    expect(artifact.svg).toContain('height="240"');
    expect(artifact.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 64 });
  });

  it('passes formatter definitions through the shared lowering options in SSR', () => {
    const prefix = defineCellFormatter({
      name: 'prefix',
      optionsSchema: z.strictObject({ prefix: z.string() }),
      format: ({ value }, options) => `${options.prefix}${String(value)}`,
    });
    const spec = manualTable({
      rows: [[{ value: 7, formatter: { name: 'prefix', options: { prefix: '#' } } }]],
    });

    expect(renderTable(spec, { lowerOptions: { formatterDefinitions: [prefix] } })).toContain('#7');
  });

  it('passes the new Presentation ABI and semantic border appearance through SSR', () => {
    const observed: Array<CellPresentationInput> = [];
    const inspect = defineCellPresentation({
      name: 'inspect-appearance',
      optionsSchema: z.strictObject({}),
      present: input => {
        observed.push(input);
        return {
          type: 'node',
          position: [0, 0],
          text: `${input.context.cellId}:${String(input.rawValue)}>${String(input.value)}`,
        };
      },
    });
    const spec = manualTable({
      rows: [
        [
          { id: 'plain', value: 1, presentation: { name: 'inspect-appearance' } },
          {
            id: 'bordered',
            value: 2,
            presentation: { name: 'inspect-appearance' },
            layout: { borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } } },
          },
        ],
      ],
    });
    const result = renderTable(spec, {
      artifacts: true,
      lowerOptions: { presentationDefinitions: [inspect] },
    });

    expect(result.svg).toContain('plain:1&gt;1');
    expect(result.svg).toContain('bordered:2&gt;2');
    expect(observed).toMatchObject([
      {
        rawValue: 1,
        value: 1,
        context: { cellId: 'plain', rowIndex: 0, columnIndex: 0 },
        appearance: {},
      },
      {
        rawValue: 2,
        value: 2,
        context: { cellId: 'bordered', rowIndex: 0, columnIndex: 1 },
        appearance: { borders: { bottom: { kind: 'line', stroke: '#2563eb', width: 2 } } },
      },
    ]);
    expect(result.manifest.borders).toContainEqual(
      expect.objectContaining({ style: expect.objectContaining({ stroke: '#2563eb', width: 2 }) }),
    );
  });

  it('accepts Core options under compile and rejects the removed top-level composites field', () => {
    const spec = manualTable({ rows: [[null]] });

    expect(renderTable(spec, { compile: { padding: 0 }, animation: { enabled: false } })).toContain('<svg');
    expect(() => renderTable(spec, { composites: [] } as never)).toThrow(/composites.*compile\.composites/i);
    expect(() => renderTable(spec, { composites: undefined } as never)).toThrow(/composites.*compile\.composites/i);
  });

  it('compiles nested Tier 2 content through compile.composites in the same SSR result', () => {
    const badgeSchema = CompositeBaseSchema.extend({
      namespace: z.literal('fixture'),
      type: z.literal('badge'),
      label: z.string(),
    });
    const badge = defineComposite({
      namespace: 'fixture',
      type: 'badge',
      schema: badgeSchema,
      expand: node => ({ type: 'node', position: [0, 0], text: node.label }),
    });
    const spec = manualTable({
      rows: [[{ content: { namespace: 'fixture', type: 'badge', label: 'Nested' } }]],
    });

    expect(renderTable(spec, { compile: { composites: [badge] } })).toContain('Nested');
  });
});
