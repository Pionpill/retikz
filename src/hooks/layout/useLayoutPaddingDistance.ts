import { useMemo } from 'react';
import { LayoutPaddingDistanceProps } from '../../types/layout.type';
import { transferLayoutDistance } from '../../utils/layout.utils';

/** 将 padding 距离属性值转换为 px */
const useLayoutPaddingDistance = (props: LayoutPaddingDistanceProps, element?: HTMLElement) => {
  const { pl, pr, pt, pb, px, py, p } = props;
  const LayoutAllDistance = {
    defaultVal: p,
    x: px,
    y: py,
    left: pl,
    right: pr,
    top: pt,
    bottom: pb,
  };
  return useMemo(() => transferLayoutDistance(LayoutAllDistance, element), [...Object.values(LayoutAllDistance), element]);
};

export default useLayoutPaddingDistance;
