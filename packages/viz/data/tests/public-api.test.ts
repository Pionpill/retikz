import { describe, expect, it } from 'vitest';

import * as DataApi from '../src';

describe('data public API', () => {
  it('exposes transform authoring, validation and execution entry points', () => {
    expect(DataApi.defineTransform).toBeTypeOf('function');
    expect(DataApi.defineTransformImplementation).toBeTypeOf('function');
    expect(DataApi.createDataTransformExecutor).toBeTypeOf('function');
    expect(DataApi.TransformSchema.safeParse({ kind: 'sort', params: { field: 'value' } }).success).toBe(true);
  });

  it.each([
    'coerceNumber',
    'isBuiltinFieldFormat',
    'BUILTIN_FIELD_FORMATS',
    'importDataLineageEvents',
    'withGroupProvenance',
    'createTransformSchema',
    'RESERVED_TRANSFORM_KINDS',
    'BuiltinFieldReducerOperationKind',
    'BuiltinReducerOperationSchemas',
    'BuiltinRegressionMethodSchemas',
    'DataTransformKindSchema',
    'applyDensity',
    'binMetricOperations',
    'groupRowsByFields',
    'resolveReducerDependency',
    'applyReducerOperation',
    'selectorInputFields',
  ])('keeps %s inside its implementation owner', name => {
    expect(DataApi).not.toHaveProperty(name);
  });

  it('does not expose readonly collection constructors', () => {
    expect(DataApi).not.toHaveProperty('createReadonlyMap');
    expect(DataApi).not.toHaveProperty('createReadonlySet');
  });
});
