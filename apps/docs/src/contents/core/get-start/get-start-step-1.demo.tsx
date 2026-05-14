import { Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

const GetStartStep1: FC = () => (
  <TikZ width={420} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
  </TikZ>
);

export default GetStartStep1;
