import { Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

const GetStartStep1: FC = () => (
  <Tikz width={420} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
  </Tikz>
);

export default GetStartStep1;
