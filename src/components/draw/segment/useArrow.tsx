import { useMemo } from 'react';
import useCalculate from '../../../hooks/tikz/useCalculate';
import { ArrowConfig } from '../types';
import { Position } from '../../../types/coordinate/descartes';
import getArrowPath from '../arrow';
import Path from '../../../elements/Path';
import Line from '../../../model/equation/line';

export type ArrowLinkConfig = {
  nearPosition: Position;
  position: Position;
  arrowType: 'start' | 'end';
};

const useArrow = (linkConfig: ArrowLinkConfig, arrowConfig?: ArrowConfig) => {
  const integerMode = useCalculate();
  return useMemo(() => {
    if (!arrowConfig) return null;

    const { position, nearPosition } = linkConfig;
    const { type, stroke, linkType = 'end', round, strokeLinejoin, strokeWidth, ...strokeProps } = arrowConfig;

    const degree = Line.getDegree(nearPosition, position);

    const isRound = round || strokeLinejoin === 'round';
    const realStrokeWidth = strokeWidth ?? 1;

    const { d, offsetDistance, insertDistance } = getArrowPath(type, arrowConfig);

    const endOffset: Position = [
      (isRound ? realStrokeWidth : offsetDistance) * Math.cos(degree),
      (isRound ? realStrokeWidth : offsetDistance) * Math.sin(degree),
    ];

    const translatePosition: Position =
      linkType === 'end'
        ? [position[0] - endOffset[0], position[1] - endOffset[1]]
        : [position[0] + insertDistance * Math.cos(degree), position[1] + insertDistance * Math.sin(degree)];

    const linkPoint: Position =
      linkType === 'end'
        ? [
            position[0] - insertDistance * Math.cos(degree) - endOffset[0],
            position[1] - insertDistance * Math.sin(degree) - endOffset[1],
          ]
        : position;

    const transform = `translate(${integerMode ? Math.round(translatePosition[0]) : translatePosition[0]}, ${
      integerMode ? Math.round(translatePosition[1]) : translatePosition[1]
    }) rotate(${integerMode ? Math.round(degree * (180 / Math.PI)) : degree * (180 / Math.PI)})`;

    return {
      linkPoint,
      arrowPath: (
        <Path
          d={d}
          strokeWidth={strokeWidth}
          strokeLinejoin={round ? 'round' : 'miter'}
          strokeMiterlimit={10}
          fill={stroke || 'currentColor'}
          stroke={stroke}
          transform={transform}
          {...strokeProps}
        />
      ),
    };
  }, [arrowConfig, linkConfig]);
};

export default useArrow;
