import { Layout, Sector } from '@retikz/react';
import type { FC } from 'react';

/**
 * 整体变换：rotate / scale 把整条 path 绕包围盒中心变换（免包 Scope）。
 * rotate 让轴对齐椭圆扇形倾斜——这是目前画"斜椭圆扇形"的方式。
 */
const Demo: FC = () => (
  <Layout width={320} height={160}>
    {/* 原始轴对齐椭圆扇形 */}
    <Sector center={[80, 80]} radiusX={70} radiusY={40} startAngle={0} endAngle={120} fill="dodgerblue" stroke="dimgray" strokeWidth={1} />
    {/* rotate={40}：整条 path 绕包围盒中心旋转，得到倾斜椭圆扇形 */}
    <Sector center={[240, 80]} radiusX={70} radiusY={40} startAngle={0} endAngle={120} rotate={40} fill="darkorange" stroke="dimgray" strokeWidth={1} />
  </Layout>
);

export default Demo;
