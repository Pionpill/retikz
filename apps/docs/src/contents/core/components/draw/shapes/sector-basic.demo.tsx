import { Layout, Sector } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={340} height={180}>
    {/* 实心扇形拼饼图 */}
    <Sector center={[90, 90]} radius={72} startAngle={0} endAngle={120} fill="darkorange" stroke="dimgray" strokeWidth={1} />
    <Sector center={[90, 90]} radius={72} startAngle={120} endAngle={210} fill="dodgerblue" stroke="dimgray" strokeWidth={1} />
    <Sector center={[90, 90]} radius={72} startAngle={210} endAngle={360} fill="darkviolet" stroke="dimgray" strokeWidth={1} />
    {/* 空心扇形（环形扇区）：三段 innerRadius 不同，凸显它控制空心半径 / 环宽 */}
    <Sector center={[250, 90]} radius={72} innerRadius={20} startAngle={0} endAngle={120} fill="darkorange" stroke="dimgray" strokeWidth={1} />
    <Sector center={[250, 90]} radius={72} innerRadius={42} startAngle={120} endAngle={210} fill="dodgerblue" stroke="dimgray" strokeWidth={1} />
    <Sector center={[250, 90]} radius={72} innerRadius={58} startAngle={210} endAngle={360} fill="darkviolet" stroke="dimgray" strokeWidth={1} />
  </Layout>
);

export default Demo;
