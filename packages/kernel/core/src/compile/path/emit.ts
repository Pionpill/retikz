import type { PropertyPath } from '@retikz/foundation';

import type {
  AnyPathDefinition,
  ArrowDefinition,
  CompiledPathAppearance,
  InputPathBoundaryLabel,
  InputPathLabel,
  MarkDefinition,
  PathCompileContext,
  PathCompileResult,
  PatternDefinition,
  ScenePrimitive,
  SceneResource,
  TextMeasurer,
  Transform,
} from '../../contract';
import {
  createCompositeContractError,
  guardProviderOutput,
  resolvePathLabel,
  resolvePathLabelColors,
  resolvePath as resolvePathValue,
  resolveStrokePathProviders,
} from '../../resolve';
import type { IRPathBase, IRPosition, IRStep } from '../../schemas';
import type { NodeBoundaryStore } from '../node';
import type { RegisterPaint } from '../resource';
import type { CompileWarning, ComposedScopeTransform } from '../shared';
import { snapshotProviderPosition, snapshotScenePrimitives } from '../shared';
import type { TexLowerer } from '../text';
import { bindPathTargets } from './bind';
import { emitBoundaryLabelPrimitive, emitLabelPrimitive } from './host';
import { pathTargetViewOf } from './index';
import { emitPathPrimitive, lowerStrokePathGeometry, wrapPathPrimitiveOutput } from './stroke';
import type { PathTargetResolver } from './types';
import type { BoundPathResolution } from './types';
import type { InputPathCompilation } from './types';

/** Path 宿主编译所需的显式服务与本次工作区 */
export type PathHostCompileContext = Readonly<{
  /** 路径与装饰解析所需的定义 */
  registries: Readonly<{
    /** 路径主体定义 */
    pathRegistry: ReadonlyMap<string, AnyPathDefinition>;
    /** 箭头定义 */
    arrowRegistry: ReadonlyMap<string, ArrowDefinition>;
    /** 路径标记定义 */
    markRegistry: ReadonlyMap<string, MarkDefinition>;
    /** 图案定义 */
    patternRegistry: ReadonlyMap<string, PatternDefinition>;
  }>;
  /** 数值圆整 */
  round: (value: number) => number;
  /** 根字号 */
  rootFontSize: number;
  /** 文字测量 */
  measureText: TextMeasurer;
  /** 公式降级服务 */
  lowerTex?: TexLowerer;
  /** 几何缓存 */
  nodeBoundaryStore: NodeBoundaryStore;
  /** 资源登记 */
  registerPaint: RegisterPaint;
  /** 当前可读取的绘制与裁剪资源 */
  resources: () => ReadonlyArray<SceneResource>;
  /** 收集诊断，不向用户发布 */
  onWarn: (warning: CompileWarning) => void;
  /** 按坐标链提供合成变换 */
  resolveTransform: (chain: ReadonlyArray<Transform>) => ComposedScopeTransform;
}>;

/** 校验并脱离 BuiltinPath provider 返回的 primitive 与 bounds point */
const snapshotPathCompileResult = (
  kind: string,
  value: PathCompileResult | null,
  allowedResourceIds: ReadonlySet<string>,
) =>
  guardProviderOutput(`Path '${kind}'`, () => {
    if (value === null) return null;
    if ('resources' in value)
      throw createCompositeContractError(`Path '${kind}' output: provider cannot declare resources.`);
    const result = value;
    const primitives = snapshotScenePrimitives(`Path '${kind}'`, result.primitives, allowedResourceIds);
    const rawBoundsPoints = result.boundsPoints;
    const boundsPoints = Array.from(rawBoundsPoints, (point, index): IRPosition =>
      snapshotProviderPosition(`Path '${kind}' bounds point at index ${index}`, point),
    );

    return {
      result: { primitives, boundsPoints },
      source: result,
    };
  });

/** 消费已完成配置解析与目标绑定的路径，并提供内置 stroke emit 回调 */
export const emitDefinedPath = (
  pendingPath: InputPathCompilation,
  resolution: BoundPathResolution,
  targetResolver: PathTargetResolver,
  context: PathHostCompileContext,
) => {
  const { path, scopeChain, scopeDefaults, theme } = pendingPath;
  const { irPath, definition, targets, path: canonicalPath, source: pathSource } = resolution;
  const targetWarn = (code: string, message: string, node?: { irPath?: PropertyPath }): void =>
    context.onWarn({ code, message, path: node?.irPath ?? irPath });
  const targetView = pathTargetViewOf(targets, targetWarn, context.nodeBoundaryStore, context.resolveTransform);

  const kind = definition.name;
  const allowedResourceIds = new Set<string>();
  const registerPaint: RegisterPaint = paint => {
    const registered = context.registerPaint(paint);
    if (typeof registered === 'object' && registered.kind === 'resourceRef') allowedResourceIds.add(registered.id);
    return registered;
  };

  const emitOptions = {
    resources: context.resources,
    onWarn: context.onWarn,
    scopeChain,
    registerPaint,
    targetView,
    lowerTex: context.lowerTex,
    rootFontSize: context.rootFontSize,
  };
  const resolutionOf = (nextPath: IRPathBase): BoundPathResolution =>
    nextPath === path
      ? resolution
      : bindPathTargets(
          resolvePathValue(nextPath, {
            scopeDefaults,
            mode: theme.mode,
            pathRegistry: context.registries.pathRegistry,
            arrowRegistry: context.registries.arrowRegistry,
            markRegistry: context.registries.markRegistry,
            patternRegistry: context.registries.patternRegistry,
            round: context.round,
            irPath,
          }),
          { scopeChain, targetResolver },
        );

  const emitStroke = (nextPath?: IRPathBase) => {
    const source = nextPath ?? path;
    const sourceResolution = resolutionOf(source);
    const strokeResolution = resolveStrokePathProviders(sourceResolution, {
      mode: theme.mode,
      pathRegistry: context.registries.pathRegistry,
      arrowRegistry: context.registries.arrowRegistry,
      markRegistry: context.registries.markRegistry,
      patternRegistry: context.registries.patternRegistry,
      round: context.round,
      irPath,
    });
    const emittedTargetView = pathTargetViewOf(
      strokeResolution.targets,
      targetWarn,
      context.nodeBoundaryStore,
      context.resolveTransform,
    );
    const emitted = emitPathPrimitive(strokeResolution, {
      targetView: emittedTargetView,
      round: context.round,
      measureText: context.measureText,
      options: {
        ...emitOptions,
      },
    });

    return emitted;
  };

  const materializePath = (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => {
    const pathWithoutKindOptions = { ...path };
    delete pathWithoutKindOptions.kindOptions;
    const source: IRPathBase = {
      ...pathWithoutKindOptions,
      kind: 'stroke',
      children: (input?.children ?? path.children ?? []).map(step =>
        'label' in step ? { ...step, label: undefined } : step,
      ),
      label: undefined,
      marks: undefined,
      style: { ...path.style, color: undefined, fill: undefined, stroke: undefined, strokeWidth: undefined },
      rotate: undefined,
      scale: undefined,
    };
    const emittedResolution = resolutionOf(source);
    const geometry = lowerStrokePathGeometry(emittedResolution, {
      targetView: pathTargetViewOf(
        emittedResolution.targets,
        targetWarn,
        context.nodeBoundaryStore,
        context.resolveTransform,
      ),
      round: context.round,
      measureText: context.measureText,
      options: emitOptions,
    });

    return geometry?.commands ?? [];
  };

  const resolvedFill = canonicalPath.fill === undefined ? undefined : emitOptions.registerPaint(canonicalPath.fill);
  const resolvedStroke =
    canonicalPath.stroke === undefined ? undefined : emitOptions.registerPaint(canonicalPath.stroke);
  const appearance: CompiledPathAppearance = Object.freeze({
    ...(canonicalPath.color === undefined ? {} : { color: canonicalPath.color }),
    ...(resolvedFill === undefined ? {} : { fill: resolvedFill }),
    ...(resolvedStroke === undefined ? {} : { stroke: resolvedStroke }),
    ...(canonicalPath.fillRule === undefined ? {} : { fillRule: canonicalPath.fillRule }),
    strokeWidth: canonicalPath.strokeWidth,
    ...(canonicalPath.dashPattern === undefined ? {} : { dashPattern: canonicalPath.dashPattern }),
    ...(canonicalPath.dashOffset === undefined ? {} : { dashOffset: canonicalPath.dashOffset }),
    ...(canonicalPath.lineCap === undefined ? {} : { lineCap: canonicalPath.lineCap }),
    ...(canonicalPath.lineJoin === undefined ? {} : { lineJoin: canonicalPath.lineJoin }),
    ...(canonicalPath.opacity === undefined ? {} : { opacity: canonicalPath.opacity }),
    ...(canonicalPath.fillOpacity === undefined ? {} : { fillOpacity: canonicalPath.fillOpacity }),
    ...(canonicalPath.strokeOpacity === undefined ? {} : { strokeOpacity: canonicalPath.strokeOpacity }),
    ...(canonicalPath.shadow === undefined ? {} : { shadow: canonicalPath.shadow }),
    ...(canonicalPath.blendMode === undefined ? {} : { blendMode: canonicalPath.blendMode }),
  });

  const hostLabelBoundsPoints: Array<IRPosition> = [];
  const resolveHostLabel: PathCompileContext['resolveHostLabel'] = label =>
    resolvePathLabel(label, scopeDefaults.path?.label ?? {}, canonicalPath.color);
  const emitHostLabels = (input: InputPathLabel): ReadonlyArray<ScenePrimitive> =>
    input.labels.flatMap((label, index) => {
      const sample = input.samples[index];
      const labelDefault = scopeDefaults.path?.label ?? {};
      const sourcePath = [...irPath, ...input.sourcePath, index];
      const { side, ...labelSource } = label;
      const { position, distance } = labelSource;
      const styled = resolvePathLabelColors(
        labelSource,
        labelDefault.color ?? canonicalPath.color,
        theme.mode,
        sourcePath,
      );
      const emittedLabel = emitLabelPrimitive(
        { ...styled, position, side, distance, interrupt: false, gap: 0 },
        sample,
        {
          measureText: context.measureText,
          round: context.round,
          rootFontSize: context.rootFontSize,
          hostOpacity: canonicalPath.opacity,
          placement: { sideOffset: sample.sideOffset },
          tex: {
            lowerTex: context.lowerTex,
            gatingOn: context.lowerTex !== undefined,
            warn: (code, message) => targetWarn(code, message, { irPath: sourcePath }),
          },
        },
      );
      hostLabelBoundsPoints.push(...emittedLabel.boundsPoints);

      return [emittedLabel.primitive];
    });
  const emitBoundaryLabels = (input: ReadonlyArray<InputPathBoundaryLabel>): ReadonlyArray<ScenePrimitive> =>
    input.map(request => {
      const labelDefault = scopeDefaults.path?.label ?? {};
      const styled = resolvePathLabelColors(
        resolvePathLabel(request.label, labelDefault, canonicalPath.color),
        labelDefault.color ?? canonicalPath.color,
        theme.mode,
        [...irPath, ...request.sourcePath],
      );
      const emitted = emitBoundaryLabelPrimitive(request, styled, {
        measureText: context.measureText,
        round: context.round,
        rootFontSize: context.rootFontSize,
        hostOpacity: canonicalPath.opacity,
        tex: {
          lowerTex: context.lowerTex,
          gatingOn: context.lowerTex !== undefined,
          warn: (code, message) => targetWarn(code, message, { irPath: [...irPath, ...request.sourcePath] }),
        },
      });
      hostLabelBoundsPoints.push(...emitted.boundsPoints);
      if (path.meta !== undefined) emitted.primitive.meta = path.meta;

      return emitted.primitive;
    });

  const compilePath = definition.compile as (context: PathCompileContext) => PathCompileResult | null;
  const produced = compilePath({
    path: pathSource,
    materializePath,
    emitStroke,
    emitHostLabels,
    resolveHostLabel,
    emitBoundaryLabels,
    wrapOutput: output =>
      guardProviderOutput(`Path '${kind}'`, () => {
        const boundsPoints = [...output.boundsPoints, ...hostLabelBoundsPoints];
        const primitives = [...output.primitives];
        const primitive = primitives.at(0);
        if (primitive === undefined) return { primitives, boundsPoints };

        return wrapPathPrimitiveOutput({
          path: canonicalPath,
          primitive,
          bodyPrims: primitives,
          boundsPoints,
          round: context.round,
        });
      }),
    appearance,
    round: context.round,
  });

  const validated = snapshotPathCompileResult(kind, produced, allowedResourceIds);
  if (validated === null) {
    return null;
  }

  return validated.result;
};
