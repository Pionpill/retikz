import type { FC } from 'react';
import type { IRTarget } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import { type AngleInput, type PathVisualProps, pickPathVisual, resolveAngles } from './_shared';

/** `<Arc>` 形态：圆弧（radius）/ 椭圆弧（radiusX/radiusY）；必给角度（三键求二） */
export type ArcProps = PathVisualProps &
  AngleInput &
  (
    | { center: IRTarget; radius: number }
    | { center: IRTarget; radiusX: number; radiusY: number }
  );

/**
 * Arc sugar——开放弧（不闭合），展开为 `<Path><Step move(center)><Step arc(center)></Path>`
 * @description center 透传（任意 Target）；arc 用显式 center，startSegment 跳到弧起点画弧，sugar 不算 arcStart。Arc 必给角度。
 */
export const Arc: FC<ArcProps> = props => {
  const angles = resolveAngles(props, 'Arc', true);
  if (!angles) throw new Error('<Arc> 需给角度');
  const { startAngle, endAngle } = angles;
  const center = props.center;

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={center} />
      {'radius' in props ? (
        <Step kind="arc" center={center} startAngle={startAngle} endAngle={endAngle} radius={props.radius} />
      ) : (
        <Step
          kind="arc"
          center={center}
          startAngle={startAngle}
          endAngle={endAngle}
          radiusX={props.radiusX}
          radiusY={props.radiusY}
        />
      )}
    </Path>
  );
};
