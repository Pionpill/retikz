import { describe, expect, it } from 'vitest';

import * as DataApi from '../src';

describe('数据公开 API', () => {
  it('公开转换编写、验证和执行入口点', () => {
    expect(DataApi.defineTransform).toBeTypeOf('function');
    expect(DataApi.defineTransformImplementation).toBeTypeOf('function');
    expect(DataApi.createDataTransformExecutor).toBeTypeOf('function');
    expect(DataApi.TransformSchema.safeParse({ kind: 'sort', params: { field: 'value' } }).success).toBe(true);
  });

  it.each([
    'coerceNumber',
    'importDataLineageEvents',
    'withGroupProvenance',
    'createTransformSchema',
    'RESERVED_TRANSFORM_KINDS',
    'BuiltinFieldReducerOperationKind',
    'BuiltinReducerOperationSchemas',
    'BuiltinRegressionMethodSchemas',
    'applyDensity',
    'binMetricOperations',
    'groupRowsByFields',
    'resolveReducerDependency',
    'applyReducerOperation',
    'selectorInputFields',
  ])('将 %s 保留在其实现所属模块内', name => {
    expect(DataApi).not.toHaveProperty(name);
  });

  it('不公开只读集合构造函数', () => {
    expect(DataApi).not.toHaveProperty('createReadonlyMap');
    expect(DataApi).not.toHaveProperty('createReadonlySet');
  });
});
