import type {
  EmitStrokeOwnerOutputOptions,
  InputPathBoundaryLabel,
  PathCompileContext,
  InputPathLabel,
  CompiledPathAppearance,
  ScenePrimitive,
  Transform,
} from '../../contract';
import type { PathResolution, PathTargetResolver } from '../../resolve';
import {
  resolvePathLabel,
  resolvePathLabelColors,
  resolvePath as resolvePathValue,
  resolveStrokePathProviders,
} from '../../resolve';
import { createCompositeContractError } from '../../resolve/diagnostics';
import type { IRPathBase, IRPosition, IRStep } from '../../schemas';
import { formatCompileOccurrence } from '../artifact';
import type { CompileEnvironment } from '../environment';
import type { NodeGeometryContext } from '../node';
import type { CompileObservationRuntime, PendingPathEmission } from '../orchestration';
import { createOwnerOutputPublisher, freezeOccurrence, pathTargetViewOf } from '../orchestration';
import type { ClipRegistry, PaintRegistry } from '../resource';
import {
  snapshotProviderPosition,
  snapshotScenePrimitives,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';
import type { ComposedScopeTransform } from '../transform';
import type { InputCompileWarning } from '../warning';
import { emitBoundaryLabelPrimitive, emitLabelPrimitive } from './host';
import { emitPathPrimitive, lowerStrokePathGeometry, wrapPathPrimitiveOutput } from './stroke';

/** Path 宿主编译所需的显式服务与本次工作区 */
type PathCompileHost = Pick<
  CompileEnvironment,
  'round' | 'lowerTex' | 'rootFontSize' | 'paths' | 'arrows' | 'marks' | 'patterns' | 'measureText'
> & {
  /** 本次几何缓存 */
  nodeGeometry: NodeGeometryContext;
  /** 本次绘制资源 */
  paint: PaintRegistry;
  /** 本次裁剪资源 */
  clip: ClipRegistry;
  /** 本次诊断收集器 */
  onWarn: (warning: InputCompileWarning) => void;
  /** 本次观察会话 */
  observation: CompileObservationRuntime | undefined;
  /** Core 提供的坐标变换解析 */
  resolveTransform: (chain: ReadonlyArray<Transform>) => ComposedScopeTransform;
};
/** 校验并脱离 BuiltinPath provider 返回的 primitive 与 bounds point */
const assertPathCompileResult = (kind: string, value: unknown) =>
  withProviderOutputValidationBoundary(`Path '${kind}'`, () => {
    if (value === null) return null;
    if (typeof value !== 'object') {
      throw createCompositeContractError(`Path '${kind}' must return a compile result object or null.`);
    }

    const result = value as Record<string, unknown>;
    const primitives = snapshotScenePrimitives(`Path '${kind}'`, result.primitives);
    const rawBoundsPoints = result.boundsPoints;
    const boundsPoints = Array.from(rawBoundsPoints as Iterable<IRPosition>, (point, index): IRPosition =>
      snapshotProviderPosition(`Path '${kind}' bounds point at index ${index}`, point),
    );

    return {
      result: { primitives, boundsPoints },
      source: result,
    };
  });

/** 消费 resolve/path 已绑定的 path，并提供内置 stroke emit 回调 */
export const emitDefinedPath = (
  pendingPath: Pick<
    PendingPathEmission,
    'path' | 'scopeChain' | 'irPath' | 'occurrence' | 'scopeDefaults' | 'theme' | 'ancestors' | 'observationSink'
  >,
  resolution: PathResolution,
  targetResolver: PathTargetResolver,
  context: PathCompileHost,
) => {
  const { path, scopeChain } = pendingPath;
  const { irPath } = resolution;
  const targetWarn = (code: string, message: string, node?: { irPath?: string }): void =>
    context.onWarn({ code, message, path: node?.irPath ?? irPath });
  const targetView = pathTargetViewOf(resolution.targets, targetWarn, context.nodeGeometry, context.resolveTransform);
  const { name: kind, definition } = resolution.kind;
  const observationOwner = Object.freeze({ kind: 'path' as const, name: kind });
  const ownerOutput = createOwnerOutputPublisher(
    observationOwner,
    pendingPath.occurrence.sourcePath,
    definition.ownerOutput,
    context.observation,
  );

  const emitOptions = {
    resources: () => [...context.paint.resources(), ...context.clip.resources()],
    onWarn: context.onWarn,
    scopeChain,
    resolvePaint: context.paint.register,
    targetView,
    lowerTex: context.lowerTex,
    rootFontSize: context.rootFontSize,
  };
  const resolutionOf = (nextPath: IRPathBase): PathResolution =>
    nextPath === path
      ? resolution
      : resolvePathValue(nextPath, {
          scopeDefaults: pendingPath.scopeDefaults,
          mode: pendingPath.theme.mode,
          scopeChain,
          targetResolver,
          pathRegistry: context.paths,
          arrowRegistry: context.arrows,
          markRegistry: context.marks,
          patternRegistry: context.patterns,
          round: context.round,
          irPath,
        });

  const emitStroke = (nextPath?: IRPathBase, request?: EmitStrokeOwnerOutputOptions) => {
    const source = nextPath ?? path;
    const sourceResolution = resolutionOf(source);
    const strokeResolution = resolveStrokePathProviders(sourceResolution, {
      mode: pendingPath.theme.mode,
      pathRegistry: context.paths,
      arrowRegistry: context.arrows,
      markRegistry: context.marks,
      patternRegistry: context.patterns,
      round: context.round,
      irPath,
    });
    const emittedTargetView = pathTargetViewOf(
      strokeResolution.targets,
      targetWarn,
      context.nodeGeometry,
      context.resolveTransform,
    );
    const emitted = emitPathPrimitive(strokeResolution, {
      targetView: emittedTargetView,
      round: context.round,
      measureText: context.measureText,
      options: {
        ...emitOptions,
        ...(request === undefined ? {} : { captureOwnerOutput: request.captureOwnerOutput }),
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
        context.nodeGeometry,
        context.resolveTransform,
      ),
      round: context.round,
      measureText: context.measureText,
      options: emitOptions,
    });

    return geometry?.commands ?? [];
  };

  const resolvedFill = resolution.path.fill === undefined ? undefined : emitOptions.resolvePaint(resolution.path.fill);
  const resolvedStroke =
    resolution.path.stroke === undefined ? undefined : emitOptions.resolvePaint(resolution.path.stroke);
  const appearance: CompiledPathAppearance = Object.freeze({
    ...(resolution.path.color === undefined ? {} : { color: resolution.path.color }),
    ...(resolvedFill === undefined ? {} : { fill: resolvedFill }),
    ...(resolvedStroke === undefined ? {} : { stroke: resolvedStroke }),
    ...(resolution.path.fillRule === undefined ? {} : { fillRule: resolution.path.fillRule }),
    strokeWidth: resolution.path.strokeWidth,
    ...(resolution.path.dashPattern === undefined ? {} : { dashPattern: resolution.path.dashPattern }),
    ...(resolution.path.dashOffset === undefined ? {} : { dashOffset: resolution.path.dashOffset }),
    ...(resolution.path.lineCap === undefined ? {} : { lineCap: resolution.path.lineCap }),
    ...(resolution.path.lineJoin === undefined ? {} : { lineJoin: resolution.path.lineJoin }),
    ...(resolution.path.opacity === undefined ? {} : { opacity: resolution.path.opacity }),
    ...(resolution.path.fillOpacity === undefined ? {} : { fillOpacity: resolution.path.fillOpacity }),
    ...(resolution.path.strokeOpacity === undefined ? {} : { strokeOpacity: resolution.path.strokeOpacity }),
    ...(resolution.path.shadow === undefined ? {} : { shadow: resolution.path.shadow }),
    ...(resolution.path.blendMode === undefined ? {} : { blendMode: resolution.path.blendMode }),
  });

  const hostLabelBoundsPoints: Array<IRPosition> = [];
  const resolveHostLabel: PathCompileContext['resolveHostLabel'] = label =>
    resolvePathLabel(label, pendingPath.scopeDefaults.path?.label ?? {}, resolution.path.color);
  const emitHostLabels = (input: InputPathLabel): ReadonlyArray<ScenePrimitive> =>
    input.labels.flatMap((label, index) => {
      const sample = input.samples[index];
      const labelDefault = pendingPath.scopeDefaults.path?.label ?? {};
      const sourcePath = `${irPath}.${input.sourcePath}[${index}]`;
      const { side, ...labelSource } = label;
      const styled = resolvePathLabelColors(
        labelSource,
        labelDefault.color ?? resolution.path.color,
        { mode: pendingPath.theme.mode },
        sourcePath,
      );
      const emittedLabel = emitLabelPrimitive(
        { ...styled, position: label.position, side, distance: label.distance, interrupt: false, gap: 0 },
        sample,
        {
          measureText: context.measureText,
          round: context.round,
          rootFontSize: context.rootFontSize,
          hostOpacity: resolution.path.opacity,
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
      const labelDefault = pendingPath.scopeDefaults.path?.label ?? {};
      const styled = resolvePathLabelColors(
        resolvePathLabel(request.label, labelDefault, resolution.path.color),
        labelDefault.color ?? resolution.path.color,
        { mode: pendingPath.theme.mode },
        `${irPath}.${request.sourcePath}`,
      );
      const emitted = emitBoundaryLabelPrimitive(request, styled, {
        measureText: context.measureText,
        round: context.round,
        rootFontSize: context.rootFontSize,
        hostOpacity: resolution.path.opacity,
        tex: {
          lowerTex: context.lowerTex,
          gatingOn: context.lowerTex !== undefined,
          warn: (code, message) => targetWarn(code, message, { irPath: `${irPath}.${request.sourcePath}` }),
        },
      });
      hostLabelBoundsPoints.push(...emitted.boundsPoints);
      if (path.meta !== undefined) emitted.primitive.meta = path.meta;

      return emitted.primitive;
    });

  const compilePath = definition.compile as unknown as (context: PathCompileContext) => unknown;
  const produced = compilePath({
    path: resolution.kind.path,
    ownerOutput: ownerOutput.publisher,
    materializePath,
    emitStroke,
    emitHostLabels,
    resolveHostLabel,
    emitBoundaryLabels,
    wrapOutput: output =>
      withProviderOutputValidationBoundary(`Path '${kind}'`, () => {
        const boundsPoints = [...output.boundsPoints, ...hostLabelBoundsPoints];
        const primitives = [...output.primitives];
        const primitive = primitives.at(0);
        if (primitive === undefined) return { primitives, boundsPoints };

        return wrapPathPrimitiveOutput({
          path: resolution.path,
          primitive,
          bodyPrims: primitives,
          boundsPoints,
          round: context.round,
        });
      }),
    appearance,
    round: context.round,
  });

  const validated = assertPathCompileResult(kind, produced);
  if (validated === null) {
    if (ownerOutput.publisher.requested && ownerOutput.hasPublished()) {
      throw createCompositeContractError(
        `Path '${kind}' at ${formatCompileOccurrence(pendingPath.occurrence)} must not publish owner output when it returns null.`,
      );
    }

    return null;
  }

  const value = ownerOutput.value();
  if (ownerOutput.publisher.requested && value === undefined) {
    throw createCompositeContractError(
      `Path '${kind}' at ${formatCompileOccurrence(pendingPath.occurrence)} must publish its owner output exactly once.`,
    );
  }

  if (value !== undefined) {
    pendingPath.observationSink.push({
      owner: observationOwner,
      ancestors: pendingPath.ancestors,
      occurrence: freezeOccurrence(pendingPath.occurrence),
      origin: freezeOccurrence(pendingPath.occurrence),
      scopeChain,
      value,
      observerKeys: ownerOutput.keys,
      theme: pendingPath.theme,
      scopeDefaults: pendingPath.scopeDefaults,
    });
  }

  return validated.result;
};
