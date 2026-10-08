import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

/** 同一固定宽度下，对比文字溢出与单元格裁切 */
const ArrayOverflow: FC = () => (
  <Layout viewBox={{ x: -220, y: -65, width: 440, height: 130 }}>
    <Array
      position={[-120, 0]}
      items={['ABCDEFGHIJKLMNOPQRST']}
      layout={{ width: 84, height: 40, overflow: 'visible' }}
      style={{ stroke: 'gray' }}
    />
    <Array
      position={[110, 0]}
      items={['ABCDEFGHIJKLMNOPQRST']}
      layout={{ width: 84, height: 40, overflow: 'clip' }}
      style={{ stroke: 'gray' }}
    />
  </Layout>
);

export default ArrayOverflow;
