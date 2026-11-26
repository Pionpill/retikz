import type { CompileWarning, SceneResources, PaintRegistry, ClipRegistry, ReferenceReadKind } from '@retikz/core';

import type { CompileRuntime, NamespaceEntry } from '../../compile';
import type { WeaveReferenceRead } from './reference';

/** 本次计算使用的资源和诊断，读取事实通过独立数组交给节点持有 */
export type WeaveObservationFacts = Readonly<{
  /** 本次实际登记或导入的资源 */
  resources: SceneResources;
  /** 本轮工作区收集的计算诊断 */
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

/** 捕获计算的资源、诊断及指定阶段的读取，计算和候选状态回写由调用方负责 */
export const createWeaveObservation = (
  runtime: CompileRuntime,
  readiness: WeaveReferenceRead['readiness'] = 'prepare',
) => {
  const reads: Array<WeaveReferenceRead> = [];
  const diagnostics: Array<CompileWarning> = [];
  const workspace = runtime.state.workspace;
  const warningCount = workspace.diagnosticCollector.warnings.length;
  // ⚡仅在登记首个资源时分配集合
  let resourceIds: Set<string> | undefined;
  const retainResource = (id: string): string => {
    (resourceIds ??= new Set()).add(id);
    return id;
  };
  const paintRegistry: PaintRegistry = {
    register: paint => {
      const value = workspace.paintRegistry.register(paint);
      if (typeof value === 'object' && value.kind === 'resourceRef') retainResource(value.id);
      return value;
    },
    importResource: resource => {
      const value = workspace.paintRegistry.importResource(resource);
      retainResource(value.id);
      return value;
    },
    // ⚡未登记资源的计算不枚举其它元素已经登记的全局资源
    getResources: () =>
      resourceIds === undefined
        ? []
        : workspace.paintRegistry.getResources().filter(resource => resourceIds!.has(resource.id)),
  };
  const clipRegistry: ClipRegistry = {
    lower: workspace.clipRegistry.lower,
    register: clip => retainResource(workspace.clipRegistry.register(clip)),
    registerPath: clip => retainResource(workspace.clipRegistry.registerPath(clip)),
    importResource: resource => retainResource(workspace.clipRegistry.importResource(resource)),
    getResources: () =>
      resourceIds === undefined
        ? []
        : workspace.clipRegistry.getResources().filter(resource => resourceIds!.has(resource.id)),
  };
  const local: CompileRuntime = {
    ...runtime,
    state: {
      ...runtime.state,
      workspace: {
        ...workspace,
        paintRegistry,
        clipRegistry,
        diagnosticCollector: {
          warnings: diagnostics,
          collect: warning => {
            diagnostics.push(warning);
            workspace.diagnosticCollector.collect(warning);
          },
        },
      },
    },
  };
  return {
    runtime: local,
    reads,
    diagnostics,
    read: (name: string, entry: NamespaceEntry | undefined, kind: ReferenceReadKind) =>
      reads.push({ name, entry, kind, readiness }),
    facts: (): WeaveObservationFacts => ({
      resources: { paints: paintRegistry.getResources(), clips: clipRegistry.getResources() },
      diagnostics: workspace.diagnosticCollector.warnings.slice(warningCount),
    }),
  };
};
