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

/** `<Circle>` 形态：四选一定圆心 + 半径，外加可选部分裁剪角度 */
export type CircleProps = PathVisualProps &
  AngleInput & {
    /** 部分裁剪闭合模式（带角度时）：chord（弦，默认）/ open（纯弧）；不给角度=整圆 */
    closed?: 'chord' | 'open';
  } & (
    | { center: IRTarget; radius: number }
    | { center: IRTarget; diameter: number }
    | { from: [number, number]; to: [number, number] }
    | { corner1: [number, number]; corner2: [number, number] }
  );

/**
 * Circle sugar——展开为 `<Path><Step move><Step circlePath></Path>`
 * @description 纯函数（builder 在 IR 构造期同步调用，不能用 hooks）。center 透传形态可接任意 Target；
 *   from/to、corner 形态需算坐标 → 点位限 literal 笛卡尔。带角度（三键求二）= 部分圆（chord/open）。
 */
export const Circle: FC<CircleProps> = props => {
  let center: IRTarget;
  let radius: number;
  if ('radius' in props) {
    center = props.center;
    radius = props.radius;
  } else if ('diameter' in props) {
    center = props.center;
    radius = props.diameter / 2;
  } else if ('from' in props) {
    const from = requireXY(props.from, 'Circle', 'from');
    const to = requireXY(props.to, 'Circle', 'to');
    center = midpoint(from, to);
    radius = Math.hypot(to[0] - from[0], to[1] - from[1]) / 2;
  } else if ('corner1' in props) {
    const c1 = requireXY(props.corner1, 'Circle', 'corner1');
    const c2 = requireXY(props.corner2, 'Circle', 'corner2');
    center = midpoint(c1, c2);
    radius = Math.min(Math.abs(c2[0] - c1[0]), Math.abs(c2[1] - c1[1])) / 2;
  } else {
    throw new Error(
      '<Circle> 需要 { center, radius } / { center, diameter } / { from, to } / { corner1, corner2 } 之一',
    );
  }

  const angles = resolveAngles(props, 'Circle');

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={center} />
      <Step
        kind="circlePath"
        radius={radius}
        startAngle={angles?.startAngle}
        endAngle={angles?.endAngle}
        closed={angles ? (props.closed ?? 'chord') : undefined}
      />
    </Path>
  );
};
