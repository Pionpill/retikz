import type { Channel, ExternalRow } from '../schemas';

/**
 * 通道解析器（行 → 求值结果）的运行时契约。
 * @description 由 scale 解析阶段构造、交给 mark lowering 消费；函数本身不进 IR。
 *   color 适用所有 mark，size / opacity / shape 等多为 PointMark 的 per-datum 属性。
 */

/** 行 → 颜色串（color 编码解析结果；undefined = 回退默认色）。由 expand 据 encoding.color 构造 */
export type ColorOf = (row: ExternalRow) => string | undefined;

/** 行 → 标签串（text 内容通道 + 可选 format + 运行时 resolveLabel 解析结果；undefined = 该行无内容、跳过 / 不挂 label） */
export type LabelOf = (row: ExternalRow) => string | undefined;

/** 行 → 数值尺寸（size 通道解析；undefined = 用 mark 默认） */
export type SizeOf = (row: ExternalRow) => number | undefined;

/** 行 → 通用数值样式（opacity / strokeWidth / rotate / padding 等共用基型；undefined = 不覆盖） */
export type NumberStyleOf = (row: ExternalRow) => number | undefined;

/** 行 → 形状串（shape 通道解析；undefined = 用 mark 默认形状） */
export type ShapeOf = (row: ExternalRow) => string | undefined;

/**
 * 一个 mark 下沉时消费的通道解析器集合
 * @description color 适用所有 mark；size / opacity / shape 仅 PointMark（per-datum node 属性）。
 *   由 expand 据各通道 resolver 构造、整包传入，避免逐个位置参数（易错序）。
 */
export type MarkChannels = {
  colorOf?: ColorOf;
  defaultColor?: string;
  sizeOf?: SizeOf;
  opacityOf?: NumberStyleOf;
  shapeOf?: ShapeOf;
  strokeOf?: ColorOf;
  strokeWidthOf?: NumberStyleOf;
  fillOpacityOf?: NumberStyleOf;
  drawOpacityOf?: NumberStyleOf;
  rotateOf?: NumberStyleOf;
  paddingOf?: NumberStyleOf;
  minimumSizeOf?: NumberStyleOf;
  minimumWidthOf?: NumberStyleOf;
  minimumHeightOf?: NumberStyleOf;
  zIndexOf?: NumberStyleOf;
  labelOf?: LabelOf;
};

/** addChannel 接受的通道形态：普通 channel 或 MarkValueType 的字段 / 常量引用。 */
export type FieldChannel = Channel | { kind: 'field' | 'constant'; value: unknown };

/** 字段收集器：把 mark / transform 声明中引用外部数据源的字段加入集合。 */
export type FieldCollector = {
  /** 加入一个字段名；undefined 表示该位置没有字段引用。 */
  addField: (field?: string) => void;
  /** 一次加入多个字段名；undefined 会被跳过。 */
  addFields: (...fields: Array<string | undefined>) => void;
  /** 加入普通 channel 或 MarkValueType 的字段引用；常量值不引用数据源。 */
  addChannel: (channel?: FieldChannel) => void;
};
