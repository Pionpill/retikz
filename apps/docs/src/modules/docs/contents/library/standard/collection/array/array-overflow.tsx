import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 同一固定宽度下，对比文字溢出与单元格裁切 */
const ArrayOverflow: FC = () => (
  <Layout viewBox={{ x: -220, y: -65, width: 440, height: 130 }}>
    <Array
      position={[-120, 0]}
      items={['ABCDEFGHIJKLMNOPQRST']}
      defaultCell={{ style: { stroke: 'gray' }, layout: { width: 84, height: 40, overflow: 'visible' } }}
    />
    <Array
      position={[110, 0]}
      items={['ABCDEFGHIJKLMNOPQRST']}
      defaultCell={{ style: { stroke: 'gray' }, layout: { width: 84, height: 40, overflow: 'clip' } }}
    />
  </Layout>
);

export default ArrayOverflow;
