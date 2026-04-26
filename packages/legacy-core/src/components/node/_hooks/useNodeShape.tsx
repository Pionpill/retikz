import type { Ref } from 'react';
import Rect from '../../../elements/Rect';
import type { ShapeProps } from '../InnerNode';

/** 获取形状属性 */
const getShapeProps = (nodeProps: ShapeProps) => {
  const { rx, ry, fill, fillOpacity, stroke, strokeWidth, strokeOpacity } = nodeProps;
  const { strokeDasharray, strokeDashoffset, strokeLinecap, strokeLinejoin, strokeMiterlimit } = nodeProps;
  // TODO 暂时只支持 rectangle 属性传递，所以写的简单
  return {
    rx,
    ry,
    fill,
    fillOpacity,
    stroke,
    strokeWidth,
    strokeOpacity,
    strokeDasharray,
    strokeDashoffset,
    strokeLinecap,
    strokeLinejoin,
    strokeMiterlimit,
  };
};

const useNodeShape = (props: ShapeProps, ref: Ref<SVGRectElement>) => {
  const shapeProps = getShapeProps(props);
  return <Rect ref={ref} {...shapeProps} />;
};

export default useNodeShape;
