import { useMemo } from 'react';
import { LayoutMarginDistanceProps } from '../../types/layout.type';
import { transferLayoutDistance } from '../../utils/layout.utils';

/** 将 margin 距离属性值转换为 px */
const useLayoutMarginDistance = (props: LayoutMarginDistanceProps, element?: HTMLElement) => {
  const { ml, mr, mt, mb, mx, my, m } = props;
  const LayoutAllDistance = {
    defaultVal: m,
    x: mx,
    y: my,
    left: ml,
    right: mr,
    top: mt,
    bottom: mb,
  };
  return useMemo(() => transferLayoutDistance(LayoutAllDistance, element), [...Object.values(LayoutAllDistance), element]);
};

export default useLayoutMarginDistance;
