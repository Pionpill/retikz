import { Draw, Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';
import type { FC } from 'react';

/** 通过 List 下标生成的单元格 id 引用第二格 */
const ListCellReference: FC = () => (
  <Layout viewBox={{ x: -32, y: -20, width: 310, height: 120 }}>
    <List
      id="queue"
      cellIdMode="index"
      data={['A', 'B']}
      index
      layout={{ width: 62, height: 42, gap: 8 }}
      style={{ fill: 'dodgerblue', fillOpacity: 0.14, stroke: 'dodgerblue' }}
    />
    <Draw way={[[225, 21], 'queue-1.right']} arrow="->" style={{ stroke: 'dodgerblue' }} />
  </Layout>
);

export default ListCellReference;
