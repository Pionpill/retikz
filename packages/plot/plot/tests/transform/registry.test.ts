import { compileToScene } from '@retikz/core';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { type ExternalRow, type PlotSpec, PlotSpecSchema, PlotTransform } from '../../src/schemas';
import { collectSourceFields } from '../../src/pipeline/source-fields';
import { readSourceIndices, tagSourceIndex } from '../../src/pipeline/provenance';
import { type AnyTransformDefinition, applyTransforms, defineTransform, extractTransformKind, resolveTransformRegistry } from '../../src';
import { lowerPlots } from '../../src/pipeline/expand';

const doubleDefinition = defineTransform({
  schema: z.object({
    kind: z.literal('double'),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.as]: Number(row[operation.field]) * 2,
    })),
});

const groupSumDefinition = defineTransform({
  schema: z.object({
    kind: z.literal('group-sum'),
    groupBy: z.string().min(1),
    field: z.string().min(1),
    as: z.string().min(1),
  }),
  inputFields: operation => [operation.groupBy, operation.field],
  outputFields: operation => [operation.as],
  apply: (rows, operation, context) => {
    const groups = new Map<string, Array<ExternalRow>>();
    for (const row of rows) {
      const key = String(row[operation.groupBy]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return [...groups.entries()].map(([key, members]) =>
      context.groupProvenance(
        {
          [operation.groupBy]: key,
          [operation.as]: members.reduce((sum, row) => sum + Number(row[operation.field] ?? 0), 0),
        },
        members,
      ),
    );
  },
});

const compile = (spec: PlotSpec, datasets: Record<string, Array<Record<string, unknown>>>, definitions = [doubleDefinition]) =>
  compileToScene({ version: 1, type: 'scene', children: [spec] }, { composites: lowerPlots(datasets, { transformDefinitions: definitions }) });

const pointSpec = (transform: PlotSpec['transform']): PlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: {
      reference: 'd',
      model: [
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ],
    },
    transform,
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x2' }, y: { field: 'y' } } }],
  });

describe('transform registry (alpha.12 ADR-06)', () => {
  it('builtin_registry_contains_all_transform_kinds', () => {
    const registry = resolveTransformRegistry();
    expect([...registry.keys()].sort()).toEqual(Object.values(PlotTransform).sort());
  });

  it('define_transform_preserves_schema_and_extracts_kind', () => {
    expect(extractTransformKind(doubleDefinition.schema)).toBe('double');
    expect(doubleDefinition.schema.parse({ kind: 'double', field: 'x', as: 'x2' })).toEqual({ kind: 'double', field: 'x', as: 'x2' });
  });

  it('duplicate_custom_or_builtin_registration_throws', () => {
    expect(() => resolveTransformRegistry([doubleDefinition, doubleDefinition])).toThrow(/duplicate transform registration/i);
    const builtinCollision = defineTransform({
      schema: z.object({ kind: z.literal('sort') }),
      apply: rows => rows,
    });
    expect(() => resolveTransformRegistry([builtinCollision])).toThrow(/duplicate transform registration/i);
  });

  it('malformed_registration_schema_throws', () => {
    const nonObject: AnyTransformDefinition = {
      schema: z.string(),
      apply: rows => rows,
    };
    const missingLiteralKind: AnyTransformDefinition = {
      schema: z.object({ kind: z.string() }),
      apply: rows => rows,
    };
    expect(() => resolveTransformRegistry([nonObject])).toThrow(/ZodObject/i);
    expect(() => resolveTransformRegistry([missingLiteralKind])).toThrow(/literal/i);
  });

  it('custom_transform_apply_uses_same_registry_pipeline', () => {
    const registry = resolveTransformRegistry([doubleDefinition]);
    const rows = applyTransforms([{ x: 2, y: 5 }], [{ kind: 'double', field: 'x', as: 'x2' }], registry);
    expect(rows).toEqual([{ x: 2, y: 5, x2: 4 }]);
  });

  it('input_and_output_fields_feed_source_field_collection', () => {
    const spec = pointSpec([{ kind: 'double', field: 'x', as: 'x2' }]);
    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleDefinition]));
    expect([...fields].sort()).toEqual(['x', 'y']);
  });

  it('unknown_or_invalid_custom_operation_throws_at_lowering', () => {
    const spec = pointSpec([{ kind: 'double', field: 'x' }]);
    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).toThrow();
    expect(() => compile(pointSpec([{ kind: 'unknown-transform', field: 'x', as: 'x2' }]), { d: [{ x: 2, y: 5 }] })).toThrow(/not registered/i);
  });

  it('custom_output_fields_strict_model_passes_when_registered', () => {
    const spec = pointSpec([{ kind: 'double', field: 'x', as: 'x2' }]);
    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).not.toThrow();
  });

  it('custom_output_fields_strict_model_rejects_when_omitted', () => {
    const missingOutputDefinition = defineTransform({
      schema: doubleDefinition.schema,
      inputFields: operation => [operation.field],
      apply: doubleDefinition.apply,
    });
    const spec = pointSpec([{ kind: 'double', field: 'x', as: 'x2' }]);
    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] }, [missingOutputDefinition])).toThrow(/x2/);
  });

  it('custom_group_provenance_tracks_source_indices', () => {
    const registry = resolveTransformRegistry([groupSumDefinition]);
    const rows = applyTransforms(
      tagSourceIndex([
        { group: 'A', value: 2 },
        { group: 'A', value: 3 },
        { group: 'B', value: 5 },
      ]),
      [{ kind: 'group-sum', groupBy: 'group', field: 'value', as: 'total' }],
      registry,
    );
    expect(rows).toEqual([
      expect.objectContaining({ group: 'A', total: 5 }),
      expect.objectContaining({ group: 'B', total: 5 }),
    ]);
    expect(readSourceIndices(rows[0])).toEqual([0, 1]);
    expect(readSourceIndices(rows[1])).toEqual([2]);
  });

  it('custom_then_builtin_chain_uses_one_registry', () => {
    const registry = resolveTransformRegistry([doubleDefinition]);
    const rows = applyTransforms(
      [{ x: 2 }, { x: 1 }],
      [
        { kind: 'double', field: 'x', as: 'x2' },
        { kind: 'sort', field: 'x2', order: 'descending' },
      ],
      registry,
    );
    expect(rows.map(row => row.x2)).toEqual([4, 2]);
  });
});
