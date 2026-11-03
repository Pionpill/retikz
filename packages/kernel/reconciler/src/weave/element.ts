import type {
  CompiledCoordinate,
  CompiledNode,
  CompiledPath,
  CompiledScope,
  CompiledNodeLayout,
  IRCoordinate,
  IRNode,
  IRPathBase,
  InputScopeCompile,
  ScopeGeometryPreparation,
  ScopeStyleResolution,
} from '@retikz/core';
import {
  resolveNode,
  layoutNode,
  emitNodeOutput,
  resolveCoordinatePosition,
  resolvePathAnimations,
  compilePath,
  createPathTargetResolver,
  composeScopeTransform,
  resolveScopeStyle,
  prepareScopeGeometry,
  compileScopeGeometry,
  createScopeGroup,
} from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { WeaveElementRuntime } from './compile';

/** 在候选工作区组合节点解析、布局与输出，不发布结果 */
export const compileWeaveNode = (input: IRNode, runtime: WeaveElementRuntime): CompiledNode => {
  const { options, workspace, positionContext, composedTransform } = runtime;
  const { shared, style, irPath } = options;
  const warn = (code: string, message: string, path: PropertyPath = irPath): void =>
    workspace.diagnosticCollector.collect({ code, message, path });
  const resolution = resolveNode(input, {
    ...shared.registries,
    ...shared.layout,
    scopeDefaults: style.defaults,
    mode: style.theme.mode,
    irPath,
    warn,
  });
  const compilation = layoutNode(resolution, {
    measureText: shared.host.measureText,
    positionContext,
    composedTransform,
    nodeBoundaryStore: workspace.nodeBoundaryStore,
    scopeChain: options.transforms,
    rootFontSize: shared.layout.rootFontSize,
    allocationWidthProposal: options.proposal?.x,
    warn,
    texLowering: { lowerTex: shared.host.lowerTex, warn },
  });
  const output = emitNodeOutput(compilation, {
    round: shared.layout.round,
    registerPaint: workspace.paintRegistry.register,
  });
  return Object.freeze({
    ...compilation,
    output: Object.freeze({ ...output, zIndex: input.zIndex, resources: workspace.paintRegistry.getResources() }),
  });
};

/** 记录坐标解析的独立事实，引用投影由发布阶段按需执行 */
export const compileWeaveCoordinate = (input: IRCoordinate, runtime: WeaveElementRuntime): CompiledCoordinate =>
  Object.freeze({
    irPath: runtime.options.irPath,
    id: input.id,
    position: resolveCoordinatePosition(input, runtime.positionContext),
  });

/** 在引用就绪点组合路径准备与 kind 宿主计算 */
export const compileWeavePath = (input: IRPathBase, runtime: WeaveElementRuntime): CompiledPath => {
  const { options, workspace, positionContext } = runtime;
  const { shared, style, irPath } = options;
  const path = resolvePathAnimations(input, irPath, workspace.diagnosticCollector.collect);
  const { result, resolution } = compilePath(
    {
      path,
      irPath,
      scopeChain: options.transforms ?? [],
      scopeDefaults: style.defaults,
      theme: style.theme,
    },
    createPathTargetResolver(() => positionContext),
    {
      registries: shared.registries,
      ...shared.layout,
      ...shared.host,
      nodeBoundaryStore: workspace.nodeBoundaryStore,
      registerPaint: workspace.paintRegistry.register,
      resources: () => [...workspace.paintRegistry.getResources(), ...workspace.clipRegistry.getResources()],
      onWarn: workspace.diagnosticCollector.collect,
      resolveTransform: composeScopeTransform,
    },
  );
  return Object.freeze({
    irPath,
    output: Object.freeze({
      zIndex: input.zIndex,
      primitives: result?.primitives ?? [],
      resources: workspace.paintRegistry.getResources(),
      bounds: result === null ? [] : [{ boundsPoints: result.boundsPoints, shadow: resolution.path.shadow }],
    }),
  });
};

/** 候选 Scope 下传样式及前置几何，生命周期归本次遍历 */
export type WeaveScopePreparation = ScopeGeometryPreparation &
  Readonly<{
    /** 子元素继承的有效样式 */
    scope: ScopeStyleResolution;
  }>;

/** 在子元素计算前组合样式与放置准备 */
export const prepareWeaveScope = (input: InputScopeCompile, runtime: WeaveElementRuntime): WeaveScopePreparation => {
  const { options, workspace, positionContext } = runtime;
  return Object.freeze({
    scope: resolveScopeStyle(input, options.shared.registries.themeRegistry, options.style, options.irPath),
    ...prepareScopeGeometry(input, {
      positionContext,
      irPath: options.irPath,
      onWarn: workspace.diagnosticCollector.collect,
    }),
  });
};

/** 在子布局完成后组合 Scope 包络、变换与自身输出 */
export const compileWeaveScope = (
  input: InputScopeCompile,
  preparation: ScopeGeometryPreparation,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  runtime: WeaveElementRuntime,
): CompiledScope => {
  const { options, workspace, positionContext } = runtime;
  const { shared, irPath } = options;
  const { envelope, transforms } = compileScopeGeometry(
    input,
    preparation,
    layouts,
    { shapes: shared.registries.shapeRegistry, boundaries: shared.registries.boundaryRegistry },
    { positionContext, irPath, onWarn: workspace.diagnosticCollector.collect },
  );
  const group = createScopeGroup(
    input,
    transforms,
    {
      clipRegistry: shared.registries.clipRegistry,
      registerClip: workspace.clipRegistry.register,
      registerClipPath: workspace.clipRegistry.registerPath,
    },
    irPath,
  );
  return Object.freeze({
    irPath,
    envelope,
    group: Object.freeze(group),
    output: Object.freeze({
      zIndex: input.zIndex,
      primitives: [],
      bounds: [],
      resources: [...workspace.paintRegistry.getResources(), ...workspace.clipRegistry.getResources()],
    }),
  });
};
