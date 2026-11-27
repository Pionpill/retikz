import type { AnyCompositeDefinition, IRScene } from '@retikz/core';
import type {
  CompileNamespaceKey,
  CompileOptions,
  CompileProvenanceSnapshot,
  SceneCompilationSnapshot,
} from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

/** 两个驱动共享语义验收，不依赖本次编译的来源身份对象 */
const projectBenchmarkProvenance = (snapshot: CompileProvenanceSnapshot) => {
  const pathOf = (key: typeof snapshot.root): string => {
    const owner = snapshot.ownerMap.get(key)!;
    return `${owner.parent === undefined ? '' : pathOf(owner.parent)}/${owner.index}:${owner.kind}:${owner.id ?? ''}`;
  };
  const owners = [...snapshot.ownerMap]
    .map(([key, owner]) => ({ path: pathOf(key), owner }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const namespaces = new Map<CompileNamespaceKey, string>();
  for (const { path, owner } of owners) if (!namespaces.has(owner.namespace)) namespaces.set(owner.namespace, path);
  return owners.map(({ path, owner }) => ({
    path,
    namespace: namespaces.get(owner.namespace),
    generated: owner.generated,
    emissions: [...owner.emissions].sort((a, b) =>
      JSON.stringify(a.primitivePath).localeCompare(JSON.stringify(b.primitivePath)),
    ),
  }));
};

/** 所有断言均在计时外，覆盖结果、诊断、来源和隔离异常 */
export const verifyBenchmarkSnapshot = (
  actual: SceneCompilationSnapshot<AnyCompositeDefinition>,
  expected: SceneCompilationSnapshot<AnyCompositeDefinition>,
  isolatedDiagnostics: ReadonlyArray<unknown>,
): void => {
  expect(isolatedDiagnostics).toEqual([]);
  expect(actual.result).toEqual(expected.result);
  expect(actual.diagnostics).toEqual(expected.diagnostics);
  expect(actual.provenance === undefined).toBe(expected.provenance === undefined);
  if (actual.provenance !== undefined && expected.provenance !== undefined)
    expect(projectBenchmarkProvenance(actual.provenance)).toEqual(projectBenchmarkProvenance(expected.provenance));
};

/** 非增量独立重建作为 oracle，允许诊断的配方仍逐项比较 */
export const compileBenchmarkSnapshot = (
  scene: IRScene,
  options: CompileOptions,
  captureProvenance = false,
  allowDiagnostics = false,
): SceneCompilationSnapshot<AnyCompositeDefinition> => {
  const oracle = new SceneReconciler(options, { captureProvenance });
  try {
    const result = oracle.mount(scene);
    expect(oracle.diagnostics()).toEqual([]);
    if (!allowDiagnostics) expect(result.compilation.diagnostics).toEqual([]);
    return result.compilation;
  } finally {
    oracle.dispose();
  }
};
