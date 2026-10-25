import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

import { ringMark } from './ring-mark';

/** 圆环实例参数 */
export type CustomMarkPreviewProps = { radius: number; position: number; scale: number; color: string };

/** 注册圆环并在路径上引用 */
export const CustomMarkPreview: FC<CustomMarkPreviewProps> = props => {
  const { radius, position, scale, color } = props;
  return (
    <Layout extensions={{ marks: [ringMark] }} viewBox={{ x: -160, y: -60, width: 320, height: 120 }}>
      <Draw
        way={[
          [-120, 0],
          [120, 0],
        ]}
        arrow="->"
        style={{ stroke: 'currentColor', strokeWidth: 2 }}
        marks={[{ pos: position, shape: 'ring', params: { radius }, scale, stroke: color }]}
      />
    </Layout>
  );
};
