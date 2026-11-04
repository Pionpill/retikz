import type {
  CompiledNode,
  CompileOutput,
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
  resolvePosition,
  createLayoutProbeRecoverableError,
  createCoordinateLayout,
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

import type { ScopeOutput } from '../helpers/scope-output';
import type { WeaveElementRuntime } from './atomic-runtime';

/** 节点阶段产物与当前工作区绘制输出，分别交给执行器保存 */
export type WeaveNodeCompilation = {
  /** Core 产生的权威布局阶段结果 */
  compiled: CompiledNode;
  /** 绘制阶段输出及资源 */
  output: CompileOutput;
};

/** 在候选工作区组合节点解析、布局与输出，不发布结果 */
export const compileWeaveNode = (input: IRNode, runtime: WeaveElementRuntime): WeaveNodeCompilation => {
  const { options, workspace, positionContext, composedTransform } = runtime;
  const { shared, style, irPath, transforms, proposal } = options;
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
    scopeChain: transforms,
    rootFontSize: shared.layout.rootFontSize,
    allocationWidthProposal: proposal?.x,
    warn,
    texLowering: { lowerTex: shared.host.lowerTex, warn },
  });
  const output = emitNodeOutput(compilation, {
    round: shared.layout.round,
    registerPaint: workspace.paintRegistry.register,
  });
  return Object.freeze({
    compiled: compilation,
    output: Object.freeze({ ...output, zIndex: input.zIndex, resources: workspace.paintRegistry.getResources() }),
  });
};

/** 记录坐标解析的独立事实，引用投影由发布阶段按需执行 */
export const compileWeaveCoordinate = (input: IRCoordinate, runtime: WeaveElementRuntime): CompiledNodeLayout => {
  const position = resolvePosition(input.position, runtime.positionContext)?.localPoint;
  if (position === undefined) {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve position for coordinate ${input.id}; polar.origin or at.of may reference an undefined node`,
    );
  }
  return createCoordinateLayout(position, runtime.options.shared.registries.shapeRegistry);
};

/** Path 编译结果与所属工作区资源输出 */
export type WeavePathCompilation = {
  /** Core 宿主编译阶段结果 */
  compiled: CompiledPath;
  /** 绘制输出及其资源 */
  output: CompileOutput;
};

/** 在引用就绪点组合路径准备与 kind 宿主计算 */
export const compileWeavePath = (input: IRPathBase, runtime: WeaveElementRuntime): WeavePathCompilation => {
  const { options, workspace, positionContext } = runtime;
  const { shared, style, irPath, transforms } = options;
  const path = resolvePathAnimations(input, irPath, workspace.diagnosticCollector.collect);
  const compiled = compilePath(
    {
      path,
      irPath,
      scopeChain: transforms ?? [],
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
    compiled,
    output: Object.freeze({
      zIndex: input.zIndex,
      primitives: compiled.result?.primitives ?? [],
      resources: workspace.paintRegistry.getResources(),
      bounds:
        compiled.result === null
          ? []
          : [{ boundsPoints: compiled.result.boundsPoints, shadow: compiled.resolution.path.shadow }],
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

/** Scope 独立阶段结果，由执行器分别保存 */
export type WeaveScopeCompilation = ScopeOutput & {
  /** Core 产生的包络与自身变换 */
  compiled: CompiledScope;
};

/** 在子布局完成后组合 Scope 包络、变换与自身输出 */
export const compileWeaveScope = (
  input: InputScopeCompile,
  preparation: ScopeGeometryPreparation,
  layouts: ReadonlyArray<CompiledNodeLayout>,
  runtime: WeaveElementRuntime,
): WeaveScopeCompilation => {
  const { options, workspace, positionContext } = runtime;
  const { shared, irPath } = options;
  const compiled = compileScopeGeometry(
    input,
    preparation,
    layouts,
    { shapes: shared.registries.shapeRegistry, boundaries: shared.registries.boundaryRegistry },
    { positionContext, irPath, onWarn: workspace.diagnosticCollector.collect },
  );
  const group = createScopeGroup(
    input,
    compiled.transforms,
    {
      clipRegistry: shared.registries.clipRegistry,
      registerClip: workspace.clipRegistry.register,
      registerClipPath: workspace.clipRegistry.registerPath,
    },
    irPath,
  );
  return Object.freeze({
    compiled,
    group: Object.freeze(group),
    output: Object.freeze({
      zIndex: input.zIndex,
      primitives: [],
      bounds: [],
      resources: [...workspace.paintRegistry.getResources(), ...workspace.clipRegistry.getResources()],
    }),
  });
};
