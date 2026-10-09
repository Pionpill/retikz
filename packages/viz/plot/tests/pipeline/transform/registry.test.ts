import { compileToScene } from '@retikz/core';
import { defineTransformImplementation } from '@retikz/data';
import type { AnyTransformDefinition, ExternalRow } from '@retikz/data';
import {
  applyTransforms,
  defineTransform,
  extractTransformKind,
  BuiltinDataTransform,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  readSourceIndices,
  tagSourceIndex,
  resolveTransformRegistry,
} from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { describe, expect, it } from 'vitest';
import { object, string } from 'zod';

import { lowerPlots } from '../../../src/pipeline/expand';
import { collectSourceFields } from '../../../src/pipeline/source-fields';
import type { IRPlot } from '../../../src/schemas';
import { PlotSchema } from '../../../src/schemas';

const doubleDefinition = defineTransform({
  kind: 'double',
  paramsSchema: object({ field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.field],
  outputModel: operation => ({ kind: 'preserve', outputs: [{ field: operation.params.as }] }),
});

const doubleDefinitionImplementation = defineTransformImplementation({
  definition: doubleDefinition,
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.params.as]: Number(row[operation.params.field]) * 2,
    })),
});

const groupSumDefinition = defineTransform({
  kind: 'group-sum',
  paramsSchema: object({ groupBy: NonBlankStringSchema, field: NonBlankStringSchema, as: NonBlankStringSchema }),
  inputFields: operation => [operation.params.groupBy, operation.params.field],
  outputModel: operation => ({
    kind: 'replace',
    fields: [
      { field: operation.params.groupBy, type: { from: operation.params.groupBy } },
      { field: operation.params.as, type: 'continuous' },
    ],
  }),
});

const groupSumDefinitionImplementation = defineTransformImplementation({
  definition: groupSumDefinition,
  apply: (rows, operation, context) => {
    const groups = new Map<string, Array<ExternalRow>>();

    for (const row of rows) {
      const key = String(row[operation.params.groupBy]);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }

    return [...groups.entries()].map(([key, members]) =>
      context.groupProvenance(
        {
          [operation.params.groupBy]: key,
          [operation.params.as]: members.reduce((sum, row) => sum + Number(row[operation.params.field] ?? 0), 0),
        },
        members,
      ),
    );
  },
});

const compile = (
  spec: IRPlot,
  datasets: Record<string, Array<Record<string, unknown>>>,
  definitions = [doubleDefinition],
) =>
  compileToScene(
    { version: 1, type: 'scene', children: [spec] },
    {
      composites: lowerPlots(datasets, {
        transformDefinitions: definitions,
        transformImplementations: definitions.includes(doubleDefinition) ? [doubleDefinitionImplementation] : [],
      }),
    },
  ).scene;

const pointSpec = (transform: IRPlot['transform']): IRPlot =>
  PlotSchema.parse({
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

describe('transform registry (contract)', () => {
  it('builtin_registry_contains_all_transform_kinds', () => {
    const registry = resolveTransformRegistry();

    expect([...registry.keys()].sort()).toEqual(Object.values(BuiltinDataTransform).sort());
  });

  it('publishes schedules for field-bindable plot transforms', () => {
    const registry = resolveTransformRegistry();

    expect(registry.get(BuiltinDataTransform.Stack)?.schedule).toEqual({
      phase: DataTransformPhase.CumulativeDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Bin)?.schedule).toEqual({
      phase: DataTransformPhase.RowShape,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Replace,
    });
    expect(registry.get(BuiltinDataTransform.Normalize)?.schedule).toEqual({
      phase: DataTransformPhase.FieldDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.DeriveInterval)?.schedule).toEqual({
      phase: DataTransformPhase.CumulativeDerive,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Jitter)?.schedule).toEqual({
      phase: DataTransformPhase.FieldAdjust,
      bindingClass: DataTransformBindingClass.Field,
      fieldEffect: DataTransformFieldEffect.Preserve,
    });
    expect(registry.get(BuiltinDataTransform.Density)?.schedule).toBeUndefined();
  });

  it('define_transform_preserves_schema_and_extracts_kind', () => {
    expect(extractTransformKind(doubleDefinition.schema)).toBe('double');
    expect(doubleDefinition.schema.parse({ kind: 'double', params: { field: 'x', as: 'x2' } })).toEqual({
      kind: 'double',
      params: {
        field: 'x',
        as: 'x2',
      },
    });
  });

  it('duplicate_custom_or_builtin_registration_throws', () => {
    expect(() => resolveTransformRegistry([doubleDefinition, doubleDefinition])).toThrow(
      /duplicate transform registration/i,
    );

    const builtinCollision = defineTransform({
      kind: 'sort',
      paramsSchema: object({}),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });

    expect(() => resolveTransformRegistry([builtinCollision])).toThrow(/duplicate transform registration/i);
  });

  it('malformed_registration_schema_throws', () => {
    const missingLiteralKind: AnyTransformDefinition = {
      schema: object({ kind: string(), params: object({}) }),
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    };

    expect(() => extractTransformKind(string())).toThrow(/ZodObject/i);
    expect(() => resolveTransformRegistry([missingLiteralKind])).toThrow(/literal/i);
  });

  it('custom_transform_apply_uses_same_registry_pipeline', () => {
    const registry = resolveTransformRegistry([doubleDefinition]);
    const rows = applyTransforms([{ x: 2, y: 5 }], [{ kind: 'double', params: { field: 'x', as: 'x2' } }], {
      registry,
      transformImplementations: [doubleDefinitionImplementation],
    });

    expect(rows).toEqual([{ x: 2, y: 5, x2: 4 }]);
  });

  it('input_and_output_fields_feed_source_field_collection', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);
    const fields = collectSourceFields(spec, resolveTransformRegistry([doubleDefinition]));

    expect([...fields].sort()).toEqual(['x', 'y']);
  });

  it('unknown_or_invalid_custom_operation_throws_at_lowering', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x' } } }]);

    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).toThrow();
    expect(() =>
      compile(pointSpec([{ operation: { kind: 'unknown-transform', params: { field: 'x', as: 'x2' } } }]), {
        d: [{ x: 2, y: 5 }],
      }),
    ).toThrow(/not registered/i);
  });

  it('custom_output_fields_strict_model_passes_when_registered', () => {
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);

    expect(() => compile(spec, { d: [{ x: 2, y: 5 }] })).not.toThrow();
  });

  it('custom_output_fields_strict_model_rejects_when_omitted', () => {
    const missingOutputDefinition = defineTransform({
      kind: 'double',
      paramsSchema: doubleDefinition.schema.shape.params,
      inputFields: operation => [operation.params.field],
      outputModel: () => ({ kind: 'preserve', outputs: [] }),
    });
    const spec = pointSpec([{ operation: { kind: 'double', params: { field: 'x', as: 'x2' } } }]);

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
      [{ kind: 'group-sum', params: { groupBy: 'group', field: 'value', as: 'total' } }],
      { registry, transformImplementations: [groupSumDefinitionImplementation] },
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
        { kind: 'double', params: { field: 'x', as: 'x2' } },
        { kind: 'sort', params: { field: 'x2', order: 'descending' } },
      ],
      { registry, transformImplementations: [doubleDefinitionImplementation] },
    );

    expect(rows.map(row => row.x2)).toEqual([4, 2]);
  });
});
