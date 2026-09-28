import { Layout, Node } from '@retikz/react';
import { Rectangle } from '@retikz/standard-react/shape';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { allocationFigureI18n } from './allocation-figure.i18n';

export type AllocationFigureProps = { lang?: Lang };
/** 同一尺度下显示分配几何与固定参照 */
const AllocationFigure: FC<AllocationFigureProps> = props => {
  const { lang = 'zh' } = props;
  const text = allocationFigureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Rectangle corner1={[0, 0]} width={200} height={100} style={{ stroke: 'gray', dashPattern: [1, 4] }} />
      <Rectangle corner1={[110, 20]} width={40} height={20} style={{ stroke: 'dodgerblue' }} />
      <Node
        position={[150, 20]}
        shape="circle"
        layout={{ minimumSize: 4 }}
        style={{ fill: 'darkorange', stroke: 'darkorange' }}
      />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[150, -20]} text={text.point} />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[130, 63]} text={text.slot} />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[100, 125]} text={text.origin} />
    </Layout>
  );
};
export default AllocationFigure;
