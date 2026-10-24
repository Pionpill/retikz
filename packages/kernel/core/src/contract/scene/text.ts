import type { BoundsRect } from '@retikz/math';

import type { IRFont, IRTextSegment } from '../../schemas';
import type { ScenePrimitiveBase, ScenePrimitiveOpacity } from './base';

type SceneFontWeight = NonNullable<IRFont['weight']> | (string & {});

/** 行级字段（每行可独立指定），未填走块级 TextPrimitive 默认 */
export type TextLine = {
  /** 行文字内容 */
  text: string;
  /**
   * 行级字号覆盖（user units）；缺省走块级 TextPrimitive.fontSize
   * @default TextPrimitive.fontSize
   */
  fontSize?: number;
  /**
   * 行级字体族覆盖（CSS font-family）；缺省走块级
   * @default TextPrimitive.fontFamily
   */
  fontFamily?: IRFont['family'];
  /**
   * 行级字重覆盖（CSS font-weight）；缺省走块级
   * @default TextPrimitive.fontWeight
   */
  fontWeight?: SceneFontWeight;
  /**
   * 行级字形覆盖；缺省走块级
   * @default TextPrimitive.fontStyle
   */
  fontStyle?: IRFont['style'];
  /**
   * 行级文字颜色覆盖；缺省走块级 TextPrimitive.fill
   * @default TextPrimitive.fill
   */
  fill?: string;
  /**
   * 行级透明度 0..1 覆盖；缺省走块级
   * @default TextPrimitive.opacity
   */
  opacity?: IRTextSegment['opacity'];
};

/**
 * 文本原语（measuredWidth/Height 由 Scene 编译阶段算好）
 * @description 多行 lines 至少 1 行；renderer 按 lineHeight 堆叠每行、按 baseline 在 (x,y) 锚点上下对齐。顶层属性是块级默认，单行 TextLine 可覆盖
 */
export type TextPrimitive = ScenePrimitiveBase &
  Pick<ScenePrimitiveOpacity, 'opacity'> & {
    /** 标识文本场景图元 */
    type: 'text';
    /** 锚点横坐标（具体含义由 align 决定） */
    x: number;
    /** 锚点纵坐标（具体含义由 baseline 决定） */
    y: number;
    /** 至少 1 行；单行节点也用 `[{ text: 'Hello' }]` */
    lines: Array<TextLine>;
    /** 已解析的字号，采用场景坐标单位 */
    fontSize: number;
    /**
     * 块级字体族
     * @default 'sans-serif'
     */
    fontFamily?: IRFont['family'];
    /**
     * 块级字重
     * @default 'normal'
     */
    fontWeight?: SceneFontWeight;
    /**
     * 块级字形
     * @default 'normal'
     */
    fontStyle?: IRFont['style'];
    /** 文本相对定位点的水平对齐方式 */
    align: 'start' | 'middle' | 'end';
    /** 定位点对应的文本基线方式 */
    baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
    /** 行高，多行下相邻行的垂直距离 */
    lineHeight: number;
    /** 编译期算好的整块文字宽度 = max line width */
    measuredWidth: number;
    /** 编译期解析的整块文字视觉盒高度 */
    measuredHeight: number;
    /**
     * 块级文字颜色
     * @default 'currentColor'
     */
    fill?: string;
  };

/** 从已度量尺寸、对齐和基线推导文本矩形，供边界与命中消费 */
export const computeSceneTextBounds = (primitive: TextPrimitive): BoundsRect => {
  const x =
    primitive.align === 'start'
      ? primitive.x
      : primitive.align === 'middle'
        ? primitive.x - primitive.measuredWidth / 2
        : primitive.x - primitive.measuredWidth;
  const y =
    primitive.baseline === 'top'
      ? primitive.y
      : primitive.baseline === 'middle'
        ? primitive.y - primitive.measuredHeight / 2
        : primitive.baseline === 'alphabetic'
          ? // alphabetic 锚点属于首行，后续行向下展开，不能把整块高度都扣到首行上方
            primitive.y - primitive.measuredHeight + (primitive.lines.length - 1) * primitive.lineHeight
          : primitive.y - primitive.measuredHeight;

  return { x, y, width: primitive.measuredWidth, height: primitive.measuredHeight };
};
