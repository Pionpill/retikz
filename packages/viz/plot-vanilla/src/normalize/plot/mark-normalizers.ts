import type { ExternalRow } from '@retikz/data';
import type {
  IRPlotEncoding,
  IRPlotMarkGeometryLabelList,
  IRPlotMarkNodeLabel,
  IRPlotMarkNodeLabelList,
  IRPlotPointColorStyle,
  IRPlotPointOpacityStyle,
  IRPlotRelationPathGeometry,
  IRPlotTextChannel,
} from '@retikz/plot';

import { PlotMark } from '@retikz/plot';

import type { NormalizationState } from './contracts';
import type {
  InputPlotDatumLabel,
  InputPlotPathMark,
  InputPlotReferenceMark,
  InputPlotRelationMark,
} from './input-marks';
import type { StyleSugarContext } from './style-sugar';

import { RetikzPlotVanillaError } from '../../error';
import {
  extensionChannelEncoding,
  nodeStylePropsOf,
  numberStyleOf,
  pathStylePropsOf,
  strokeWidthStyleOf,
} from './style-sugar';

const AUTO_COLOR = '__color';

type Collected = NormalizationState;

/** 记录普通颜色编码使用到的字段 */
export const recordColor = (
  into: Collected,
  colorEnc: { color: { field: string; scale: string } } | undefined,
): void => {
  if (!colorEnc) return;
  into.colored = true;
  into.colorFields.push(colorEnc.color.field);
};

/** 记录 mark value 颜色样式使用到的字段 */
export const recordMarkColor = (into: Collected, color: IRPlotPointColorStyle | undefined): void => {
  if (color?.kind !== 'field') return;
  into.colored = true;
  into.colorFields.push(color.value);
};

/**
 * 把位置 mark 的扁平 label props 装成宿主 datum label
 * @description label 顶层 string 默认按字段（content.field）；labelDisplayFormat 进 IR；labelPosition / labelDistance / labelPin
 *   摊进对齐 core NodeLabelSchema 的字段。无 label 字段 → undefined（不挂标签）
 */
export const buildMarkLabel = (props: InputPlotDatumLabel): IRPlotMarkNodeLabel | undefined => {
  const {
    label,
    labelDisplayFormat,
    labelPosition,
    labelDistance,
    labelPin,
    labelTextColor,
    labelOpacity,
    labelFont,
    labelRotate,
    labelKeepUpright,
  } = props;
  if (label === undefined) return undefined;
  const content: IRPlotTextChannel = {
    field: label,
    ...(labelDisplayFormat !== undefined ? { displayFormat: labelDisplayFormat } : {}),
  };
  return {
    content,
    ...(labelPosition !== undefined ? { position: labelPosition } : {}),
    ...(labelDistance !== undefined ? { distance: labelDistance } : {}),
    ...(labelTextColor !== undefined ? { textColor: labelTextColor } : {}),
    ...(labelOpacity !== undefined ? { opacity: labelOpacity } : {}),
    ...(labelFont !== undefined ? { font: labelFont } : {}),
    ...(labelRotate !== undefined ? { rotate: labelRotate } : {}),
    ...(labelKeepUpright !== undefined ? { keepUpright: labelKeepUpright } : {}),
    ...(labelPin !== undefined && labelPin !== false ? { pin: labelPin } : {}),
  };
};

/** 收集某 mark 的运行时 resolveLabel；仅在配置 mark id 时按 id 注册，且不会进入 IR */
export const recordResolveLabel = (
  into: Collected,
  id: string | undefined,
  resolveLabel: ((row: ExternalRow) => string) | undefined,
): void => {
  if (resolveLabel === undefined) return;
  if (id === undefined) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: resolveLabel needs a mark id to be injected at runtime; set the mark id prop',
    );
  }
  into.resolveLabels[id] = resolveLabel;
};

/** 把几何标签输入规范化为几何标签列表 */
export const canonicalGeometryLabel = (
  label: NonNullable<InputPlotPathMark['label'] | InputPlotRelationMark['label']>,
): IRPlotMarkGeometryLabelList => label;

/** 按 reference mark 宿主形态规范化标签列表 */
export const canonicalReferenceLabel = (
  label: NonNullable<InputPlotReferenceMark['label']>,
  usesNodeHost: boolean,
): IRPlotMarkNodeLabelList | IRPlotMarkGeometryLabelList => {
  const entries = Array.isArray(label) ? label : [label];
  const hasNodeOnlyField = entries.some(entry => 'keepUpright' in entry || 'pin' in entry || 'rotate' in entry);
  const hasGeometryOnlyField = entries.some(entry => 'side' in entry || 'sloped' in entry);
  if (usesNodeHost && hasGeometryOnlyField) {
    throw new RetikzPlotVanillaError('buildPlotIR: reference band / region expects node label fields');
  }
  if (!usesNodeHost && hasNodeOnlyField) {
    throw new RetikzPlotVanillaError('buildPlotIR: reference line expects geometry label fields');
  }
  return label;
};

/** 规范化 relation mark 的路径几何 */
export const canonicalRelationPath = (path: NonNullable<InputPlotRelationMark['path']>): IRPlotRelationPathGeometry =>
  path;

/** 把 x/y 字段装成位置 encoding */
export const positionEncoding = (x: string, y: string): Pick<IRPlotEncoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** rule 扁平 prop → IR 位置通道：数字 → 常量 value、字符串 → 字段 field */
export const ruleChannel = (value: number | string): { value: number } | { field: string } =>
  typeof value === 'number' ? { value } : { field: value };

/**
 * 把 <ReferenceMark> 扁平 props 装配进 reference IR（line / band / region / extent / color 校验 fail-loud）
 * @description 取向由给 x（竖直）还是 y（水平）决定，二选一（皆给 / 皆缺 → fail-loud）；
 *   band 上界 xTo 须配 x、yTo 须配 y（不匹配 / 单飞 → fail-loud）。kind="region" 时 x/y/xTo/yTo 必填；
 *   extent 须成对（单设 → fail-loud），且 region 不接收 extent
 *   常量 rule（x/y 为数字）→ color 作 value 常量；per-datum rule（x/y 为字段串）→ color 作 field（AUTO_COLOR）
 */
export const collectReference = (
  props: InputPlotReferenceMark,
  into: Collected,
  styleContext: StyleSugarContext,
): void => {
  const {
    kind,
    x,
    y,
    xTo,
    yTo,
    extentField,
    extentToField,
    color,
    label,
    id,
    coordinateView,
    transform,
    layer,
    channels,
    strokeWidth,
    fillOpacity,
    opacity,
  } = props;
  const region = kind === 'region';
  const hasX = x !== undefined;
  const hasY = y !== undefined;
  if (region) {
    if (!hasX || !hasY || xTo === undefined || yTo === undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <ReferenceMark kind="region"> requires x, xTo, y, and yTo to define a bounded reference area',
      );
    }
    if (extentField !== undefined || extentToField !== undefined) {
      throw new RetikzPlotVanillaError(
        'buildPlotIR: <ReferenceMark kind="region"> does not support extentField / extentToField; set x/xTo/y/yTo bounds directly',
      );
    }
  } else if (hasX === hasY) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <ReferenceMark> must bind exactly one of x (vertical) or y (horizontal); set one, not both / neither',
    );
  }
  if (!region && hasX && yTo !== undefined) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <ReferenceMark> binds x (vertical) but sets yTo; the band upper bound must match the bound dimension (use xTo)',
    );
  }
  if (!region && hasY && xTo !== undefined) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <ReferenceMark> binds y (horizontal) but sets xTo; the band upper bound must match the bound dimension (use yTo)',
    );
  }
  if ((extentField === undefined) !== (extentToField === undefined)) {
    throw new RetikzPlotVanillaError(
      'buildPlotIR: <ReferenceMark> extentField / extentToField must be set together (a partial-length span needs both start and end)',
    );
  }
  // 常量 rule（数字常量轴）→ color 作 value；per-datum（字段串）→ color 作 field（AUTO_COLOR）
  const constantRule = region
    ? typeof x === 'number' && typeof y === 'number' && typeof xTo === 'number' && typeof yTo === 'number'
    : typeof (hasX ? x : y) === 'number';
  let colorEnc: { color: { value: string } | { field: string; scale: string } } | undefined;
  if (color !== undefined) {
    colorEnc = constantRule ? { color: { value: color } } : { color: { field: color, scale: AUTO_COLOR } };
  }
  const positional: IRPlotEncoding = {};
  if (hasX) {
    positional.x = ruleChannel(x);
  }
  if (hasY) {
    positional.y = ruleChannel(y);
  }
  const upper = {
    ...(xTo !== undefined ? { xTo } : {}),
    ...(yTo !== undefined ? { yTo } : {}),
  };
  const strokeWidthStyle = strokeWidthStyleOf(strokeWidth, styleContext);
  const fillOpacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(fillOpacity, 'fillOpacity', styleContext);
  const opacityStyle = numberStyleOf<IRPlotPointOpacityStyle>(opacity, 'opacity', styleContext);
  const referenceNodeStyleProps = {
    align: props.align,
    lineHeight: props.lineHeight,
    maxTextWidth: props.maxTextWidth,
    cornerRadius: props.cornerRadius,
    scale: props.scale,
    margin: props.margin,
    padding: props.padding,
    dashed: props.dashed,
    dotted: props.dotted,
    font: props.font,
    boundary: props.boundary,
  };
  into.marks.push({
    type: PlotMark.Reference,
    ...(kind !== undefined ? { kind } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(coordinateView !== undefined ? { coordinateView } : {}),
    ...(transform !== undefined ? { transform } : {}),
    ...(layer !== undefined ? { layer } : {}),
    ...upper,
    ...(extentField !== undefined ? { extentField } : {}),
    ...(extentToField !== undefined ? { extentToField } : {}),
    ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),
    ...(fillOpacityStyle !== undefined ? { fillOpacity: fillOpacityStyle } : {}),
    ...(opacityStyle !== undefined ? { opacity: opacityStyle } : {}),
    ...(label !== undefined
      ? { label: canonicalReferenceLabel(label, region || xTo !== undefined || yTo !== undefined) }
      : {}),
    ...nodeStylePropsOf(referenceNodeStyleProps, styleContext),
    ...pathStylePropsOf(props, styleContext),
    encoding: { ...positional, ...colorEnc, ...extensionChannelEncoding(channels) },
  });
  // 仅 per-datum color（field）需自动色 scale；常量 color value 直落 IR，不进色 scale
  if (colorEnc && 'field' in colorEnc.color) {
    into.colored = true;
    into.colorFields.push(colorEnc.color.field);
  }
};

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
