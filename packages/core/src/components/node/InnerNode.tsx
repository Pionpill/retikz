import type { ReactNode } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useRef } from 'react';
import type { Position } from '../../types/coordinate/descartes';
import type { StrokeProps } from '../../types/svg/stroke';
import type { TikZProps } from '../../types/tikz';
import Group from '../../container/Group';
import type { DirectionDistance } from '../../types/distance';
import useNodeShape from './_hooks/useNodeShape';
import useNodeContent from './_hooks/useNodeContent';
import { convertCssToPx } from '../../utils/css';
import useNodes from '../../hooks/context/useNodes';
import useCalculate from '../../hooks/context/useCalculate';
import type { FontProps } from '../../types/svg/font';
import { convertPrecision } from '../../utils/math';
import type { NodeConfig } from '../../model/component/node';

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

const InnerNode = forwardRef<SVGGElement, InnerNodeProps>((props, ref) => {
  const { name, position, width, height, innerSep, outerSep, rotate } = props;

  const nodeRef = useRef<SVGGElement>(null);
  const shapeRef = useRef<SVGRectElement>(null);
  const contentRef = useRef<SVGElement>(null);

  const { getModel, updateModel, deleteModel } = useNodes();
  const { precision } = useCalculate();

  const nodeConfigRef = useRef<NodeConfig>({
    position,
    contentSize: [0, 0],
    innerSep: { left: 0, right: 0, top: 0, bottom: 0 },
    outerSep: { left: 0, right: 0, top: 0, bottom: 0 },
  });

  const groupElement = ref && 'current' in ref ? ref.current : nodeRef.current;

  useLayoutEffect(() => {
    nodeConfigRef.current = { ...nodeConfigRef.current, position };
    if (name && !getModel(name)) {
      updateModel(name, nodeConfigRef.current, false);
    }
  }, [getModel, name, position, updateModel]);

  // 计算内容尺寸并存储进 nodeConfig
  useLayoutEffect(() => {
    const contentElement = contentRef.current;
    if (!contentElement) return;
    const { width: elementWidth, height: elementHeight } = contentElement.getBoundingClientRect();
    const nextContentSize: NodeConfig['contentSize'] = [
      Math.max(elementWidth, width || 0),
      Math.max(elementHeight, height || 0),
    ];
    nodeConfigRef.current = { ...nodeConfigRef.current, contentSize: nextContentSize };
  }, [height, width]);

  const getSep = useCallback(
    (sep: DirectionDistance<number | string>): DirectionDistance => {
      const { width: groupWidth = 100, height: groupHeight = 100 } = groupElement?.getBoundingClientRect() || {};
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize);
      const emPx = groupElement ? parseFloat(getComputedStyle(groupElement).fontSize) : remPx;
      return {
        left: convertCssToPx(sep.left, { remPx, emPx, parentPx: groupWidth }),
        right: convertCssToPx(sep.right, { remPx, emPx, parentPx: groupWidth }),
        top: convertCssToPx(sep.top, { remPx, emPx, parentPx: groupHeight }),
        bottom: convertCssToPx(sep.bottom, { remPx, emPx, parentPx: groupHeight }),
      };
    },
    [groupElement],
  );

  // 计算内边距并存储进 nodeConfig
  useLayoutEffect(() => {
    nodeConfigRef.current = { ...nodeConfigRef.current, innerSep: getSep(innerSep) };
  }, [getSep, innerSep]);

  // 计算外边距并存储进 nodeConfig
  useLayoutEffect(() => {
    nodeConfigRef.current = { ...nodeConfigRef.current, outerSep: getSep(outerSep) };
  }, [getSep, outerSep]);

  // 设置 shape
  useLayoutEffect(() => {
    const {
      contentSize: [contentWidth, contentHeight],
      innerSep: contentInnerSep,
    } = nodeConfigRef.current;
    const realX = -contentWidth / 2 - contentInnerSep.left;
    shapeRef.current?.setAttribute('x', convertPrecision(realX, precision).toString());
    const realY = -contentHeight / 2 - contentInnerSep.top;
    shapeRef.current?.setAttribute('y', convertPrecision(realY, precision).toString());
    const realWidth = contentWidth + contentInnerSep.left + contentInnerSep.right;
    shapeRef.current?.setAttribute('width', convertPrecision(realWidth, precision).toString());
    const realHeight = contentHeight + contentInnerSep.top + contentInnerSep.bottom;
    shapeRef.current?.setAttribute('height', convertPrecision(realHeight, precision).toString());
  }, [precision]);

  // 每次视图更新时更新模型
  useLayoutEffect(() => {
    if (name) updateModel(name, { ...nodeConfigRef.current, position });
  });

  // 卸载组件时同步删除模型
  useLayoutEffect(
    () => () => {
      if (name) {
        deleteModel(name);
      }
    },
    [deleteModel, name],
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
});

export default InnerNode;
