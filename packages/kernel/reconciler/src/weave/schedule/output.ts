import { BuiltinCompileWarningCode, projectScopeCompileLayouts } from '@retikz/core';
import { compareProperties } from '@retikz/foundation';
import type { PropertyPath } from '@retikz/foundation';

import type {
  CompileNamespaceKey,
  CompileOwnerKey,
  CompileRuntime,
  SubtreeCompileContext,
  SubtreeCompileState,
} from '../../compile';
import {
  bindScopeOutputAnimations,
  createDuplicateWarning,
  createTreePositionContext,
  importSceneResources,
  NamespaceStack,
} from '../../compile';
import type { CompileElementExecutor } from '../../compile';
import { materializeWeaveOutput } from '../contribution';
import { assembleWeaveScopeOutput } from '../element';
import type { WeaveEntry, WeaveRoot, WeaveScopeEntry } from '../shared';
import type { WeaveTransaction } from '../state';
import type { WeaveTaskAddress } from './task';
import type { WeaveAssembledOutput, WeaveElementExecution, WeaveExecutionContext, WeaveUpdateRequest } from './types';

/** 本批输出组装所需的执行状态与阶段调度能力 */
type WeaveOutputFlowContext = {
  runtime: CompileRuntime;
  transaction: WeaveTransaction;
  paths: ReadonlyMap<WeaveEntry, PropertyPath>;
  pending: Map<WeaveEntry, WeaveUpdateRequest>;
  executions: Map<WeaveEntry, WeaveElementExecution>;
  assembled: Map<WeaveEntry, WeaveAssembledOutput>;
  changedOutputs: Set<WeaveScopeEntry>;
  rootExecutor: CompileElementExecutor;
  recordComputed: WeaveExecutionContext['recordComputed'];
  prepareAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  outputAddress: (entry: WeaveEntry) => WeaveTaskAddress;
  requireTask: (address: WeaveTaskAddress) => void;
  contextOf: (parent: WeaveRoot | WeaveScopeEntry) => SubtreeCompileContext;
  ownerOf: (entry: WeaveScopeEntry) => CompileOwnerKey | undefined;
  namespaceOf: (entry: WeaveEntry) => CompileNamespaceKey;
  ensure: (entry: WeaveEntry) => void;
  requireProjection: (entry: WeaveScopeEntry) => void;
};

/** 本批局部布局读取、旧贡献物化与 Scope 输出组装 */
export const createWeaveOutputFlow = ({
  runtime,
  transaction,
  paths,
  pending,
  executions,
  assembled,
  changedOutputs,
  rootExecutor,
  recordComputed,
  prepareAddress,
  outputAddress,
  requireTask,
  contextOf,
  ownerOf,
  namespaceOf,
  ensure,
  requireProjection,
}: WeaveOutputFlowContext) => {
  const tracker = runtime.state.execution.provenanceTracker;
  /** ⚡清洁贡献直接物化输出，不进入元素执行器或候选写入 */
  const outputOf = (entry: WeaveEntry): WeaveAssembledOutput => {
    if (pending.size !== 0 && pending.has(entry)) requireTask(prepareAddress(entry));
    const execution = executions.get(entry);
    if (execution !== undefined) {
      requireTask(outputAddress(entry));
      for (const primitive of execution.frame.state.primitives) {
        if (primitive.type === 'path-placeholder') continue;
        const zIndex = execution.executor.output.zIndexMap.get(primitive);
        if (zIndex !== undefined) rootExecutor.output.zIndexMap.set(primitive, zIndex);
      }
      return execution.frame.state;
    }
    const cached = assembled.get(entry);
    if (cached !== undefined) return cached;
    if (entry.type !== 'scope') {
      const state = transaction.readState(entry);
      const contribution = state.contribution!;
      for (const warning of contribution.diagnostics)
        if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
          runtime.state.workspace.diagnosticCollector.collect(warning);
      // ⚡无来源、资源和图元时，直接返回原贡献；布局、分配、辅助线和产物仍由父级收集
      if (
        tracker === undefined &&
        contribution.diagnostics.length === 0 &&
        contribution.output.primitives.length === 0 &&
        contribution.resources.paints.length === 0 &&
        contribution.resources.clips.length === 0
      )
        return contribution.output;
      const parent = state.parent.type === 'root' ? tracker?.root : ownerOf(state.parent);
      const owner =
        parent === undefined
          ? undefined
          : tracker?.createOwner(
              state.origin.own,
              paths.get(entry)!.at(-1) as number,
              parent,
              false,
              namespaceOf(entry),
            );
      const result = materializeWeaveOutput(runtime, rootExecutor.output, contribution, owner, namespaceOf(entry));
      assembled.set(entry, result);
      return result;
    }
    const scope = transaction.readState(entry);
    const childState = emptyOutput();
    // ⚡具名 Scope 只投影自己的包络，输出收集无需再复制子布局
    const includeLayouts = scope.origin.own.id === undefined;
    for (const child of scope.children) appendState(childState, outputOf(child), includeLayouts);
    const result = emptyOutput();
    importSceneResources(
      scope.compile?.resources ?? { paints: [], clips: [] },
      runtime.state.workspace.paintRegistry,
      runtime.state.workspace.clipRegistry,
    );
    for (const warning of scope.compile?.diagnostics ?? [])
      if (warning.code !== BuiltinCompileWarningCode.DuplicateNodeId)
        runtime.state.workspace.diagnosticCollector.collect(warning);
    let compiled = scope.compile!.value;
    let outputDiagnostics = scope.compile?.outputDiagnostics ?? [];
    if (changedOutputs.has(entry)) {
      const context = contextOf(scope.parent);
      const bound = bindScopeOutputAnimations(scope.resolve!.value, compiled, childState.primitives.length, {
        layouts: childState.geometries,
        positionContext: createTreePositionContext(runtime, context.transformChains),
        irPath: paths.get(entry)!,
        onWarn: runtime.state.workspace.diagnosticCollector.collect,
        registerClip: runtime.state.workspace.clipRegistry.register,
        registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
      });
      if (bound.compiled !== compiled || !compareProperties(outputDiagnostics, bound.diagnostics)) {
        transaction.editState(entry).compile = { ...scope.compile!, value: bound.compiled };
        recordComputed(
          entry,
          { ...scope.compile!, outputDiagnostics: bound.diagnostics, value: bound.compiled },
          bound.compiled === compiled,
          scope.referenceReads,
        );
      }
      compiled = bound.compiled;
      outputDiagnostics = bound.diagnostics;
    }
    for (const warning of outputDiagnostics) runtime.state.workspace.diagnosticCollector.collect(warning);
    assembleWeaveScopeOutput(
      runtime,
      rootExecutor.output,
      scope.origin.own,
      compiled,
      childState,
      { context: contextOf(scope.parent), state: result },
      ownerOf(entry),
    );
    assembled.set(entry, result);
    return result;
  };
  const emptyOutput = (): SubtreeCompileState => ({
    primitives: [],
    paths: [],
    geometries: [],
    publications: [],
    bounds: [],
    allocations: [],
    alignmentGuides: [],
    artifacts: [],
  });
  /** 包络读取清洁布局，不提前物化绘制或来源所有者 */
  const layoutOf = (entry: WeaveEntry): WeaveAssembledOutput => {
    if (entry.type !== 'scope') return transaction.readState(entry).contribution!.output;
    const state = transaction.readState(entry);
    const children = emptyOutput();
    for (const child of state.children) {
      if (child.type === 'path') continue;
      ensure(child);
      if (child.type === 'scope') requireProjection(child);
      appendState(children, executions.get(child)?.frame.state ?? layoutOf(child));
    }
    const result = emptyOutput();
    const compiled = state.compile!.value;
    result.geometries.push(
      ...projectScopeCompileLayouts(
        state.origin.own,
        { shape: compiled.shape, boundary: compiled.boundary, geometry: compiled.layout.overall.geometry },
        children.geometries,
        compiled.layout.overall.transforms,
      ),
    );
    result.primitives.push(...children.primitives);
    return result;
  };
  const appendState = (destination: SubtreeCompileState, contribution: WeaveAssembledOutput, includeLayouts = true) => {
    destination.primitives.push(...contribution.primitives);
    if (includeLayouts) destination.geometries.push(...contribution.geometries);
    destination.publications.push(...contribution.publications);
    destination.bounds.push(...contribution.bounds);
    destination.allocations.push(...contribution.allocations);
    destination.alignmentGuides.push(...contribution.alignmentGuides);
    destination.artifacts.push(...contribution.artifacts);
  };

  /** 按声明顺序聚合局部产物，不进行领域计算或发现环境 */
  const append = (
    destination: SubtreeCompileState,
    execution: WeaveElementExecution,
    output: CompileElementExecutor['output'],
  ) => {
    const state = execution.frame.state;
    destination.primitives.push(...state.primitives);
    destination.geometries.push(...state.geometries);
    destination.publications.push(...state.publications);
    destination.bounds.push(...state.bounds);
    destination.allocations.push(...state.allocations);
    destination.alignmentGuides.push(...state.alignmentGuides);
    destination.artifacts.push(...state.artifacts);
    for (const primitive of state.primitives) {
      if (primitive.type === 'path-placeholder') continue;
      const zIndex = execution.executor.output.zIndexMap.get(primitive);
      if (zIndex !== undefined) output.zIndexMap.set(primitive, zIndex);
    }
  };

  /** 汇集声明重复诊断与根输出，不执行元素计算 */
  const collectDeclarationsIfChanged = (root: WeaveRoot, indexesChanged: boolean) => {
    // 之前没有重名时，只需核对本批实际发布的名称及其出现次数；几何和来源位置不影响唯一性
    if (!indexesChanged && root.current?.uniqueDeclarations) {
      let unchanged = true;
      for (const [entry, execution] of executions) {
        if (entry.type === 'scope') continue;
        const previous = entry.current?.contribution?.bindings;
        if (
          previous?.length !== execution.bindings.length ||
          execution.bindings.some(
            (binding, i) => binding.id !== previous[i].id || binding.irPaths.length !== previous[i].irPaths.length,
          )
        ) {
          unchanged = false;
          break;
        }
      }
      if (unchanged) return;
    }
    let unique = true;
    const diagnosticNamespace = new NamespaceStack({
      rootIdentity: runtime.state.execution.namespaceStack.identity,
      onDuplicate: info => {
        unique = false;
        runtime.state.workspace.diagnosticCollector.collect(createDuplicateWarning(info));
      },
    });
    const collectDeclarations = (container: WeaveRoot | WeaveScopeEntry) => {
      for (const entry of transaction.readState(container).children) {
        if (entry.type === 'scope') {
          const own = transaction.readState(entry).origin.own;
          if (own.id !== undefined)
            diagnosticNamespace.register(own.id, {
              geometry: { position: [0, 0] },
              irPath: [...paths.get(entry)!, 'id'],
            });
          if (own.localNamespace) diagnosticNamespace.pushFrame();
          collectDeclarations(entry);
          if (own.localNamespace) diagnosticNamespace.popFrame();
        } else
          for (const binding of executions.get(entry)?.bindings ?? entry.current?.contribution?.bindings ?? [])
            diagnosticNamespace.commitForkChange(binding);
      }
    };
    collectDeclarations(root);
    transaction.editState(root).uniqueDeclarations = unique;
  };
  return { outputOf, layoutOf, appendState, append, collectDeclarationsIfChanged };
};
