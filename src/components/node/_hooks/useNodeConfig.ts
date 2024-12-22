import { useRef } from 'react';
import { DirectionDistance } from '../../../types/distance';
import { Size } from '../../../types/shape';
import { Position } from '../../../types/coordinate/descartes';

export type NodeConfig = {
  /** 内容中心位置 */
  position: Position;
  /** 内容（文本）尺寸 */
  contentSize: Size;
  /** 内边框距离 */
  innerSep: DirectionDistance;
  /** 外边框距离 */
  outerSep: DirectionDistance;
};

const useNodeConfig = () => {
  const configRef = useRef<NodeConfig>({
    position: [0, 0],
    contentSize: [0, 0],
    innerSep: { left: 0, right: 0, top: 0, bottom: 0 },
    outerSep: { left: 0, right: 0, top: 0, bottom: 0 },
  });
  return configRef;
};

export default useNodeConfig;
