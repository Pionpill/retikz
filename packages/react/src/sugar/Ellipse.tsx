import type { FC } from 'react';
import type { IRTarget } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import {
  type AngleInput,
  type PathVisualProps,
  midpoint,
  pickPathVisual,
  requireXY,
  resolveAngles,
} from './_shared';

/** `<Ellipse>` 形态：三选一定中心 + 两半轴，外加可选部分裁剪角度 */
export type EllipseProps = PathVisualProps &
  AngleInput & {
    /** 部分裁剪闭合模式（带角度时）：chord（默认）/ open；不给角度=整椭圆 */
    closed?: 'chord' | 'open';
  } & (
    | { center: IRTarget; radiusX: number; radiusY: number }
    | { center: IRTarget; diameterX: number; diameterY: number }
    | { corner1: [number, number]; corner2: [number, number] }
  );

/**
 * Ellipse sugar——展开为 `<Path><Step move><Step ellipsePath></Path>`
 * @description center 透传形态可接任意 Target；corner 形态（内切椭圆）需算坐标 → 限 literal 笛卡尔。
 */
export const Ellipse: FC<EllipseProps> = props => {
  let center: IRTarget;
  let radiusX: number;
  let radiusY: number;
  if ('radiusX' in props) {
    center = props.center;
    radiusX = props.radiusX;
    radiusY = props.radiusY;
  } else if ('diameterX' in props) {
    center = props.center;
    radiusX = props.diameterX / 2;
    radiusY = props.diameterY / 2;
  } else if ('corner1' in props) {
    const c1 = requireXY(props.corner1, 'Ellipse', 'corner1');
    const c2 = requireXY(props.corner2, 'Ellipse', 'corner2');
    center = midpoint(c1, c2);
    radiusX = Math.abs(c2[0] - c1[0]) / 2;
    radiusY = Math.abs(c2[1] - c1[1]) / 2;
  } else {
    throw new Error(
      '<Ellipse> 需要 { center, radiusX, radiusY } / { center, diameterX, diameterY } / { corner1, corner2 } 之一',
    );
  }

  const angles = resolveAngles(props, 'Ellipse');

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={center} />
      <Step
        kind="ellipsePath"
        radiusX={radiusX}
        radiusY={radiusY}
        startAngle={angles?.startAngle}
        endAngle={angles?.endAngle}
        closed={angles ? (props.closed ?? 'chord') : undefined}
      />
    </Path>
  );
};
