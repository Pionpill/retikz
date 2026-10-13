import { Draw, Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 通过 Array 下标生成的单元格 id 引用第二格 */
const ArrayCellReference: FC = () => (
  <Layout viewBox={{ x: -32, y: -20, width: 310, height: 120 }}>
    <Array
      id="queue"
      cellIdMode="index"
      data={['A', 'B']}
      index
      layout={{ gap: 8 }}
      defaultCell={{
        style: { fill: 'dodgerblue', stroke: 'dodgerblue', opacity: { fill: 0.14 } },
        layout: { width: 62, height: 42 },
      }}
    />
    <Draw way={[[225, 21], 'queue-1.right']} arrow="->" style={{ stroke: 'dodgerblue' }} />
  </Layout>
);

export default ArrayCellReference;
