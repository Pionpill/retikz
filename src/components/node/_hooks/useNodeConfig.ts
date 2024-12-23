import { useRef } from 'react';
import { NodeConfig } from '../../../model/component/node';

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
