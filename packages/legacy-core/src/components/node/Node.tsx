import type { ReactNode } from 'react';
import { forwardRef } from 'react';
import type { Position } from '../../types/coordinate/descartes';
import type { NodeShape } from './InnerNode';
import InnerNode from './InnerNode';
import type { CssDistanceType, DirectionDistance } from '../../types/distance';
import type { SepProps } from '../../types/distance/sep';
import { color as d3Color, hsl } from 'd3-color';
import type { StrokeProps } from '../../types/svg/stroke';
import { convertCssToPx } from '../../utils/css';
import type { TikZKey } from '../../types/tikz';
import type { StrokeShortcutProps, StrokeType } from '../../utils/style/stroke';
import { convertStrokeShortcut, convertStrokeType } from '../../utils/style/stroke';
import type { PointPosition } from '../../types/coordinate';
import type { TikZFontSize } from '../../utils/style/font';
import { convertFontSize, convertFontStyle } from '../../utils/style/font';
import type { FontProps } from '../../types/svg/font';
import DescartesPoint from '../../model/geometry/point/DescartesPoint';
import useScope from '../../hooks/context/useScope';

export type NodeProps = {
  name?: TikZKey;
  /** 位置 */
  position?: PointPosition;
  /** 位置偏移 */
  offset?: PointPosition;
  /** 内容宽度 */
  width?: CssDistanceType;
  /** 内容高度 */
  height?: CssDistanceType;
  /** 内容(文本)颜色 */
  color?: 'currentColor' | 'auto' | string;
  /** 内容(文本)透明度 */
  opacity?: number;
  /** 内容(文本)字体大小 */
  size?: string | TikZFontSize | number;
  /** 内容 */
  children?: ReactNode;
  /** 边框形状 */
  shape?: NodeShape;
  /** 边框圆角 */
  r?: CssDistanceType;
  /** 边框圆角-x */
  rx?: CssDistanceType;
  /** 边框圆角-y */
  ry?: CssDistanceType;
  /** 背景填充色，默认为 auto */
  fill?: string | 'auto';
  /** 背景填充色透明度 */
  fillOpacity?: number;
  /** 边框样式 */
  strokeType?: StrokeType;
  /** 内边距 */
  innerSep?: CssDistanceType | SepProps;
  /** 外边距 */
  outerSep?: CssDistanceType | SepProps;
  /** 旋转 */
  rotate?: number;
  /** 样式 */
  style?: 'bold' | 'italic' | 'serif' | 'sans-serif';
} & Partial<FontProps> &
  Partial<StrokeProps> &
  StrokeShortcutProps;

const Node = forwardRef<SVGGElement, NodeProps>((props, ref) => {
  const { offset: scopeOffset, node } = useScope();
  const nodeScopeProps = { offset: scopeOffset, ...node };
  const realProps = {
    ...nodeScopeProps,
    ...props,
    offset: DescartesPoint.plus(scopeOffset || [0, 0], props.offset || [0, 0]),
  };

  const { shape = 'rectangle', width, height, position, offset, innerSep, outerSep, ...res1Props } = realProps;
  const { r, rx, ry, fill, fillOpacity, stroke = 'transparent', strokeWidth = 1, strokeType, ...res2Props } = res1Props;
  const { color = 'currentColor', size, fontSize, style, ...otherProps } = res2Props;

  const realPosition: Position = (() => {
    const formatPosition = position ? DescartesPoint.formatPosition(position) : [0, 0];
    const formatOffset = DescartesPoint.formatPosition(offset);
    return [formatPosition[0] + formatOffset[0], formatPosition[1] + formatOffset[1]];
  })();

  const realColor = (() => {
    // 自动根据 fill 计算内容颜色
    if (color === 'auto' && fill && fill !== 'currentColor') {
      const fillColor = d3Color(fill);
      // 无法解析 color
      if (!fillColor) return color;
      fillColor.opacity = fillOpacity || 1;
      const lightness = hsl(fillColor).l;
      return lightness < 0.5 ? 'white' : 'black';
    }
    return color || 'currentColor';
  })();

  const realRx = rx || r;
  const realRy = ry || r;

  const getStrokeAttributes = () =>
    strokeType ? convertStrokeType(strokeType, strokeWidth) : convertStrokeShortcut(otherProps, strokeWidth);

  const getSep = (sep?: CssDistanceType | SepProps, defaultVal?: number | string) => {
    if (typeof sep !== 'object') {
      return {
        left: sep ?? defaultVal,
        right: sep ?? defaultVal,
        top: sep ?? defaultVal,
        bottom: sep ?? defaultVal,
      } as DirectionDistance<number | string>;
    }
    return {
      left: sep.left ?? sep.x ?? defaultVal,
      right: sep.right ?? sep.x ?? defaultVal,
      top: sep.top ?? sep.y ?? defaultVal,
      bottom: sep.bottom ?? sep.y ?? defaultVal,
    } as DirectionDistance<number | string>;
  };

  const getFontStyle = () => convertFontStyle(style);

  const adjustFontSize = convertFontSize(size || fontSize);

  const adjustedInnerSep = getSep(innerSep, convertCssToPx(adjustFontSize) / 3 || '0.3333em');
  const adjustedOuterSep = getSep(outerSep, 0);

  return (
    <InnerNode
      ref={ref}
      width={convertCssToPx(width)}
      height={convertCssToPx(height)}
      shape={shape}
      position={realPosition}
      color={realColor}
      fill={fill || 'transparent'}
      fillOpacity={fillOpacity}
      rx={realRx}
      ry={realRy}
      stroke={stroke}
      strokeWidth={strokeWidth}
      innerSep={adjustedInnerSep}
      outerSep={adjustedOuterSep}
      size={adjustFontSize}
      {...getFontStyle()}
      {...getStrokeAttributes()}
      {...otherProps}
    />
  );
});

export default Node;
