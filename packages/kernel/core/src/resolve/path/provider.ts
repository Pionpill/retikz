import type { ArrowDefinition } from '../../contract';
import type { IRArrowMark, IRPathBase } from '../../schemas';
import type {
  ArrowMarkGeometry,
  ArrowMarkResolution,
  ArrowMarkVisual,
  CanonicalStep,
  PathGeneratorResolution,
  PathKindResolution,
  PathResolution,
  PathResolveContext,
  StrokePathResolution,
} from './types';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import { providerDefinitionOf } from '../../providers/registry';
import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  DEFAULT_ARROW_SHAPE,
  JsonObjectSchema,
} from '../../schemas';
import { RetikzCompositeContractError } from '../diagnostics';
import { parseProviderPayload } from '../provider-payload';

const ARROW_GEOMETRY_BASE_SIZE = 10;
/** 主路径进入 marker 接触边的描边宽度比例 */
const ARROW_PATH_CONTACT_OVERLAP = 0.5;

/** 解析 path kind provider */
export const resolvePathKind = (path: IRPathBase, context: PathResolveContext, irPath: string): PathKindResolution => {
  const kind = path.kind ?? 'stroke';
  const definition = providerDefinitionOf(context.pathKinds, kind, {
    capability: 'path kind',
    optionName: 'pathKinds',
  });
  const parsed = parseProviderPayload({
    capability: 'path kind',
    providerName: kind,
    irPath,
    payloadName: 'path',
    schema: definition.schema,
    value: path,
  });
  return { name: kind, definition, path: parsed as IRPathBase };
};

/** 解析 generator step 的 provider 与 params */
export const resolvePathGenerator = (
  step: Extract<CanonicalStep, { kind: 'generator' }>,
  stepIndex: number,
  context: PathResolveContext,
  irPath: string,
): PathGeneratorResolution => {
  const definition = providerDefinitionOf(context.pathGenerators, step.name, {
    capability: 'path generator',
    optionName: 'pathGenerators',
  });
  const paramsPath = `${irPath}.params`;
  const parsed = parseProviderPayload({
    capability: 'path generator',
    providerName: step.name,
    irPath: paramsPath,
    payloadName: 'params',
    schema: definition.paramsSchema,
    value: step.params,
  });
  const params = parseProviderPayload({
    capability: 'path generator',
    providerName: step.name,
    irPath: paramsPath,
    payloadName: 'params',
    schema: JsonObjectSchema,
    value: parsed,
  });
  return { stepIndex, name: step.name, definition, params, irPath };
};

const assertFiniteArrowGeometry = (shape: string, definition: ArrowDefinition): void => {
  if (!Number.isFinite(definition.lineContactX)) {
    throw new RetikzCompositeContractError(
      `Arrow '${shape}' has a non-finite lineContactX (${String(definition.lineContactX)}); it must be a finite number.`,
    );
  }
  if (definition.baseSize !== undefined && (!Number.isFinite(definition.baseSize) || definition.baseSize <= 0)) {
    throw new RetikzCompositeContractError(
      `Arrow '${shape}' has an invalid baseSize (${String(definition.baseSize)}); it must be a finite number greater than 0.`,
    );
  }
  if (definition.tipX !== undefined && !Number.isFinite(definition.tipX)) {
    throw new RetikzCompositeContractError(
      `Arrow '${shape}' has a non-finite tipX (${String(definition.tipX)}); it must be a finite number.`,
    );
  }
  if (definition.outerInset !== undefined && !Number.isFinite(definition.outerInset)) {
    throw new RetikzCompositeContractError(
      `Arrow '${shape}' has a non-finite outerInset (${String(definition.outerInset)}); it must be a finite number.`,
    );
  }
};

/** 解析 arrow mark 的有效视觉属性与几何输入 */
export const resolveArrowMark = (mark: IRArrowMark, context: PathResolveContext): ArrowMarkResolution => {
  const shape = mark.shape ?? DEFAULT_ARROW_SHAPE;
  const definition = providerDefinitionOf(context.arrows, shape, {
    capability: 'arrow shape',
    optionName: 'arrows',
  });
  assertFiniteArrowGeometry(shape, definition);
  const visual: ArrowMarkVisual = {
    shape,
    scale: mark.scale ?? 1,
    length: mark.length ?? definition.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE,
    width: mark.width ?? definition.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE,
    ...(mark.color === undefined ? {} : { color: mark.color }),
    ...(definition.hollow || mark.fill === undefined ? {} : { fill: mark.fill }),
    ...(mark.opacity === undefined ? {} : { opacity: mark.opacity }),
    lineWidth: mark.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  };
  const baseSize = definition.baseSize ?? ARROW_GEOMETRY_BASE_SIZE;
  const tipX = definition.tipX ?? baseSize;
  const contactX = definition.hollow ? definition.lineContactX - visual.lineWidth / 2 : definition.lineContactX;
  const resolvedLength = visual.length * visual.scale;
  const resolvedWidth = visual.width * visual.scale;
  const rawOuterInset = definition.outerInset ?? (definition.hollow ? visual.lineWidth / 2 : 0);
  const boundaryOuterInset = (rawOuterInset * resolvedLength) / baseSize;
  if (!Number.isFinite(resolvedLength) || !Number.isFinite(resolvedWidth)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Arrow '${shape}' resolved length/width is non-finite (length × scale overflowed); use smaller length / scale values.`,
    );
  }
  if (!Number.isFinite(boundaryOuterInset)) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Resolve,
      `Arrow '${shape}' resolved outerInset is non-finite; use smaller outerInset / length / scale values.`,
    );
  }
  const geometry: ArrowMarkGeometry = {
    baseSize,
    tipX,
    contactX,
    resolvedLength,
    resolvedWidth,
    boundaryOuterInset,
    // 主路径用 butt cap 绘制；向 marker 内覆盖半个自身描边宽度，避免相切边界分别抗锯齿后出现缝隙
    shrink: ((tipX - contactX) * resolvedLength) / baseSize - ARROW_PATH_CONTACT_OVERLAP,
  };
  if (!Number.isFinite(geometry.shrink)) {
    throw new RetikzCompositeContractError(
      `Arrow '${shape}' resolved shrink is non-finite; use smaller tip/contact/length values.`,
    );
  }
  return { mark, definition, visual, geometry };
};

/** 为 path marks 解析全部 arrow provider */
export const resolveArrowMarks = (
  marks: ReadonlyArray<{ mark: IRArrowMark }> | undefined,
  context: PathResolveContext,
): ReadonlyMap<IRArrowMark, ArrowMarkResolution> => {
  const resolutions = new Map<IRArrowMark, ArrowMarkResolution>();
  for (const item of marks ?? []) resolutions.set(item.mark, resolveArrowMark(item.mark, context));
  return resolutions;
};

/** 按 canonical step 对象绑定 path generator provider */
export const resolvePathGenerators = (
  steps: ReadonlyArray<CanonicalStep>,
  context: PathResolveContext,
  prefix: string,
): ReadonlyMap<CanonicalStep, PathGeneratorResolution> => {
  const resolutions = new Map<CanonicalStep, PathGeneratorResolution>();
  for (const [index, step] of steps.entries()) {
    if (step.kind !== 'generator') continue;
    resolutions.set(step, resolvePathGenerator(step, index, context, `${prefix}.children[${index}]`));
  }
  return resolutions;
};

/** 为 stroke emitter 绑定实际会消费的 generator 与 arrow provider */
export const resolveStrokePathProviders = (
  resolution: PathResolution,
  context: PathResolveContext,
): StrokePathResolution => {
  const children = resolution.path.children;
  const strokeTooShort = children === undefined || (children.length < 2 && children[0]?.kind !== 'rectangle');
  if (strokeTooShort) {
    return { ...resolution, generators: new Map(), arrows: new Map() };
  }
  return {
    ...resolution,
    generators: resolvePathGenerators(children, context, context.irPath ?? 'path'),
    arrows: resolveArrowMarks(resolution.path.marks, context),
  };
};
