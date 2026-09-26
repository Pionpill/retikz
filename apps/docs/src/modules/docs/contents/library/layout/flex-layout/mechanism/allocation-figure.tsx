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
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[100, -30]} text={text.before} />
      <Rectangle corner1={[0, 0]} width={40} height={24} style={{ stroke: 'dodgerblue' }} />
      <Rectangle corner1={[52, 0]} width={40} height={24} style={{ stroke: 'darkorange' }} />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[20, 12]} text="40" />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[72, 12]} text="40" />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[100, 60]} text={text.after} />
      <Rectangle corner1={[0, 90]} width={67} height={24} style={{ stroke: 'dodgerblue' }} />
      <Rectangle corner1={[79, 90]} width={121} height={24} style={{ stroke: 'darkorange' }} />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[33.5, 102]} text="67" />
      <Node style={{ stroke: 'none', fill: 'none', font: { size: 14 } }} position={[139.5, 102]} text="121" />
      <Rectangle corner1={[0, -4]} width={200} height={32} style={{ stroke: 'gray', dashPattern: [1, 4] }} />
      <Rectangle corner1={[0, 86]} width={200} height={32} style={{ stroke: 'gray', dashPattern: [1, 4] }} />
    </Layout>
  );
};
export default AllocationFigure;
