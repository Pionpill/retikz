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

import { RetikzPlotVanillaError } from '../../error';
import type { NormalizationState } from './contracts';
import type {
  InputPlotDatumLabel,
  InputPlotNodeLabel,
  InputPlotGeometryLabel,
  InputPlotPathMark,
  InputPlotRelationMark,
} from './input-marks';

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

/** 规范化 relation mark 的路径几何 */
export const canonicalRelationPath = (path: NonNullable<InputPlotRelationMark['path']>): IRPlotRelationPathGeometry =>
  path;

/** 把 x/y 字段装成位置 encoding */
export const positionEncoding = (x: string, y: string): Pick<IRPlotEncoding, 'x' | 'y'> => ({
  x: { field: x },
  y: { field: y },
});

/** 递归收集 mark / guide / transform：认 mark/guide 组件，穿透 Fragment，忽略其它节点 */
