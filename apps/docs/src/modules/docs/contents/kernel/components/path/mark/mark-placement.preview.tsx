import { Draw, Layout } from '@retikz/react';
import type { FC } from 'react';

/** 标记试验场参数 */
export type MarkPlacementPreviewProps = {
  shape: string;
  position: number;
  positionMode: 'step' | 'length';
  positionGeometry: 'default' | 'original' | 'rounded';
  cornerRadius: number;
  scale: number;
  color: string;
  autoRotate: boolean;
  angle: number;
};

/** 在固定路径上观察标记位置与方向 */
export const MarkPlacementPreview: FC<MarkPlacementPreviewProps> = props => {
  const { shape, position, scale, color, autoRotate, angle, positionMode, positionGeometry, cornerRadius } = props;
  return (
    <Layout viewBox={{ x: -160, y: -80, width: 320, height: 160 }}>
      <Draw
        way={[
          [-120, 35],
          [60, -35],
          [120, 35],
        ]}
        cornerRadius={cornerRadius}
        arrow="->"
        style={{ stroke: 'currentColor', strokeWidth: 2 }}
        marks={[
          {
            pos: position,
            positionMode,
            positionGeometry: positionGeometry === 'default' ? undefined : positionGeometry,
            shape,
            scale,
            stroke: color,
            fill: color,
            rotate: autoRotate ? 'auto' : angle,
          },
        ]}
      />
    </Layout>
  );
};
