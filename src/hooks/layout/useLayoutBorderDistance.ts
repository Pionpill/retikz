import { useMemo } from 'react';
import { LayoutBorderDistanceProps } from '../../types/layout.type';
import { transferLayoutDistance } from '../../utils/layout.utils';

/** 将 border 距离属性值转换为 px */
const useLayoutBorderDistance = (props: LayoutBorderDistanceProps, element?: HTMLElement) => {
  const { bl, br, bt, bb, bx, by, b } = props;
  const LayoutAllDistance = {
    defaultVal: b,
    x: bx,
    y: by,
    left: bl,
    right: br,
    top: bt,
    bottom: bb,
  };
  return useMemo(() => transferLayoutDistance(LayoutAllDistance, element), [...Object.values(LayoutAllDistance), element]);
};

export default useLayoutBorderDistance;
