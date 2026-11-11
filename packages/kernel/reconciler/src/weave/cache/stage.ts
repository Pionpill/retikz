import { visitSceneContent } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { compareProperties, jsonStructuralEquals } from '@retikz/foundation';

import type {
  CompileRuntime,
  CompileStageProducts,
  CompileStageComputation,
  CompileStageRecord,
  TypedCompileStageRecord,
  CompileReferenceRead,
} from '../../compile/runtime';
import { createCompileStageWorkspace } from '../../compile/runtime';
import { importSceneResources } from '../../compile/shared';
import { compareCanonicalCoordinates } from '../coordinate';
import { compileWeaveNode, compareCanonicalNodes } from '../node';
import { preparePathCompilation, comparePathResolutions } from '../path';
import { compareCanonicalScopes } from '../scope';
import { matchWeaveReferences } from '../shared';

const comparators: {
  [TPhase in keyof CompileStageProducts]: (
    previous: CompileStageProducts[TPhase]['canon'],
    current: CompileStageProducts[TPhase]['canon'],
  ) => boolean;
} = {
  node: compareCanonicalNodes,
  coordinate: compareCanonicalCoordinates,
  scope: compareCanonicalScopes,
  path: comparePathResolutions,
};

/** 执行器注入的候选缓存，不参与绘图算法 */
export type CompileStageCache = {
  /** 当前作者声明路径对应的阶段缓存 */
  read: (path: PropertyPath, phase: keyof CompileStageProducts) => CompileStageRecord | undefined;
  /** 保存当前阶段及依赖，提交由外层候选事务管理 */
  write: (path: PropertyPath, record: CompileStageRecord, reused: boolean) => void;
};

/** 将阶段复用策略绑定到当前候选的记录存储 */
export const createWeaveStageController = (
  readRecord: CompileStageCache['read'],
  write: CompileStageCache['write'],
) => {
  /** 在存储边界检查阶段后恢复泛型关联，TypeScript 不会按泛型键收窄判别联合 */
  const readStageRecord = <TPhase extends keyof CompileStageProducts>(
    path: PropertyPath,
    phase: TPhase,
  ): TypedCompileStageRecord<TPhase> | undefined => {
    const record = readRecord(path, phase);
    return record?.phase === phase ? (record as TypedCompileStageRecord<TPhase>) : undefined;
  };

  /** 泛型阶段记录写入异构存储时转为判别联合，阶段与产物由调用签名关联 */
  const writeStageRecord = <TPhase extends keyof CompileStageProducts>(
    runtime: CompileRuntime,
    path: PropertyPath,
    record: TypedCompileStageRecord<TPhase>,
    reused: boolean,
  ): void => {
    runtime.stages?.write(path, record as CompileStageRecord, reused);
  };

  /** 为必须先向子树提供继承环境的元素复用确定化结果 */
  const readCompileStageCanon = <TPhase extends keyof CompileStageProducts>(
    runtime: CompileRuntime,
    path: PropertyPath,
    phase: TPhase,
    resolveInputs: unknown,
  ): CompileStageProducts[TPhase]['canon'] | undefined => {
    const previous = readStageRecord(path, phase);
    return previous !== undefined &&
      previous.diagnostics.length === 0 &&
      compareProperties(previous.resolveInputs, resolveInputs, { depth: 2 })
      ? previous.value.canon
      : undefined;
  };

  /** 在相同执行路径中计算或复用阶段，资源与产物始终一起进入本次工作区 */
  const runCompileStage = <TPhase extends keyof CompileStageProducts>(
    runtime: CompileRuntime,
    path: PropertyPath,
    phase: TPhase,
    inputs: unknown,
    compute: CompileStageComputation<TPhase>,
  ): CompileStageProducts[TPhase] => {
    const namespace = runtime.state.execution.namespaceStack;
    const previous = readStageRecord(path, phase);
    const referencesMatch = () => previous !== undefined && matchWeaveReferences(previous.reads, namespace);
    if (
      previous !== undefined &&
      previous.diagnostics.length === 0 &&
      compareProperties(previous.inputs, inputs, { depth: 2 }) &&
      referencesMatch()
    ) {
      importSceneResources(
        previous.resources,
        runtime.state.workspace.paintRegistry,
        runtime.state.workspace.clipRegistry,
      );
      writeStageRecord<TPhase>(runtime, path, previous, true);
      // 同一 phase 的计算回调在执行器中固定；缓存入口不跨阶段共享 value
      return previous.value;
    }

    const warningCount = runtime.state.workspace.diagnosticCollector.warnings.length;
    const reads: Array<CompileReferenceRead> = [...(compute.preparedReads ?? [])];
    const workspace = runtime.state.workspace;
    const { local, diagnostics, paintRegistry, clipRegistry } = createCompileStageWorkspace(runtime);
    const previousCanon = previous?.value.canon;
    const canon =
      previous !== undefined &&
      previous.diagnostics.length === 0 &&
      compareProperties(previous.resolveInputs, compute.resolveInputs, { depth: 2 })
        ? previous.value.canon
        : compute.resolve(local);
    if (
      previousCanon !== undefined &&
      previous !== undefined &&
      previous.diagnostics.length === 0 &&
      diagnostics.length === 0 &&
      comparators[phase](previousCanon, canon) &&
      jsonStructuralEquals(previous.compileInputs, compute.compileInputs) &&
      referencesMatch()
    ) {
      importSceneResources(previous.resources, workspace.paintRegistry, workspace.clipRegistry);
      const value = { ...previous.value, canon };
      writeStageRecord<TPhase>(
        runtime,
        path,
        {
          ...previous,
          inputs,
          value,
          resolveInputs: compute.resolveInputs,
          compileInputs: compute.compileInputs,
        },
        true,
      );
      return value;
    }
    const referencesValid = referencesMatch();
    const reusablePrevious =
      previous !== undefined &&
      previous.diagnostics.length === 0 &&
      jsonStructuralEquals(previous.compileInputs, compute.compileInputs)
        ? previous.value
        : undefined;
    const value = namespace.observeReferences(
      (name, entry, kind) => reads.push({ name, entry, kind }),
      () =>
        compute.compile(
          local,
          canon,
          reusablePrevious,
          primitives => {
            if (reusablePrevious === undefined || previous === undefined) return;
            const retained = new Set<string>();
            visitSceneContent({ primitives, resources: [...previous.resources] }, primitive => {
              if (primitive.type === 'group') {
                if (primitive.clipRef !== undefined) retained.add(primitive.clipRef);
              } else if (primitive.type !== 'text') {
                for (const paint of [primitive.fill, primitive.stroke])
                  if (typeof paint === 'object' && paint.kind === 'resourceRef') retained.add(paint.id);
              }
            });
            importSceneResources(
              previous.resources.filter(resource => retained.has(resource.id)),
              paintRegistry,
              clipRegistry,
            );
          },
          referencesValid,
        ),
    );
    // 部分复用 targets/geometry 时不再触发 lookup，仍需保留已验证的引用依赖
    if (referencesValid && reusablePrevious !== undefined && previous !== undefined)
      for (const read of previous.reads)
        if (!reads.some(current => current.name === read.name && current.kind === read.kind)) reads.push(read);
    const resources = [...paintRegistry.getResources(), ...clipRegistry.getResources()];
    writeStageRecord<TPhase>(
      runtime,
      path,
      {
        phase,
        inputs,
        scopePreparation: compute.scopePreparation,
        resolveInputs: compute.resolveInputs,
        compileInputs: compute.compileInputs,
        value,
        reads,
        resources,
        diagnostics: [
          ...(compute.preparedDiagnostics ?? []),
          ...runtime.state.workspace.diagnosticCollector.warnings.slice(warningCount),
        ],
      },
      false,
    );
    return value;
  };

  return {
    execute: runCompileStage,
    readCanon: readCompileStageCanon,
    write,
    compileNode: compileWeaveNode,
    preparePath: preparePathCompilation,
  };
};
