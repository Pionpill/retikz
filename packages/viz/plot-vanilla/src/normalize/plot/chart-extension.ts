import type { IRPlotCoordinateOperation, IRPlotScaleOperation } from '@retikz/plot';

import { PlotGuide } from '@retikz/plot';

import type {
  AxisBoundGuide,
  InputPlotCoordinate,
  NormalizationState,
  PlotAuthoringContext,
  PlotAuthoringDeclaration,
  PlotAuthoringRuntime,
  PlotDeclarationCollection,
  PlotDeclarationKind,
  PlotDeclarationPath,
  PlotDeclarationSource,
  PlotMemberFragment,
} from './contracts';
import type { InputPlotScale } from './input-scales';

import { normalizePlotBindings } from './bindings';
import { RetikzPlotDeclarationError, RetikzPlotDeclarationErrorCode } from './errors';
import { buildPositionScale, collectExplicitScales, coordinateTypeOf } from './scale-coordinate';
import { assembledTransformsOf } from './topology';

const AUTO_X = '__x';
const AUTO_Y = '__y';
const AUTO_ANGLE = '__angle';
const AUTO_RADIUS = '__radius';

type Collected = NormalizationState;

const firstDeclarationOf = (
  collection: PlotDeclarationCollection,
  kinds: ReadonlySet<PlotDeclarationKind>,
): PlotAuthoringDeclaration | undefined => collection.declarations.find(declaration => kinds.has(declaration.kind));

/** 查找第一个会提供显式位置比例尺的声明 */
const firstScaleDeclarationOf = (collection: PlotDeclarationCollection): PlotAuthoringDeclaration | undefined =>
  collection.declarations.find(
    declaration =>
      declaration.kind === 'scale' ||
      (declaration.kind === 'axis' && Object.prototype.hasOwnProperty.call(declaration.props, 'scale')),
  );

const throwDuplicateDeclarationSource = (
  declaration: PlotAuthoringDeclaration,
  conflictingPath: PlotDeclarationPath,
): never => {
  throw new RetikzPlotDeclarationError(
    RetikzPlotDeclarationErrorCode.DuplicateDeclarationSource,
    declaration.path,
    conflictingPath,
  );
};

/** 校验 Chart extension 只能包含可序列化且来源唯一的显式声明 */
export const assertChartExtensionCollection = (
  collection: PlotDeclarationCollection,
  context: PlotAuthoringContext,
): void => {
  for (const declaration of collection.declarations) {
    if (declaration.kind === 'unsupported') {
      const code =
        declaration.props.valueKind === 'function'
          ? RetikzPlotDeclarationErrorCode.NonSerializableExtension
          : RetikzPlotDeclarationErrorCode.UnsupportedChartChild;
      throw new RetikzPlotDeclarationError(code, declaration.path);
    }
  }

  const scaleDeclaration = firstScaleDeclarationOf(collection);
  if (context.scales !== undefined && scaleDeclaration !== undefined) {
    throwDuplicateDeclarationSource(scaleDeclaration, context.scales.path);
  }
  const guideDeclaration = firstDeclarationOf(collection, new Set<PlotDeclarationKind>(['axis', 'legend']));
  if (context.guides !== undefined && guideDeclaration !== undefined) {
    throwDuplicateDeclarationSource(guideDeclaration, context.guides.path);
  }
  const compositionDeclaration = firstDeclarationOf(collection, new Set<PlotDeclarationKind>(['facet', 'scaffold']));
  if (context.composition !== undefined && compositionDeclaration !== undefined) {
    throwDuplicateDeclarationSource(compositionDeclaration, context.composition.path);
  }
  const markDeclaration = firstDeclarationOf(
    collection,
    new Set<PlotDeclarationKind>(['path-mark', 'point-mark', 'interval-mark', 'reference-mark', 'relation-mark']),
  );
  if (context.marks !== undefined && markDeclaration !== undefined) {
    throwDuplicateDeclarationSource(markDeclaration, context.marks.path);
  }
  if (context.coordinate !== undefined && context.composition !== undefined) {
    throw new RetikzPlotDeclarationError(
      RetikzPlotDeclarationErrorCode.DuplicateDeclarationSource,
      context.composition.path,
      context.coordinate.path,
    );
  }
};

const chartExtensionScalesOf = (collected: Collected, context: PlotAuthoringContext): Array<IRPlotScaleOperation> => {
  if (context.scales !== undefined) return context.scales.value.map(scale => ({ ...scale }));

  const coordinateKind = coordinateTypeOf(context.coordinate?.value);
  const explicitScales = collectExplicitScales(collected.scales, coordinateKind);
  const scales: Array<IRPlotScaleOperation> = [];
  const append = (scale: InputPlotScale | undefined, name: string): void => {
    if (scale !== undefined) scales.push(buildPositionScale(name, scale.type, scale));
  };
  append(explicitScales.x, AUTO_X);
  append(explicitScales.y, AUTO_Y);
  append(explicitScales.angle, AUTO_ANGLE);
  append(explicitScales.radius, AUTO_RADIUS);
  return scales;
};

const chartExtensionCoordinateOf = (
  source: PlotDeclarationSource<InputPlotCoordinate> | undefined,
): IRPlotCoordinateOperation | undefined => {
  if (source === undefined) return undefined;
  const input = source.value;
  return typeof input === 'string' ? { type: input } : { ...input };
};

/** 只把显式 Chart children 归一化为 JSON-safe Plot member fragment */
export const normalizeChartExtension = (
  collection: PlotDeclarationCollection,
  context: PlotAuthoringContext,
  collected: Collected,
): { fragment: PlotMemberFragment; runtime: PlotAuthoringRuntime } => {
  const transforms = assembledTransformsOf(collected, context);
  const scales = chartExtensionScalesOf(collected, context);
  const declaredGuides: Array<AxisBoundGuide> =
    context.guides === undefined
      ? [
          ...collected.guides.filter(guide => guide.type === PlotGuide.Axis),
          ...collected.guides.filter(guide => guide.type === PlotGuide.Legend),
        ]
      : context.guides.value.map(guide => ({ ...guide }));
  const marks = context.marks?.value ?? collected.marks;
  const normalized = normalizePlotBindings({
    marks,
    guides: declaredGuides,
    scales,
    coordinate: chartExtensionCoordinateOf(context.coordinate),
    composition: context.composition?.value,
    facets: collected.facets,
    scaffolds: collected.scaffolds,
  });
  const ownsScales = context.scales !== undefined || collected.scales.length > 0 || normalized.scales.length > 0;
  const ownsGuides = context.guides !== undefined || collected.guides.length > 0 || normalized.guides.length > 0;
  const fragment: PlotMemberFragment = {
    ...(transforms.length > 0 ? { transform: transforms } : {}),
    ...(ownsScales ? { scales: normalized.scales } : {}),
    ...(normalized.composition !== undefined
      ? { composition: normalized.composition }
      : normalized.coordinate !== undefined
        ? { coordinate: normalized.coordinate }
        : {}),
    ...(marks.length > 0 ? { marks: normalized.marks } : {}),
    ...(ownsGuides ? { guides: normalized.guides } : {}),
  };
  const runtime: PlotAuthoringRuntime =
    Object.keys(collected.resolveLabels).length === 0 ? {} : { resolveLabel: collected.resolveLabels };
  return { fragment, runtime };
};
