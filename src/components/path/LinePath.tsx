import { FC, SVGProps, useEffect, useState } from 'react';
import useTikZ from '../../hooks/useTikZ';
import { getLinePath } from '../../utils/equation';
import Path from '../../elements/Path';

export type LinePathProps = {
  from: string;
  to: string;
} & Omit<SVGProps<SVGPathElement>, 'p'>;

/** 支持响应 */
const LinePath: FC<LinePathProps> = props => {
  const { from, to, ...pathProps } = props;

  const tikz = useTikZ();
  const [d, setD] = useState('');

  useEffect(() => {
    setTimeout(() => {
      const fromNode = tikz.elements.get(from);
      const toNode = tikz.elements.get(to);
      if (!fromNode || !toNode) {
        console.error(`no node named ${from || to}, you must defined it before using`);
        return;
      }
      const startPoint = fromNode.getLinkPoint(toNode.center);
      const endPoint = toNode.getLinkPoint(fromNode.center);
      if (!startPoint || !endPoint) {
        console.warn(`calculate line err, nodes may intersect`);
        return;
      }
      const path = getLinePath([startPoint, endPoint]);
      path && setD(path);
    });
  });

  return <Path d={d} {...pathProps} />;
};

export default LinePath;
