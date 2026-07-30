import type { FC } from 'react';

import { DataTransformShapeFigure } from './data-transform-shape';

/** 数据变换前后的表结构对照 */
const Demo: FC = () => (
  <DataTransformShapeFigure sourceTitle="规范化明细 · 4 × 3" resultTitle="分组汇总 · 2 × 3" east="东部" west="西部" />
);

export default Demo;
