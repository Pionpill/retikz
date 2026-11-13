import type { CompileWarning, SceneResources, PaintRegistry, ClipRegistry, ReferenceReadKind } from '@retikz/core';

import type { CompileRuntime, NamespaceEntry } from '../../compile/runtime';
import type { WeaveReferenceRead } from './reference';

/** 本次计算使用的资源、引用和诊断，不包含跨批复用策略 */
export type WeaveObservationFacts = Readonly<{
  /** 本次实际消费的名称绑定与几何粒度 */
  reads: ReadonlyArray<WeaveReferenceRead>;
  /** 本次实际登记或导入的资源 */
  resources: SceneResources;
  /** 本轮工作区收集的计算诊断 */
  diagnostics: ReadonlyArray<CompileWarning>;
}>;

/** 捕获本次计算的资源与诊断，计算和提交由调用方负责 */
export const createWeaveObservation = (runtime: CompileRuntime) => {
  const reads: Array<WeaveReferenceRead> = [];
  const diagnostics: Array<CompileWarning> = [];
  const workspace = runtime.state.workspace;
  const warningCount = workspace.diagnosticCollector.warnings.length;
  const resourceIds = new Set<string>();
  const retainResource = (id: string): string => {
    resourceIds.add(id);
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
    getResources: () => workspace.paintRegistry.getResources().filter(resource => resourceIds.has(resource.id)),
  };
  const clipRegistry: ClipRegistry = {
    lower: workspace.clipRegistry.lower,
    register: clip => retainResource(workspace.clipRegistry.register(clip)),
    registerPath: clip => retainResource(workspace.clipRegistry.registerPath(clip)),
    importResource: resource => retainResource(workspace.clipRegistry.importResource(resource)),
    getResources: () => workspace.clipRegistry.getResources().filter(resource => resourceIds.has(resource.id)),
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
      reads.push({ name, entry, kind }),
    facts: (): WeaveObservationFacts => ({
      reads,
      resources: { paints: paintRegistry.getResources(), clips: clipRegistry.getResources() },
      diagnostics: workspace.diagnosticCollector.warnings.slice(warningCount),
    }),
  };
};
