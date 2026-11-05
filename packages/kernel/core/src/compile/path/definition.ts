import type { PropertyPath } from '@retikz/foundation';

import type { CompiledPathAppearance, PathDefinitionCompileContext } from '../../contract';
import { guardProviderOutput, resolvePath as resolvePathValue, resolveStrokePathProviders } from '../../resolve';
import type { IRPathBase, IRStep } from '../../schemas';
import type { RegisterPaint } from '../resource';
import { bindPathTargets } from './bind';
import { createPathLabelCallbacks } from './host';
import { emitPathPrimitive, lowerStrokePathGeometry, wrapPathPrimitiveOutput } from './stroke';
import { pathTargetViewOf } from './target';
import type { BoundPathResolution, PathCompileContext } from './types';

/** 为一次路径 Definition 调用组装受控的宿主能力，不跨编译保存状态 */
export const createPathDefinitionContext = (
  resolution: BoundPathResolution,
  context: PathCompileContext,
  allowedResourceIds: Set<string>,
): PathDefinitionCompileContext => {
  const {
    scopeChain,
    scopeDefaults,
    theme,
    targetResolver,
    onWarn,
    boundaryStore,
    resolveTransform,
    registerPaint: registerContextPaint,
    resources,
    lowerTex,
    rootFontSize,
    registries,
    round,
    measureText,
  } = context;
  const { irPath, definition, targets, properties: canonicalPath } = resolution;
  const targetWarn = (code: string, message: string, node?: { irPath?: PropertyPath }): void =>
    onWarn({ code, message, path: node?.irPath ?? irPath });
  const targetView = pathTargetViewOf(targets, targetWarn, boundaryStore, resolveTransform);

  const kind = definition.name;
  const registerPaint: RegisterPaint = paint => {
    const registered = registerContextPaint(paint);
    if (typeof registered === 'object' && registered.kind === 'resourceRef') allowedResourceIds.add(registered.id);
    return registered;
  };

  const emitOptions = {
    resources,
    onWarn,
    scopeChain,
    registerPaint,
    targetView,
    lowerTex,
  };
  const resolutionOf = (nextPath: IRPathBase): BoundPathResolution =>
    bindPathTargets(
      resolvePathValue(nextPath, {
        scopeDefaults,
        rootFontSize,
        gatingOn: lowerTex !== undefined,
        warn: targetWarn,
        mode: theme.mode,
        pathRegistry: registries.pathRegistry,
        arrowRegistry: registries.arrowRegistry,
        markRegistry: registries.markRegistry,
        patternRegistry: registries.patternRegistry,
        round,
        irPath,
      }),
      { scopeChain, targetResolver },
    );

  const emitStroke = (nextPath?: IRPathBase) => {
    const sourceResolution = nextPath === undefined ? resolution : resolutionOf(nextPath);
    const strokeResolution =
      sourceResolution.stroke === undefined
        ? resolveStrokePathProviders(sourceResolution, {
            rootFontSize,
            gatingOn: lowerTex !== undefined,
            warn: targetWarn,
            mode: theme.mode,
            pathRegistry: registries.pathRegistry,
            arrowRegistry: registries.arrowRegistry,
            markRegistry: registries.markRegistry,
            patternRegistry: registries.patternRegistry,
            round,
            irPath,
          })
        : { ...sourceResolution, ...sourceResolution.stroke };
    const emittedTargetView = pathTargetViewOf(strokeResolution.targets, targetWarn, boundaryStore, resolveTransform);
    const emitted = emitPathPrimitive(strokeResolution, {
      targetView: emittedTargetView,
      round,
      measureText,
      options: {
        ...emitOptions,
      },
    });

    return emitted;
  };

  const materializePath = (input?: Readonly<{ children?: ReadonlyArray<IRStep> }>) => {
    const base =
      input?.children === undefined
        ? resolution
        : resolutionOf({
            type: 'path',
            kind: 'stroke',
            children: input.children.map(step => ('label' in step ? { ...step, label: undefined } : step)),
          });
    const emittedResolution = {
      ...base,
      properties: {
        ...base.properties,
        children: base.properties.children?.map(step => ('label' in step ? { ...step, label: undefined } : step)),
        label: undefined,
        marks: undefined,
        fill: undefined,
        stroke: undefined,
        strokeWidth: 1,
        rotate: undefined,
        scale: undefined,
      },
    };
    const geometry = lowerStrokePathGeometry(emittedResolution, {
      targetView: pathTargetViewOf(emittedResolution.targets, targetWarn, boundaryStore, resolveTransform),
      round,
      measureText,
      options: emitOptions,
    });

    return geometry?.commands ?? [];
  };

  const resolvedFill = canonicalPath.fill === undefined ? undefined : emitOptions.registerPaint(canonicalPath.fill);
  const resolvedStroke =
    canonicalPath.stroke === undefined ? undefined : emitOptions.registerPaint(canonicalPath.stroke);
  const appearance: CompiledPathAppearance = Object.freeze({
    strokeEnabled: canonicalPath.strokeEnabled,
    ...(canonicalPath.color === undefined ? {} : { color: canonicalPath.color }),
    ...(resolvedFill === undefined ? {} : { fill: resolvedFill }),
    ...(resolvedStroke === undefined ? {} : { stroke: resolvedStroke }),
    fillRule: canonicalPath.fillRule,
    strokeWidth: canonicalPath.strokeWidth,
    ...(canonicalPath.dashPattern.length === 0 ? {} : { dashPattern: canonicalPath.dashPattern }),
    dashOffset: canonicalPath.dashOffset,
    lineCap: canonicalPath.lineCap,
    lineJoin: canonicalPath.lineJoin,
    opacity: canonicalPath.opacity,
    fillOpacity: canonicalPath.fillOpacity,
    strokeOpacity: canonicalPath.strokeOpacity,
    ...(canonicalPath.shadow === undefined ? {} : { shadow: canonicalPath.shadow }),
    blendMode: canonicalPath.blendMode,
  });

  const { emitHostLabels, resolveHostLabel, emitBoundaryLabels, hostLabelBoundsPoints } = createPathLabelCallbacks(
    resolution,
    context,
    targetWarn,
  );

  return {
    path: canonicalPath,
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
          round,
        });
      }),
    appearance,
    round,
  };
};
