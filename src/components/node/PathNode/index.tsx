import { FC, useId, useLayoutEffect, useMemo, useState } from 'react';
import Node, { NodeProps } from '../Node';
import { Position } from '../../../types/coordinate/descartes';
import useAnchor from './useAnchor';
import useNodes from '../../../hooks/tikz/useNodes';
import { Direction } from '../../../types/coordinate';
import DescartesPoint from '../../../model/geometry/point/DescartesPoint';
import { convertCssToPx } from '../../../utils/css';

type PathNodePositionProps = {
  left?: boolean | number | string;
  right?: boolean | number | string;
  above?: boolean | number | string;
  below?: boolean | number | string;
};

type PosShortcutProps = {
  /** pos: 0 */
  start?: boolean;
  /** pos: 0.125 */
  veryNearStart?: boolean;
  /** pos: 0.25 */
  nearStart?: boolean;
  /** pos: 0.5 */
  midway?: boolean;
  /** pos: 0.75 */
  nearEnd?: boolean;
  /** pos: 0.875 */
  veryNearEnd?: boolean;
  /** pos: 1 */
  end?: boolean;
};

export type PathNodeProps = {
  segmentIndex?: number;
  /** path 片段的下标 */
  pos?: number;
  /** 相对于路径的位置 */
  anchor?: Direction | 'center';
  /** 偏移位置 */
  offset?: Position;
  /** 跟随箭头位置 */
  sloped?: boolean;
} & PathNodePositionProps &
  PosShortcutProps &
  Omit<NodeProps, 'position'>;

const PathNode: FC<PathNodeProps> = props => {
  const { segmentIndex = -1, offset = [0, 0], anchor, ref, left, right, above, below, name, ...resProps } = props;
  const { pos, veryNearStart, veryNearEnd, start, nearStart, midway, nearEnd, end, sloped, ...nodeProps } = resProps;

  const id = useId();
  const realName = name ?? id;

  const posRadio = useMemo(() => {
    if (pos !== undefined) return pos;
    if (start) return 0;
    if (veryNearStart) return 0.125;
    if (nearStart) return 0.25;
    if (midway) return 0.5;
    if (nearEnd) return 0.75;
    if (veryNearEnd) return 0.875;
    return 1;
  }, [pos, veryNearStart, veryNearEnd, start, nearStart, midway, nearEnd, end]);

  const directionPos = useMemo<{ direction: Direction | 'center'; distance: number }>(() => {
    if (left) return { direction: 'left', distance: typeof left === 'boolean' ? 0 : convertCssToPx(left) };
    if (right) return { direction: 'right', distance: typeof right === 'boolean' ? 0 : convertCssToPx(right) };
    if (above) return { direction: 'top', distance: typeof above === 'boolean' ? 0 : convertCssToPx(above) };
    if (below) return { direction: 'bottom', distance: typeof below === 'boolean' ? 0 : convertCssToPx(below) };
    return { direction: anchor ?? 'center', distance: 0 };
  }, [anchor, left, right, above, below]);

  const {position: anchorPosition, angle: anchorAngle} = useAnchor(posRadio, segmentIndex);
  const [adjustOffset, setAdjustOffset] = useState(DescartesPoint.plus(anchorPosition, offset));
  const { getModel } = useNodes();

  const rotate = useMemo(() => {
    if (!sloped) return 0;
    return anchorAngle * (180 / Math.PI);
  }, [sloped, anchorAngle])

  useLayoutEffect(() => {
    const model = getModel(realName);
    if (!model || !model.init) return;

    const { direction, distance } = directionPos;
    let directionPosition: Position = [0, 0];
    switch (direction) {
      case 'left':
        directionPosition = [-model?.getOuterDistance('left') - distance, 0];
        break;
      case 'right':
        directionPosition = [model?.getOuterDistance('right') + distance, 0];
        break;
      case 'top':
        directionPosition = [0, -model?.getOuterDistance('top') - distance];
        break;
      case 'bottom':
        directionPosition = [0, model?.getOuterDistance('bottom') + distance];
        break;
    }
    setAdjustOffset(DescartesPoint.plus(anchorPosition, directionPosition, offset));
  }, [anchorPosition, directionPos]);

  return <Node name={realName} position={adjustOffset} ref={ref} rotate={rotate} {...nodeProps} />;
};

export default PathNode;
