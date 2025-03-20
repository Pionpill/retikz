import { Ref, useMemo } from 'react';
import Rect from '../../../elements/Rect';
import { ShapeProps } from '../InnerNode';

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

const useNodeShape = (props: ShapeProps, ref: Ref<SVGGraphicsElement>) => {
  const shapeProps = getShapeProps(props);
  const Shape = useMemo(() => {
    switch (props.shape) {
      case 'rectangle':
        return Rect;
    }
  }, [props.shape, ...Object.values(shapeProps)]);
  // @ts-expect-error 暂时没有添加其他 shape
  return <Shape ref={ref} {...shapeProps} />;
};

export default useNodeShape;
