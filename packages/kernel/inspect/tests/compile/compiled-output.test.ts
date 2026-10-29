import type { CompileResult } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import {
  compileInspectionToScene,
  createDefaultInspectorRegistry,
  createInspectorRegistry,
  defineInspector,
  PATH_INSPECTOR_KEY,
  RetikzInspectError,
} from '../../src';

const primary: CompileResult = {
  scene: {
    layout: { x: 0, y: 0, width: 40, height: 40 },
    primitives: [
      {
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'quad', control: [10, 20], to: [30, 0] },
        ],
      },
    ],
  },
  artifacts: [],
};

describe('公开编译结果检查', () => {
  it('扩展上下文的嵌套值不可改写，且不冻结调用方对象', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'isolation',
      subject: { kind: 'primitive', type: 'path' },
      inspect: (_subject, context) => {
        expect(Reflect.set(context.target, 'kind', 'artifact')).toBe(false);
        expect(Reflect.set(context.transform, '0', 999)).toBe(false);
        expect(Reflect.set(context.appearance.semanticColors, 'danger', 'red')).toBe(false);
        expect(Reflect.set(context.inspectorKey, 'namespace', 'changed')).toBe(false);
        return [];
      },
    });
    compileInspectionToScene(primary, {
      registry: createInspectorRegistry([definition]),
      requests: [{ inspector: definition }],
    });
    expect(Object.isFrozen(primary.scene.primitives)).toBe(false);
  });
  it('把最终路径转换为独立辅助 Scene，保持主图不变', () => {
    const before = structuredClone(primary);
    const output = compileInspectionToScene(primary, {
      registry: createDefaultInspectorRegistry(),
      requests: [{ inspector: PATH_INSPECTOR_KEY }],
    });
    expect(output.inspection?.entries.length).toBeGreaterThan(0);
    expect(output.inspection?.entries[0]?.transform).toEqual([1, 0, 0, 1, 0, 0]);
    expect(primary).toEqual(before);
    expect(Object.isFrozen(primary.scene)).toBe(false);
  });

  it('注册本身不生成辅助图，空匹配仍检查选项', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'text',
      subject: { kind: 'primitive', type: 'text' },
      optionsSchema: strictObject({ label: string() }),
      inspect: () => [],
    });
    const registry = createInspectorRegistry([definition]);
    expect(compileInspectionToScene(primary, { registry, requests: [] }).inspection).toBeNull();
    expect(() => compileInspectionToScene(primary, { registry, requests: [{ inspector: definition }] })).toThrow(
      RetikzInspectError,
    );
  });

  it('拒绝同一检查器对同一目标重复选择', () => {
    const request = { inspector: PATH_INSPECTOR_KEY };
    expect(() =>
      compileInspectionToScene(primary, { registry: createDefaultInspectorRegistry(), requests: [request, request] }),
    ).toThrow(RetikzInspectError);
  });

  it('回调失败保留 cause 且不修改主图', () => {
    const cause = new Error('extension failed');
    const definition = defineInspector({
      namespace: 'test',
      type: 'failure',
      subject: { kind: 'primitive', type: 'path' },
      inspect: () => {
        throw cause;
      },
    });
    const before = structuredClone(primary);
    expect(() =>
      compileInspectionToScene(primary, {
        registry: createInspectorRegistry([definition]),
        requests: [{ inspector: definition }],
      }),
    ).toThrow(expect.objectContaining({ cause }));
    expect(primary).toEqual(before);
  });

  it('领域产物不能通过 occurrence 获得隐式空间', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'artifact',
      subject: { kind: 'artifact', namespace: 'domain', type: 'box' },
      inspect: (_artifact, context) => {
        context.warn('UnsupportedGeometry', 'No scene coordinates');
        return [];
      },
    });
    const output = compileInspectionToScene(
      {
        ...primary,
        artifacts: [
          {
            namespace: 'domain',
            type: 'box',
            occurrence: { sourcePath: 'children[0]', expansionPath: [] },
            value: { x: 10 },
          },
        ],
      },
      { registry: createInspectorRegistry([definition]), requests: [{ inspector: definition }] },
    );
    expect(output.inspection).toBeNull();
    expect(output.diagnostics[0]?.cause.code).toBe('UnsupportedGeometry');
  });
});
