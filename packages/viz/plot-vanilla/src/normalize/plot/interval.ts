import { BuiltinDataTransform } from '@retikz/data';
import type { IRPlotChannel, IRPlotIntervalMark } from '@retikz/plot';

import { RetikzPlotVanillaError } from '../../error';
import type { CollectionContext, NormalizationState } from './contracts';
import type { InputPlotIntervalMark } from './input-marks';
import { recordResolveLabel } from './mark-normalizers';

/** 收集颜色字段供自动比例尺装配，固定颜色不参与 */
export const recordFieldColor = (into: NormalizationState, binding: IRPlotChannel | undefined): void => {
  if (binding === undefined) return;
  into.colored = true;
  into.colorFields.push(typeof binding === 'string' ? binding : binding.field);
};

/** 将区间作者糖展开为分组 Source，数据算法仍交给 Data */
export const normalizeIntervalDeclaration = (
  input: InputPlotIntervalMark,
  context: CollectionContext,
  into: NormalizationState,
): void => {
  const {
    angle,
    x0,
    x1,
    width,
    direction: rawDirection,
    group,
    arrangement: explicitArrangement,
    stackOffset,
    percent,
    stack,
    resolveLabel,
    ...source
  } = input;
  const encodings: NonNullable<IRPlotIntervalMark['encodings']> = {
    ...source.encodings,
    position: { ...source.encodings?.position },
    bounds: { ...source.encodings?.bounds },
  };
  const properties = { ...source.properties, bounds: { ...source.properties?.bounds } };
  const x = source.encodings?.position?.x;
  const y = source.encodings?.position?.y;
  const series = encodings.series;
  const arrangementGroup = group ?? series;
  const direction = rawDirection ?? 'vertical';
  const arrangement =
    explicitArrangement ??
    (percent === true ? 'normalize-stack' : stack ? 'stack' : arrangementGroup !== undefined ? 'dodge' : undefined);
  if (percent === true && explicitArrangement !== undefined && explicitArrangement !== 'normalize-stack')
    throw new RetikzPlotVanillaError('Interval percent cannot be mixed with another arrangement');
  if (stackOffset !== undefined && explicitArrangement === 'normalize-stack')
    throw new RetikzPlotVanillaError('Interval stackOffset cannot be mixed with normalize-stack');

  if (angle !== undefined) {
    if ([x, y, x0, x1, width, rawDirection, stack, source.properties?.bounds].some(value => value !== undefined))
      throw new RetikzPlotVanillaError(
        'Interval angle cannot be mixed with position, extent, width, direction, stack or bounds',
      );
    into.shortcutTransforms.push({
      kind: BuiltinDataTransform.Stack,
      params: { y: angle, ...(series === undefined ? {} : { groupBy: series }) },
    });
    properties.bounds = { x: { kind: 'extent' }, y: { kind: 'full' } };
    encodings.bounds = { x: { from: 'y0', to: 'y1' } };
    if (encodings.color === undefined && properties.color === undefined) encodings.color = series ?? group ?? angle;
    into.hasSector = true;
  } else if (source.properties?.bounds !== undefined) {
    if (rawDirection !== undefined || width !== undefined)
      throw new RetikzPlotVanillaError('Interval direction or width cannot be mixed with explicit bounds');
    into.hasBar ||= properties.bounds.x?.kind === 'band';
    into.hasRect ||= properties.bounds.y?.kind === 'band';
  } else {
    const bounds = (encodings.bounds ??= {});
    const histogram = x0 !== undefined && x1 !== undefined;
    const proportional = width !== undefined;
    if ((x0 === undefined) !== (x1 === undefined))
      throw new RetikzPlotVanillaError('Interval x0 and x1 must be set together');
    if (
      proportional &&
      (histogram ||
        arrangement !== undefined ||
        stackOffset !== undefined ||
        group !== undefined ||
        series !== undefined)
    )
      throw new RetikzPlotVanillaError(
        'Interval proportional width cannot be mixed with histogram or grouped arrangement',
      );
    if (histogram && (direction === 'horizontal' || arrangement !== undefined))
      throw new RetikzPlotVanillaError('Interval histogram cannot be mixed with horizontal direction or arrangement');
    const categoryField = direction === 'horizontal' ? y : x;
    const valueField = direction === 'horizontal' ? x : y;
    if (valueField === undefined || (!histogram && !proportional && categoryField === undefined))
      throw new RetikzPlotVanillaError('Interval requires value and category position fields, or explicit bounds');
    const bandRole = direction === 'horizontal' ? 'y' : 'x';
    const valueRole = direction === 'horizontal' ? 'x' : 'y';
    if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup === undefined)
      throw new RetikzPlotVanillaError('Interval stack requires group or series');
    if (arrangement === 'normalize-stack') {
      if (categoryField === undefined)
        throw new RetikzPlotVanillaError('Interval normalize-stack requires a category field');
      into.shortcutTransforms.push({
        kind: BuiltinDataTransform.Normalize,
        params: { field: valueField, groupBy: [categoryField], basis: 'percent' },
      });
    }
    if ((arrangement === 'stack' || arrangement === 'normalize-stack') && arrangementGroup !== undefined) {
      into.shortcutTransforms.push({
        kind: BuiltinDataTransform.Stack,
        params: {
          x: categoryField,
          y: valueField,
          groupBy: arrangementGroup,
          ...(arrangement === 'stack' && stackOffset !== undefined ? { offset: stackOffset } : {}),
        },
      });
      properties.bounds[valueRole] = { kind: 'extent' };
      bounds[valueRole] = { from: 'y0', to: 'y1' };
    } else properties.bounds[valueRole] = { kind: 'span' };
    if (proportional) {
      properties.bounds[bandRole] = { kind: 'proportional' };
      bounds[bandRole] = { weight: width };
    } else if (histogram) {
      properties.bounds.x = { kind: 'extent' };
      bounds.x = { from: x0, to: x1 };
    } else {
      properties.bounds[bandRole] = { kind: 'band' };
      if (arrangement === 'dodge' && arrangementGroup !== undefined) bounds[bandRole] = { group: arrangementGroup };
      if (bandRole === 'x') into.hasBar = true;
      else into.hasRect = true;
    }
    if (direction === 'horizontal') into.hasHorizontalBar = true;
  }
  if (encodings.color === undefined && properties.color === undefined && arrangementGroup !== undefined)
    encodings.color = arrangementGroup;
  if (Object.keys(encodings.position ?? {}).length === 0) delete encodings.position;
  if (Object.keys(encodings.bounds ?? {}).length === 0) delete encodings.bounds;
  if (typeof encodings.color === 'string') encodings.color = { field: encodings.color, scale: '__color' };
  const mark: IRPlotIntervalMark = { ...context, ...source, type: 'interval', kind: 'data', encodings, properties };
  into.marks.push(mark);
  recordFieldColor(into, encodings.color);
  recordResolveLabel(into, mark.id, resolveLabel);
};
