import type { ExternalRow } from '@retikz/data';
import type {
  IRPlotEncoding,
  IRPlotMarkGeometryLabelList,
  IRPlotMarkNodeLabel,
  IRPlotMarkGeometryLabel,
  IRPlotMarkNodeLabelList,
  IRPlotPointColorStyle,
  IRPlotRelationPathGeometry,
} from '@retikz/plot';
import { BuiltinPlotMark } from '@retikz/plot';

import { RetikzPlotVanillaError } from '../../error';
import type { NormalizationState } from './contracts';
import type {
  InputPlotDatumLabel,
  InputPlotNodeLabel,
  InputPlotGeometryLabel,
  InputPlotPathMark,
  InputPlotReferenceMark,
  InputPlotRelationMark,
} from './input-marks';
import { opacityStyleOf } from './style-sugar';
import type { StyleSugarContext } from './style-sugar';
import { extensionChannelEncoding, nodeStylePropsOf, pathStylePropsOf, strokeWidthStyleOf } from './style-sugar';

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

/** 把节点标签的简单或详细输入组装为唯一 Source 结构 */
const normalizeMarkNodeLabel = (input: InputPlotNodeLabel): IRPlotMarkNodeLabel => {
  if (typeof input === 'string') return { content: { field: input } };
  const { field, value, displayFormat, ...layout } = input;
  return {
    ...layout,
    content: {
      ...(field === undefined ? {} : { field }),
      ...(value === undefined ? {} : { value }),
      ...(displayFormat === undefined ? {} : { displayFormat }),
    },
  };
};

/** 把几何标签的简单或详细输入组装为唯一 Source 结构 */
const normalizeMarkGeometryLabel = (input: InputPlotGeometryLabel): IRPlotMarkGeometryLabel => {
  if (typeof input === 'string') return { content: { field: input } };
  const { field, value, displayFormat, ...layout } = input;
  return {
    ...layout,
    content: {
      ...(field === undefined ? {} : { field }),
      ...(value === undefined ? {} : { value }),
      ...(displayFormat === undefined ? {} : { displayFormat }),
    },
  };
};

/** 组装节点宿主的单个或有序多个标签 */
export const buildMarkLabel = ({ label }: InputPlotDatumLabel): IRPlotMarkNodeLabelList | undefined =>
  label === undefined
    ? undefined
    : Array.isArray(label)
      ? label.map(normalizeMarkNodeLabel)
      : normalizeMarkNodeLabel(label);

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
): IRPlotMarkGeometryLabelList =>
  Array.isArray(label) ? label.map(normalizeMarkGeometryLabel) : normalizeMarkGeometryLabel(label);

/** 按 reference mark 宿主形态规范化标签列表 */
export const canonicalReferenceLabel = (
  label: NonNullable<InputPlotReferenceMark['label']>,
  usesNodeHost: boolean,
): IRPlotMarkNodeLabelList | IRPlotMarkGeometryLabelList => {
  const entries = Array.isArray(label) ? label : [label];
  const hasNodeOnlyField = entries.some(
    entry => typeof entry !== 'string' && ('keepUpright' in entry || 'pin' in entry || 'rotate' in entry),
  );
  const hasGeometryOnlyField = entries.some(
    entry => typeof entry !== 'string' && ('side' in entry || 'sloped' in entry),
  );
  if (usesNodeHost && hasGeometryOnlyField) {
    throw new RetikzPlotVanillaError('buildPlotIR: reference band / region expects node label fields');
  }

  if (!usesNodeHost && hasNodeOnlyField) {
    throw new RetikzPlotVanillaError('buildPlotIR: reference line expects geometry label fields');
  }

  // Reference 的宿主由几何配置决定，Source schema 继续校验对应 position 值域
  if (usesNodeHost) {
    return Array.isArray(label)
      ? label.map(entry => normalizeMarkNodeLabel(entry as InputPlotNodeLabel))
      : normalizeMarkNodeLabel(label as InputPlotNodeLabel);
  }
  return Array.isArray(label)
    ? label.map(entry => normalizeMarkGeometryLabel(entry as InputPlotGeometryLabel))
    : normalizeMarkGeometryLabel(label as InputPlotGeometryLabel);
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
    interpolation,
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

  const opacityStyle = opacityStyleOf(opacity, styleContext);
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
    type: BuiltinPlotMark.Reference,
    ...(kind !== undefined ? { kind } : {}),
    ...(interpolation !== undefined ? { interpolation } : {}),
    ...(id !== undefined ? { id } : {}),
    ...(coordinateView !== undefined ? { coordinateView } : {}),
    ...(transform !== undefined ? { transform } : {}),
    ...(layer !== undefined ? { layer } : {}),
    ...upper,
    ...(extentField !== undefined ? { extentField } : {}),
    ...(extentToField !== undefined ? { extentToField } : {}),
    ...(strokeWidthStyle !== undefined ? { strokeWidth: strokeWidthStyle } : {}),

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
