import type { FC } from 'react';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import {
  type AngleInput,
  type PathVisualProps,
  pickPathVisual,
  polarXY,
  requireXY,
  resolveAngles,
} from './_shared';

/** `<Sector>` 形态：扇形（wedge 闭合，经圆心）；圆 / 椭圆；必给角度。center 须 literal 笛卡尔（要算弧起点） */
export type SectorProps = PathVisualProps &
  AngleInput &
  (
    | { center: [number, number]; radius: number }
    | { center: [number, number]; radiusX: number; radiusY: number }
  );

/**
 * Sector sugar——扇形 wedge，展开为 `<Path><Step move(arcStart)><Step arc(center)><Step line(center)><Step cycle></Path>`
 * @description 显式 center 让 arc 圆心正确；line 消费 penOverride=arcEnd 画 arcEnd→center，cycle 命中 emitClose 闭回 arcStart，得干净闭合扇形。center 须 literal（算 arcStart）。
 */
export const Sector: FC<SectorProps> = props => {
  const angles = resolveAngles(props, 'Sector', true);
  if (!angles) throw new Error('<Sector> 需给角度');
  const { startAngle, endAngle } = angles;
  const center = requireXY(props.center, 'Sector', 'center');
  const rx = 'radius' in props ? props.radius : props.radiusX;
  const ry = 'radius' in props ? props.radius : props.radiusY;
  const arcStart = polarXY(center, rx, ry, startAngle);

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={arcStart} />
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
      <Step kind="line" to={center} />
      <Step kind="cycle" />
    </Path>
  );
};
