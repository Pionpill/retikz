import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { detailTable, manualTable, renderTable } from '../../src';

describe('renderTable', () => {
  it('renders anonymous manual specs without data and detail specs with runtime data in SSR', () => {
    const manual = manualTable({
      rows: 1,
      columns: 1,
      cells: [{ address: { row: 0, column: 0 }, payload: { kind: 'value', value: 'Ada' } }],
    });
    const detail = detailTable({
      dataRef: 'people',
      header: false,
      columns: [{ id: 'name', field: 'name' }],
    });

    expect(typeof window).toBe('undefined');
    expect(renderTable(manual)).toContain('Ada');
    expect(renderTable(detail, { data: { people: [{ name: 'Grace' }] } })).toContain('Grace');
  });

  it('returns manifest artifacts only when requested and keeps output size outside Table geometry', () => {
    const spec = manualTable({ rows: 2, columns: 2, cells: [] });
    const plain = renderTable(spec, { output: { width: 640, height: 480 } });
    const artifact = renderTable(spec, { artifacts: true, output: { width: 320, height: 240 } });

    expect(typeof plain).toBe('string');
    expect(plain).toContain('width="640"');
    expect(plain).toContain('height="480"');
    expect(artifact.svg).toContain('width="320"');
    expect(artifact.svg).toContain('height="240"');
    expect(artifact.manifest.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 64 });
  });

  it('accepts Core options under compile and rejects the removed top-level composites field', () => {
    const spec = manualTable({ rows: 1, columns: 1, cells: [] });

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
      rows: 1,
      columns: 1,
      cells: [
        {
          address: { row: 0, column: 0 },
          payload: { kind: 'content', content: { namespace: 'fixture', type: 'badge', label: 'Nested' } },
        },
      ],
    });

    expect(renderTable(spec, { compile: { composites: [badge] } })).toContain('Nested');
  });
});
