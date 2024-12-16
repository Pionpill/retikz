import { LayoutDistanceProps } from '../../types/layout.type';
import { AllLayoutDistance } from '../../types/tikz.type';
import useLayoutBorderDistance from './useLayoutBorderDistance';
import useLayoutMarginDistance from './useLayoutMarginDistance';
import useLayoutPaddingDistance from './useLayoutPaddingDistance';

const useLayoutDistance = (props: LayoutDistanceProps): AllLayoutDistance => {
  const paddings = useLayoutPaddingDistance(props);
  const margins = useLayoutMarginDistance(props);
  const borders = useLayoutBorderDistance(props);
  return {
    paddings,
    margins,
    borders,
  };
};

export default useLayoutDistance;
