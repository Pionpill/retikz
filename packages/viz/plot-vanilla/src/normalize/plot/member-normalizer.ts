import type {
  IRPlotIntervalBounds,
  IRPlotPointFillStyle,
  IRPlotPointNonnegativeNumberStyle,
  IRPlotPointNumberStyle,
  IRPlotPointOpacityStyle,
  IRPlotPointSizeStyle,
  IRPlotPointZIndexStyle,
  IRPlotTextChannel,
  IRPlotTransform,
} from '@retikz/plot';

import { IntervalBoundKind, PlotGuide, PlotMark, PlotTransform } from '@retikz/plot';

import type {
  FacetGrid,
  NormalizationState,
  PlotAuthoringDeclaration,
  PlotComposition,
  ScaffoldTrack,
  SharedScaffold,
} from './contracts';
import type { InputPlotAxis, InputPlotLegend } from './input-guides';
import type {
  InputPlotIntervalMark,
  InputPlotPathMark,
  InputPlotPointMark,
  InputPlotReferenceMark,
  InputPlotRelationMark,
} from './input-marks';
import type { InputPlotScale } from './input-scales';
import type { StyleSugarContext } from './style-sugar';

import { RetikzPlotVanillaError } from '../../error';
import {
  buildMarkLabel,
  canonicalGeometryLabel,
  canonicalRelationPath,
  collectReference,
  positionEncoding,
  recordColor,
  recordMarkColor,
  recordResolveLabel,
} from './mark-normalizers';
import {
  boxSpacingStyleOf,
  colorChannel,
  enumStyleOf,
  extensionChannelEncoding,
  intervalPullStyleOf,
  nodeBoxSizeStyleOf,
  nodeStylePropsOf,
  numberStyleOf,
  paintStyleOf,
  pathStylePropsOf,
  pointColorStyleOf,
  shapeStyleOf,
  strokeStyleOf,
  strokeWidthStyleOf,
} from './style-sugar';

type Collected = NormalizationState;
type Composition = PlotComposition;

const facetDimensionOf = (
  dimension: string | NonNullable<FacetGrid['row']> | undefined,
): NonNullable<FacetGrid['row']> | undefined => {
  if (dimension === undefined) return undefined;
  return typeof dimension === 'string' ? { field: dimension } : dimension;
};

const scaffoldTracksOf = (scaffoldId: string, propTracks: Array<ScaffoldTrack> | undefined): Array<ScaffoldTrack> => {
  const tracks = [...(propTracks ?? [])];
  if (tracks.length === 0) {
    throw new RetikzPlotVanillaError(`buildPlotIR: <Scaffold id="${scaffoldId}"> requires at least one track`);
  }
  return tracks;
};

/** 把单个 JSON-safe declaration 写入 normalization 累加器 */
export const applyDeclaration = (
  declaration: PlotAuthoringDeclaration,
  into: Collected,
  styleContext: StyleSugarContext,
): void => {
  const context = declaration.context ?? {};
  const child: { props: unknown } = { props: declaration.props };
  if (declaration.kind === 'facet') {
    const { id, row, column, empty, coordinate, view, viewIdTemplate, header, spacing, resolve } = child.props as {
      id: string;
      row?: string | NonNullable<FacetGrid['row']>;
      column?: string | NonNullable<FacetGrid['column']>;
      empty?: FacetGrid['empty'];
      coordinate?: FacetGrid['coordinate'];
      view?: string;
      viewIdTemplate?: string;
      header?: FacetGrid['header'];
      spacing?: Composition['spacing'];
      resolve?: Composition['resolve'];
    };
    into.facets.push({
      kind: 'facet',
      id,
      view: view ?? `${id}Panel`,
      ...(facetDimensionOf(row) !== undefined ? { row: facetDimensionOf(row) } : {}),
      ...(facetDimensionOf(column) !== undefined ? { column: facetDimensionOf(column) } : {}),
      ...(empty !== undefined ? { empty } : {}),
      ...(coordinate !== undefined ? { coordinate } : {}),
      ...(viewIdTemplate !== undefined ? { viewIdTemplate } : {}),
      ...(header !== undefined ? { header } : {}),
      ...(spacing !== undefined ? { spacing } : {}),
      ...(resolve !== undefined ? { resolve } : {}),
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
    throw new RetikzPlotVanillaError('buildPlotIR: <Track> must be declared inside <Scaffold>');
  }
  if (declaration.kind === 'path-mark') {
    const props = child.props as InputPlotPathMark;
    const {
      x,
      y,
      order,
      series,
      color,
      label,
      closed,
      connectNulls,
      closure,
      curve,
      id,
      coordinateView,
      xAxisId,
      yAxisId,
      facetId,
      trackId,
      transform,
      layer,
      anchorId,
      channels,
      strokeWidth,
      opacity,
      lineCap,
      lineJoin,
      roundedCorners,
    } = props;
    const colorEnc = colorChannel(color, series);
    const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
    const opacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(opacity, 'opacity', styleContext);
    const lineCapStyle = enumStyleOf(lineCap, 'lineCap', new Set(['butt', 'round', 'square']), styleContext);
    const lineJoinStyle = enumStyleOf(lineJoin, 'lineJoin', new Set(['miter', 'round', 'bevel']), styleContext);
    const roundedCornersStyle = numberStyleOf<IRPlotPointNonnegativeNumberStyle>(
      roundedCorners,
      'roundedCorners',
      styleContext,
    );
    const effectiveFacetId = facetId ?? context.facetId;
    const effectiveTrackId = trackId ?? context.trackId;
    into.marks.push({
      type: PlotMark.Path,
      ...(id !== undefined ? { id } : {}),
      ...(coordinateView !== undefined ? { coordinateView } : {}),
      ...(xAxisId !== undefined ? { xAxisId } : {}),
      ...(yAxisId !== undefined ? { yAxisId } : {}),
      ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
      ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
      ...(transform !== undefined ? { transform } : {}),
      ...(layer !== undefined ? { layer } : {}),
      ...(anchorId !== undefined ? { anchorId } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(series !== undefined ? { series } : {}),
      ...(closed !== undefined ? { closed } : {}),
      ...(connectNulls !== undefined ? { connectNulls } : {}),
      ...(closure !== undefined ? { closure } : {}),
      ...(curve !== undefined ? { curve } : {}),
      ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
      ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
      ...(lineCapStyle !== undefined ? { lineCap: lineCapStyle } : {}),
      ...(lineJoinStyle !== undefined ? { lineJoin: lineJoinStyle } : {}),
      ...(roundedCornersStyle !== undefined ? { roundedCorners: roundedCornersStyle } : {}),
      ...pathStylePropsOf(props, styleContext),
      ...(label !== undefined ? { label: canonicalGeometryLabel(label) } : {}),
      encoding: { ...positionEncoding(x, y), ...colorEnc, ...extensionChannelEncoding(channels) },
    });
    recordColor(into, colorEnc);
    recordResolveLabel(into, id, props.resolveLabel);
    if (closed || closure !== undefined) into.hasClosedLine = true;
  } else if (declaration.kind === 'point-mark') {
    const props = child.props as InputPlotPointMark;
    const {
      x,
      y,
      z,
      color,
      textColor,
      fill,
      stroke,
      strokeWidth,
      fillOpacity,
      strokeOpacity,
      rotate,
      padding,
      minimumSize,
      zIndex,
      size,
      opacity,
      shape,
      text,
      displayFormat,
      dx,
      dy,
      id,
      coordinateView,
      xAxisId,
      yAxisId,
      facetId,
      trackId,
      transform,
      layer,
      anchorId,
      channels,
    } = props;
    const markLabel = buildMarkLabel(props);
    const colorStyle = pointColorStyleOf(color, styleContext);
    const textColorStyle = pointColorStyleOf(textColor, styleContext);
    const sizeStyle = numberStyleOf<IRPlotPointSizeStyle>(size, 'size', styleContext);
    const shapeStyle = shapeStyleOf(shape, styleContext);
    const fillStyle = paintStyleOf<IRPlotPointFillStyle>(fill, 'fill', styleContext);
    const strokeStyle = strokeStyleOf(stroke, styleContext);
    const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
    const fillOpacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
    const strokeOpacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(strokeOpacity, 'strokeOpacity', styleContext);
    const opacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(opacity, 'opacity', styleContext);
    const rotateStyle = numberStyleOf<IRPlotPointNumberStyle>(rotate, 'rotate', styleContext);
    const paddingStyle = boxSpacingStyleOf(padding, 'padding', styleContext);
    const minimumSizeStyle = nodeBoxSizeStyleOf(minimumSize, 'minimumSize', styleContext);
    const zIndexStyle = numberStyleOf<IRPlotPointZIndexStyle>(zIndex, 'zIndex', styleContext);
    // text 设 → point 下沉为无边框文本 Node（内容走 encoding.text）；否则散点 glyph。内置坐标使用 x 或 x/y，自定义坐标可继续消费 z role
    const textEnc: { text: IRPlotTextChannel } | undefined =
      text !== undefined
        ? { text: { field: text, ...(displayFormat !== undefined ? { displayFormat } : {}) } }
        : undefined;
    const effectiveFacetId = facetId ?? context.facetId;
    const effectiveTrackId = trackId ?? context.trackId;
    into.marks.push({
      type: PlotMark.Point,
      ...(id !== undefined ? { id } : {}),
      ...(coordinateView !== undefined ? { coordinateView } : {}),
      ...(xAxisId !== undefined ? { xAxisId } : {}),
      ...(yAxisId !== undefined ? { yAxisId } : {}),
      ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
      ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
      ...(transform !== undefined ? { transform } : {}),
      ...(layer !== undefined ? { layer } : {}),
      ...(anchorId !== undefined ? { anchorId } : {}),
      ...(colorStyle !== undefined ? { color: colorStyle } : {}),
      ...(textColorStyle !== undefined ? { textColor: textColorStyle } : {}),
      ...(sizeStyle !== undefined ? { size: sizeStyle } : {}),
      ...(shapeStyle !== undefined ? { shape: shapeStyle } : {}),
      ...(fillStyle !== undefined ? { fill: fillStyle } : {}),
      ...(strokeStyle !== undefined ? { stroke: strokeStyle } : {}),
      ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
      ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
      ...(strokeOpacityStyle !== undefined ? { strokeOpacity: strokeOpacityStyle } : {}),
      ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
      ...(rotateStyle !== undefined ? { rotate: rotateStyle } : {}),
      ...(paddingStyle !== undefined ? { padding: paddingStyle } : {}),
      ...(minimumSizeStyle !== undefined ? { minimumSize: minimumSizeStyle } : {}),
      ...(zIndexStyle !== undefined ? { zIndex: zIndexStyle } : {}),
      ...nodeStylePropsOf(props, styleContext),
      ...(dx !== undefined ? { dx } : {}),
      ...(dy !== undefined ? { dy } : {}),
      ...(markLabel !== undefined ? { label: markLabel } : {}),
      encoding: {
        ...(x !== undefined ? { x: { field: x } } : {}),
        ...(y !== undefined ? { y: { field: y } } : {}),
        ...(z !== undefined ? { z: { field: z } } : {}),
        ...textEnc,
        ...extensionChannelEncoding(channels),
      },
    });
    recordMarkColor(into, colorStyle);
    recordResolveLabel(into, id, props.resolveLabel);
  } else if (declaration.kind === 'interval-mark') {
    const props = child.props as InputPlotIntervalMark;
    const {
      x,
      y,
      angle,
      x0,
      x1,
      width,
      direction: rawDirection,
      color,
      series,
      group,
      arrangement: explicitArrangement,
      stackOffset,
      percent,
      stack,
      bounds: explicitBounds,
      id,
      coordinateView,
      xAxisId,
      yAxisId,
      facetId,
      trackId,
      transform,
      layer,
      anchorId,
      channels,
      fill,
      stroke,
      strokeWidth,
      fillOpacity,
      opacity,
      padAngle,
      pull,
    } = props;
    const direction = rawDirection ?? 'vertical';
    const arrangementGroup = group ?? series;
    if (percent === true && explicitArrangement !== undefined && explicitArrangement !== 'normalize-stack') {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark percent> cannot be mixed with an arrangement other than "normalize-stack"',
      );
    }
    if (stackOffset !== undefined && explicitArrangement === 'normalize-stack') {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark stackOffset> cannot be mixed with arrangement="normalize-stack"; use percent for percentage stacks',
      );
    }
    const arrangement =
      explicitArrangement ??
      (percent === true ? 'normalize-stack' : stack ? 'stack' : arrangementGroup !== undefined ? 'dodge' : undefined);
    const markLabel = buildMarkLabel(props);
    const fillStyle = paintStyleOf<IRPlotPointFillStyle>(fill, 'fill', styleContext);
    const strokeStyle = strokeStyleOf(stroke, styleContext);
    const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
    const fillOpacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
    const opacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(opacity, 'opacity', styleContext);
    const pullStyle = intervalPullStyleOf(pull);
    const effectiveFacetId = facetId ?? context.facetId;
    const effectiveTrackId = trackId ?? context.trackId;
    const intervalStyle = {
      ...(fillStyle !== undefined ? { fill: fillStyle } : {}),
      ...(strokeStyle !== undefined ? { stroke: strokeStyle } : {}),
      ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
      ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
      ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
      ...(padAngle !== undefined ? { padAngle } : {}),
      ...(pullStyle !== undefined ? { pull: pullStyle } : {}),
      ...nodeStylePropsOf(props, styleContext),
    };
    // pie / donut：angle → 自动累积 stack transform（产 y0/y1）+ extent×full bounds
    if (angle !== undefined) {
      if (
        y !== undefined ||
        x !== undefined ||
        x0 !== undefined ||
        x1 !== undefined ||
        width !== undefined ||
        rawDirection !== undefined ||
        stack !== undefined ||
        explicitBounds !== undefined
      ) {
        throw new RetikzPlotVanillaError(
          'buildPlotIR: <IntervalMark angle> is the polar pie/donut form; do not mix it with x/y/x0/x1/width/direction/stack/bounds',
        );
      }
      into.shortcutTransforms.push({
        kind: PlotTransform.Stack,
        y: angle,
        ...(series !== undefined ? { groupBy: series } : {}),
      });
      const colorEnc = colorChannel(color, series ?? group) ?? colorChannel(angle, undefined);
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(xAxisId !== undefined ? { xAxisId } : {}),
        ...(yAxisId !== undefined ? { yAxisId } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(transform !== undefined ? { transform } : {}),
        ...(layer !== undefined ? { layer } : {}),
        ...(anchorId !== undefined ? { anchorId } : {}),
        ...intervalStyle,
        bounds: { x: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' }, y: { kind: IntervalBoundKind.Full } },
        encoding: { ...colorEnc, ...extensionChannelEncoding(channels) },
      });
      into.hasSector = true;
      recordColor(into, colorEnc);
      return;
    }
    // 显式 bounds（heatmap 双 band / 高级）：直接落 IR；band bound → 强制对应轴 band scale
    if (explicitBounds !== undefined) {
      if (rawDirection !== undefined) {
        throw new RetikzPlotVanillaError(
          'buildPlotIR: <IntervalMark direction> cannot be mixed with explicit bounds; encode the orientation through bounds directly',
        );
      }
      if (width !== undefined) {
        throw new RetikzPlotVanillaError(
          'buildPlotIR: <IntervalMark width> cannot be mixed with explicit bounds; use bounds.<role>={kind:"proportional"} directly',
        );
      }
      const colorEnc = colorChannel(color, series ?? group);
      into.marks.push({
        type: PlotMark.Interval,
        ...(id !== undefined ? { id } : {}),
        ...(coordinateView !== undefined ? { coordinateView } : {}),
        ...(xAxisId !== undefined ? { xAxisId } : {}),
        ...(yAxisId !== undefined ? { yAxisId } : {}),
        ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
        ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
        ...(transform !== undefined ? { transform } : {}),
        ...(layer !== undefined ? { layer } : {}),
        ...(anchorId !== undefined ? { anchorId } : {}),
        ...(series !== undefined ? { series } : {}),
        ...intervalStyle,
        bounds: explicitBounds,
        ...(markLabel !== undefined ? { label: markLabel } : {}),
        encoding: {
          ...(x !== undefined ? { x: { field: x } } : {}),
          ...(y !== undefined ? { y: { field: y } } : {}),
          ...colorEnc,
          ...extensionChannelEncoding(channels),
        },
      });
      if (explicitBounds.x?.kind === IntervalBoundKind.Band) into.hasBar = true;
      if (explicitBounds.y?.kind === IntervalBoundKind.Band) into.hasRect = true;
      recordColor(into, colorEnc);
      recordResolveLabel(into, id, props.resolveLabel);
      return;
    }
    // histogram：x0/x1 → bounds.x = extent（连续 x，不强制 band）；普通 / 分组 / 堆叠柱：band x
    const histogram = x0 !== undefined && x1 !== undefined;
    const proportional = width !== undefined;
    if (proportional && histogram) {
      throw new RetikzPlotVanillaError('buildPlotIR: <IntervalMark width> cannot be mixed with x0/x1 histogram bounds');
    }
    if (proportional && arrangement !== undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark width> cannot be mixed with arrangement/stack/percent/group/series; use precomputed extent bounds for custom layouts',
      );
    }
    if (proportional && stackOffset !== undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark width> cannot be mixed with stackOffset; use precomputed extent bounds for custom layouts',
      );
    }
    if (proportional && (group !== undefined || series !== undefined)) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark width> cannot be mixed with group or series; use color for visual grouping',
      );
    }
    if (histogram && direction === 'horizontal') {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark direction="horizontal"> cannot be mixed with x0/x1 histogram bounds',
      );
    }
    if (histogram && arrangement !== undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark arrangement> cannot be mixed with x0/x1 histogram bounds',
      );
    }
    if ((x0 === undefined) !== (x1 === undefined)) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark> x0 / x1 must be set together for continuous-interval bars',
      );
    }
    if (!histogram && !proportional && x === undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark> requires x for categorical bars, x0/x1 for histogram, width for proportional bars, or angle for the polar pie/donut form',
      );
    }
    const valueField = direction === 'horizontal' ? x : y;
    if (valueField === undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark> requires the value field on y (vertical) or x (horizontal), or use angle for the polar pie/donut form',
      );
    }
    const colorEnc = colorChannel(color, series ?? group);
    const categoryField = direction === 'horizontal' ? y : x;
    if (!histogram && !proportional && categoryField === undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark> requires the category field on x (vertical) or y (horizontal), x0/x1 for histogram, width for proportional bars, or angle for the polar pie/donut form',
      );
    }
    const bandRole = direction === 'horizontal' ? 'y' : 'x';
    const valueRole = direction === 'horizontal' ? 'x' : 'y';
    const bandBound = {
      kind: IntervalBoundKind.Band,
      ...(arrangement === 'dodge' && arrangementGroup !== undefined ? { group: arrangementGroup } : {}),
    };
    if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup === undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <IntervalMark arrangement="stack"> requires group or series to identify stacked segments',
      );
    }
    if (arrangement === 'normalize-stack') {
      into.shortcutTransforms.push({
        kind: PlotTransform.Normalize,
        field: valueField,
        groupBy: [categoryField],
        basis: 'percent',
      });
    }
    if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup !== undefined) {
      into.shortcutTransforms.push({
        kind: PlotTransform.Stack,
        x: categoryField,
        y: valueField,
        groupBy: arrangementGroup,
        ...(arrangement === 'stack' && stackOffset !== undefined ? { offset: stackOffset } : {}),
      });
    }
    // arrangement → bounds：dodge 切 band 子带；stack / normalize-stack 读 y0/y1 extent
    let bounds: IRPlotIntervalBounds | undefined;
    if (proportional) {
      bounds = { [bandRole]: { kind: IntervalBoundKind.Proportional, field: width } };
    } else if (!histogram && (direction === 'horizontal' || arrangement === 'dodge')) {
      bounds = { [bandRole]: bandBound };
    }
    if (arrangement === 'stack' || arrangement === 'normalize-stack') {
      bounds = { ...(bounds ?? {}), [valueRole]: { kind: IntervalBoundKind.Extent, from: 'y0', to: 'y1' } };
    } else if (direction === 'horizontal') {
      bounds = { ...(bounds ?? {}), x: { kind: IntervalBoundKind.Span } };
    }
    if (histogram) bounds = { ...(bounds ?? {}), x: { kind: IntervalBoundKind.Extent, from: x0, to: x1 } };
    into.marks.push({
      type: PlotMark.Interval,
      ...(id !== undefined ? { id } : {}),
      ...(coordinateView !== undefined ? { coordinateView } : {}),
      ...(xAxisId !== undefined ? { xAxisId } : {}),
      ...(yAxisId !== undefined ? { yAxisId } : {}),
      ...(effectiveFacetId !== undefined ? { facetId: effectiveFacetId } : {}),
      ...(effectiveTrackId !== undefined ? { trackId: effectiveTrackId } : {}),
      ...(transform !== undefined ? { transform } : {}),
      ...(layer !== undefined ? { layer } : {}),
      ...(anchorId !== undefined ? { anchorId } : {}),
      ...(series !== undefined ? { series } : {}),
      ...intervalStyle,
      ...(bounds !== undefined ? { bounds } : {}),
      ...(markLabel !== undefined ? { label: markLabel } : {}),
      // histogram：仅 y（高度），x 来自 x0/x1 区间；普通柱：x（分类 band）+ y（值）
      encoding: histogram
        ? { y: { field: y }, ...colorEnc, ...extensionChannelEncoding(channels) }
        : proportional
          ? {
              ...(x !== undefined ? { x: { field: x } } : {}),
              ...(y !== undefined ? { y: { field: y } } : {}),
              ...colorEnc,
              ...extensionChannelEncoding(channels),
            }
          : { x: { field: x }, y: { field: y }, ...colorEnc, ...extensionChannelEncoding(channels) },
    });
    if (!histogram && !proportional) {
      if (bandRole === 'x') into.hasBar = true;
      else into.hasRect = true;
    }
    if (direction === 'horizontal') into.hasHorizontalBar = true;
    recordColor(into, colorEnc);
    recordResolveLabel(into, id, props.resolveLabel);
  } else if (declaration.kind === 'reference-mark') {
    collectReference(child.props as InputPlotReferenceMark, into, styleContext);
  } else if (declaration.kind === 'relation-mark') {
    const { id, kind, coordinateView, transform, layer, source, target, label, style, path, ribbon, color, channels } =
      child.props as InputPlotRelationMark;
    const colorEnc = colorChannel(color, undefined);
    const encoding = { ...colorEnc, ...extensionChannelEncoding(channels) };
    into.marks.push({
      type: PlotMark.Relation,
      ...(id !== undefined ? { id } : {}),
      ...(kind !== undefined ? { kind } : {}),
      ...(coordinateView !== undefined ? { coordinateView } : {}),
      ...(transform !== undefined ? { transform } : {}),
      ...(layer !== undefined ? { layer } : {}),
      source,
      target,
      ...(label !== undefined ? { label: canonicalGeometryLabel(label) } : {}),
      ...(style !== undefined ? { style } : {}),
      ...(path !== undefined ? { path: canonicalRelationPath(path) } : {}),
      ...(ribbon !== undefined ? { ribbon } : {}),
      ...(Object.keys(encoding).length > 0 ? { encoding } : {}),
    });
    recordColor(into, colorEnc);
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
          `buildPlotIR: <Axis scale> only supports built-in x / y dimensions; custom coordinate role "${dimension}" must provide its scale through CoordinateDefinition`,
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
    // 通用 <Transform kind="..."> 声明：props 即 IR transform operation（按声明序进 spec.transform）
    into.transforms.push(child.props as IRPlotTransform);
  }
};
