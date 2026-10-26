import type { IRDataTransformDeclaration } from '@retikz/data';
import { PlotGuide } from '@retikz/plot';

import { RetikzPlotVanillaError } from '../../error';
import type {
  NormalizationState,
  PlotAuthoringDeclaration,
  PlotComposition,
  ScaffoldTrack,
  SharedScaffold,
  AxisBoundMark,
} from './contracts';
import type { InputPlotFacet } from './input';
import type { InputPlotFacetDimension } from './input-composition';
import type { InputPlotAxis, InputPlotLegend } from './input-guides';
import type {
  InputPlotIntervalMark,
  InputPlotPathMark,
  InputPlotPointMark,
  InputPlotRelationMark,
} from './input-marks';
import type { InputPlotScale } from './input-scales';
import { normalizeIntervalDeclaration, recordFieldColor } from './interval';
import { recordResolveLabel } from './mark-normalizers';
import { normalizePlotPathMark } from './path';

type Collected = NormalizationState;

type Composition = PlotComposition;

const facetDimensionOf = (
  dimension: InputPlotFacetDimension | undefined,
): Exclude<InputPlotFacetDimension, string> | undefined => {
  if (dimension === undefined) return undefined;
  return typeof dimension === 'string' ? { field: dimension } : dimension;
};

const scaffoldTracksOf = (scaffoldId: string, propTracks: Array<ScaffoldTrack> | undefined): Array<ScaffoldTrack> => {
  const tracks = [...(propTracks ?? [])];
  if (tracks.length === 0) {
    throw new RetikzPlotVanillaError(`buildPlotIR: <PlotScaffold id="${scaffoldId}"> requires at least one track`);
  }

  return tracks;
};

/** 把单个 JSON-safe declaration 写入 normalization 累加器 */
export const applyDeclaration = (declaration: PlotAuthoringDeclaration, into: Collected): void => {
  const context = declaration.context ?? {};
  const child: { props: unknown } = { props: declaration.props };
  if (declaration.kind === 'facet') {
    const { row, column, ...facet } = child.props as InputPlotFacet;
    into.facets.push({
      ...facet,
      ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
      ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
    });

    return;
  }

  if (declaration.kind === 'scaffold') {
    const { id, coordinate, sharedRoles, frame, tracks, viewIdTemplate, spacing, resolve } = child.props as {
      id: string;
      coordinate?: SharedScaffold['coordinate'];
      sharedRoles: SharedScaffold['sharedRoles'];
      frame?: SharedScaffold['frame'];
      tracks?: Array<ScaffoldTrack>;
      viewIdTemplate?: SharedScaffold['viewIdTemplate'];
      spacing?: Composition['spacing'];
      resolve?: Composition['resolve'];
    };
    into.scaffolds.push({
      kind: 'tracks',
      id,
      sharedRoles,
      tracks: scaffoldTracksOf(id, tracks),
      ...(coordinate !== undefined ? { coordinate } : {}),
      ...(frame !== undefined ? { frame } : {}),
      ...(viewIdTemplate !== undefined ? { viewIdTemplate } : {}),
      ...(spacing !== undefined ? { spacing } : {}),
      ...(resolve !== undefined ? { resolve } : {}),
    });

    return;
  }

  if (declaration.kind === 'track') {
    throw new RetikzPlotVanillaError('buildPlotIR: <PlotTrack> must be declared inside <PlotScaffold>');
  }

  if (declaration.kind === 'path-mark' || declaration.kind === 'point-mark' || declaration.kind === 'relation-mark') {
    const props = child.props as InputPlotPathMark | InputPlotPointMark | InputPlotRelationMark;
    const { resolveLabel, ...rawSource } = props;
    const source = declaration.kind === 'path-mark' ? normalizePlotPathMark(props as InputPlotPathMark) : rawSource;
    const type = declaration.kind === 'path-mark' ? 'path' : declaration.kind === 'point-mark' ? 'point' : 'relation';
    const path = type === 'path' ? (props as InputPlotPathMark) : undefined;
    const series = path?.encodings?.series;
    let encodings: typeof source.encodings =
      type === 'path' &&
      series !== undefined &&
      source.encodings?.color === undefined &&
      source.properties?.color === undefined
        ? Object.assign({}, source.encodings, { color: series })
        : source.encodings;
    if (typeof encodings?.color === 'string')
      encodings = Object.assign({}, encodings, { color: { field: encodings.color, scale: '__color' } });
    const mark = {
      ...context,
      ...source,
      ...(encodings === undefined ? {} : { encodings }),
      type,
    } as AxisBoundMark;
    into.marks.push(mark);
    recordResolveLabel(into, source.id, resolveLabel);
    recordFieldColor(into, encodings?.color);
    if (path?.properties?.closed === true || path?.properties?.closure !== undefined) into.hasClosedLine = true;
  } else if (declaration.kind === 'interval-mark') {
    normalizeIntervalDeclaration(child.props as InputPlotIntervalMark, context, into);
  } else if (declaration.kind === 'axis') {
    const {
      dimension,
      scale,
      line,
      ticks,
      crossing,
      tickLabels,
      grid,
      coordinateView,
      facetId,
      scaffoldId,
      trackId,
      placement,
      title,
      layer,
      id,
    } = child.props as InputPlotAxis;
    if (scale !== undefined) {
      if (dimension !== 'x' && dimension !== 'y') {
        throw new RetikzPlotVanillaError(
          `buildPlotIR: <PlotAxis scale> only supports built-in x / y dimensions; custom coordinate role "${dimension}" must provide its scale through CoordinateDefinition`,
        );
      }

      into.scales.push({ dimension, type: scale });
    }

    const effectiveFacetId = facetId ?? context.facetId;
    const effectiveScaffoldId = scaffoldId ?? context.scaffoldId;
    const effectiveTrackId = trackId ?? context.trackId;
    into.guides.push({
      type: PlotGuide.Axis,
      dimension,
      ...(id !== undefined ? { id } : {}),
      ...(coordinateView !== undefined ? { coordinateView } : {}),
      ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
      ...(effectiveScaffoldId !== undefined ? { scaffoldId: effectiveScaffoldId } : {}),
      ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
      ...(layer !== undefined ? { layer } : {}),
      ...(placement !== undefined ? { placement } : {}),
      ...(line !== undefined ? { line } : {}),
      ...(ticks !== undefined ? { ticks } : {}),
      ...(crossing !== undefined ? { crossing } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(tickLabels !== undefined ? { tickLabels } : {}),
      ...(grid !== undefined ? { grid } : {}),
    });
  } else if (declaration.kind === 'legend') {
    const { channel, scale, title, position, orient, ticks, tickLabels, style, layer } = child.props as InputPlotLegend;
    into.guides.push({
      type: PlotGuide.Legend,
      channel,
      ...(scale !== undefined ? { scale } : {}),
      ...(title !== undefined ? { title } : {}),
      ...(position !== undefined ? { position } : {}),
      ...(orient !== undefined ? { orient } : {}),
      ...(ticks !== undefined ? { ticks } : {}),
      ...(tickLabels !== undefined ? { tickLabels } : {}),
      ...(style !== undefined ? { style } : {}),
      ...(layer !== undefined ? { layer } : {}),
    });
  } else if (declaration.kind === 'scale') {
    into.scales.push(child.props as InputPlotScale);
  } else if (declaration.kind === 'transform') {
    // 通用数据声明携带独立 operation 和稀疏执行配置
    into.transforms.push(child.props as IRDataTransformDeclaration);
  }
};
