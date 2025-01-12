import { FC, ReactNode, Ref, useMemo } from 'react';
import { Position } from '../../types/coordinate/descartes';
import InnerNode, { NodeShape } from './InnerNode';
import { CssDistanceType, DirectionDistance } from '../../types/distance';
import { SepProps } from '../../types/distance/sep';
import { color as d3Color, hsl } from 'd3-color';
import { StrokeProps } from '../../types/svg/stroke';
import { convertCssToPx } from '../../utils/css';
import { TikZKey } from '../../types/tikz';
import { convertStrokeShortcut, convertStrokeType, StrokeShortcutProps, StrokeType } from '../../utils/style/stroke';
import { PointPosition } from '../../types/coordinate';
import { convertFontSize, convertFontStyle, TikZFontSize } from '../../utils/style/font';
import { FontProps } from '../../types/svg/font';
import DescartesPoint from '../../model/geometry/point/DescartesPoint';
import useScope from '../../hooks/context/useScope';

export type NodeProps = {
  name?: TikZKey;
  ref?: Ref<SVGGElement>;
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

const Node: FC<NodeProps> = props => {
  const { offset: scopeOffset, node } = useScope();
  const nodeScopeProps = { offset: scopeOffset, ...node };
  const realProps = {
    ...nodeScopeProps,
    ...props,
    offset: DescartesPoint.plus(scopeOffset || [0, 0], props.offset || [0, 0]),
  };

  const { shape = 'rectangle', width, height, position, offset, innerSep, outerSep, ...res1Props } = realProps;
  const { r, rx, ry, fill, fillOpacity, stroke = 'transparent', strokeWidth = 1, strokeType, ...res2Props } = res1Props;
  const { color = 'currentColor', size, fontSize, fontStyle, fontFamily, style, ...otherProps } = res2Props;

  const realPosition = useMemo<Position>(() => {
    const formatPosition = position ? DescartesPoint.formatPosition(position) : [0, 0];
    const formatOffset = offset ? DescartesPoint.formatPosition(offset) : [0, 0];
    return [formatPosition[0] + formatOffset[0], formatPosition[1] + formatOffset[1]];
  }, [position]);

  const realColor = useMemo(() => {
    // 自动根据 fill 计算内容颜色
    if (color === 'auto' && fill && fill !== 'currentColor') {
      const fillColor = d3Color(fill);
      // 无法解析 color
      if (!fillColor) return color || 'currentColor';
      fillColor.opacity = fillOpacity || 1;
      const lightness = hsl(fillColor).l;
      return lightness < 0.5 ? 'white' : 'black';
    }
    return color || 'currentColor';
  }, [color, fill, fillOpacity]);

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

  const adjustFontSize = useMemo(() => convertFontSize(size || fontSize), [size, fontSize]);

  const adjustedInnerSep = useMemo(
    () => getSep(innerSep, convertCssToPx(adjustFontSize) / 3 || '0.3333em'),
    [innerSep],
  );
  const adjustedOuterSep = useMemo(() => getSep(innerSep, 0), [outerSep]);

  return (
    <InnerNode
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
};

export default Node;
