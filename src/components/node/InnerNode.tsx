import { FC, ReactNode, useLayoutEffect, useRef } from 'react';
import { Position } from '../../types/coordinate/descartes';
import { StrokeProps } from '../../types/svg/stroke';
import { TikZProps } from '../../types/tikz';
import Group from '../../container/Group';
import { DirectionDistance } from '../../types/distance';
import useNodeShape from './_hooks/useNodeShape';
import useNodeContent from './_hooks/useNodeContent';
import useNodeConfig from './_hooks/useNodeConfig';
import { convertCssToPx } from '../../utils/css';
import useNodes from '../../hooks/context/useNodes';
import useCalculate from '../../hooks/context/useCalculate';
import { FontProps } from '../../types/svg/font';
import { convertPrecision } from '../../utils/math';

/** 节点外边框形状 */
export type NodeShape = 'rectangle';

/** 外层形状相关属性 */
export type ShapeProps = {
  shape: NodeShape;
  rx?: number | string;
  ry?: number | string;
  fill?: string;
  fillOpacity?: number;
} & StrokeProps;

/** 内容相关属性 */
export type ContentProps = {
  color: string;
  opacity?: number;
  children?: ReactNode;
  size?: string | number;
} & FontProps;

export type InnerNodeProps = {
  position: Position;
  width?: number;
  height?: number;
  innerSep: DirectionDistance<number | string>;
  outerSep: DirectionDistance<number | string>;
  rotate?: number;
} & TikZProps &
  ContentProps &
  ShapeProps;

const InnerNode: FC<InnerNodeProps> = props => {
  const { name, ref, position, width, height, innerSep, outerSep, rotate } = props;

  const nodeRef = useRef<SVGGElement>(null);
  const shapeRef = useRef<SVGGraphicsElement>(null);
  const contentRef = useRef<SVGElement>(null);

  const { getModel, updateModel, deleteModel } = useNodes();
  const { precision } = useCalculate();

  const nodeConfig = useNodeConfig();
  nodeConfig.current.position = position;

  // 在 render 阶段创建未初始化的节点
  if (name && !getModel(name)) {
    updateModel(name, nodeConfig.current, false);
  }

  const groupElement = ref && 'current' in ref ? ref.current : nodeRef.current;

  // 计算内容尺寸并存储进 nodeConfig
  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;
    const { width: elementWidth, height: elementHeight } = contentElement.getBoundingClientRect();
    nodeConfig.current.contentSize = [Math.max(elementWidth, width || 0), Math.max(elementHeight, height || 0)];
  });

  const getSep = (sep: DirectionDistance<number | string>): DirectionDistance => {
    const { width = 100, height = 100 } = groupElement?.getBoundingClientRect() || {};
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const emPx = groupElement ? parseFloat(getComputedStyle(groupElement).fontSize) : remPx;
    return {
      left: convertCssToPx(sep.left, { remPx, emPx, parentPx: width }),
      right: convertCssToPx(sep.right, { remPx, emPx, parentPx: width }),
      top: convertCssToPx(sep.top, { remPx, emPx, parentPx: height }),
      bottom: convertCssToPx(sep.bottom, { remPx, emPx, parentPx: height }),
    };
  };

  // 计算内边距并存储进 nodeConfig
  useLayoutEffect(() => {
    nodeConfig.current.innerSep = getSep(innerSep);
  }, [innerSep]);

  // 计算外边距并存储进 nodeConfig
  useLayoutEffect(() => {
    nodeConfig.current.outerSep = getSep(outerSep);
  }, [outerSep]);

  // 设置 shape
  useLayoutEffect(() => {
    const {
      contentSize: [width, height],
      innerSep,
    } = nodeConfig.current;
    const realX = -width / 2 - innerSep.left;
    shapeRef.current?.setAttribute('x', convertPrecision(realX, precision).toString());
    const realY = -height / 2 - innerSep.top;
    shapeRef.current?.setAttribute('y', convertPrecision(realY, precision).toString());
    const realWidth = width + innerSep.left + innerSep.right;
    shapeRef.current?.setAttribute('width', convertPrecision(realWidth, precision).toString());
    const realHeight = height + innerSep.top + innerSep.bottom;
    shapeRef.current?.setAttribute('height', convertPrecision(realHeight, precision).toString());
  }, [nodeConfig.current.position, nodeConfig.current.contentSize, nodeConfig.current.innerSep]);

  // 每次视图更新时更新模型
  useLayoutEffect(() => {
    if (name) updateModel(name, nodeConfig.current);
  });

  // 卸载组件时同步删除模型
  useLayoutEffect(
    () => () => {
      if (name) {
        deleteModel(name);
      }
    },
    [name],
  );

  return (
    <Group
      ref={ref || nodeRef}
      id={name}
      transform={`translate(${position[0]}, ${position[1]}) ${rotate ? `rotate(${rotate})` : ''}`}
    >
      {useNodeShape(props, shapeRef)}
      {useNodeContent(props, contentRef)}
    </Group>
  );
};

export default InnerNode;
