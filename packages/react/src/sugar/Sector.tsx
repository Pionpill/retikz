import type { FC, ReactElement } from 'react';
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

/**
 * `<Sector>` 形态：扇形（wedge 经圆心闭合）；圆 / 椭圆；必给角度。
 * @description 给 innerRadius（圆）或 innerRadiusX + innerRadiusY（椭圆）画**空心扇形**（环形扇区 / donut 切片）。
 *   center 须 literal 笛卡尔（要算弧起点）。
 */
export type SectorProps = PathVisualProps &
  AngleInput &
  (
    | { center: [number, number]; radius: number; innerRadius?: number }
    | {
        center: [number, number];
        radiusX: number;
        radiusY: number;
        innerRadiusX?: number;
        innerRadiusY?: number;
      }
  );

/**
 * Sector sugar——扇形
 * @description 实心：`move(arcStart) → arc(center) → line(center) → cycle`（cycle 命中 emitClose 干净闭合）。
 *   空心（给内半径）：`move(外弧起点) → 外弧 → line(内弧终点) → 内弧(反向) → line(回外弧起点)`——
 *   末段用 line 回起点而非 cycle（内弧不在 hasTo 内，cycle 会从前一段闭合而错位）。
 */
export const Sector: FC<SectorProps> = props => {
  const angles = resolveAngles(props, 'Sector', true);
  if (!angles) throw new Error('<Sector> 需给角度');
  const { startAngle, endAngle } = angles;
  const center = requireXY(props.center, 'Sector', 'center');

  const circular = 'radius' in props;
  const outerRX = 'radius' in props ? props.radius : props.radiusX;
  const outerRY = 'radius' in props ? props.radius : props.radiusY;

  // 内半径（空心扇形）：圆用 innerRadius；椭圆用 innerRadiusX + innerRadiusY（both-or-neither）
  let inner: [number, number] | null = null;
  if ('radius' in props) {
    if (props.innerRadius !== undefined) inner = [props.innerRadius, props.innerRadius];
  } else if (props.innerRadiusX !== undefined && props.innerRadiusY !== undefined) {
    inner = [props.innerRadiusX, props.innerRadiusY];
  } else if (props.innerRadiusX !== undefined || props.innerRadiusY !== undefined) {
    throw new Error('<Sector> 椭圆空心需同时给 innerRadiusX 与 innerRadiusY');
  }

  /** 一段 arc step（圆用 radius、椭圆用 radiusX/radiusY） */
  const arcEl = (rx: number, ry: number, a: number, b: number): ReactElement =>
    circular ? (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radius={rx} />
    ) : (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radiusX={rx} radiusY={ry} />
    );

  const visual = pickPathVisual(props);

  if (inner) {
    // 空心扇形：外弧 → 径向边 → 内弧（反向）→ 径向边回起点
    const outerStart = polarXY(center, outerRX, outerRY, startAngle);
    const innerEnd = polarXY(center, inner[0], inner[1], endAngle);
    return (
      <Path {...visual}>
        <Step kind="move" to={outerStart} />
        {arcEl(outerRX, outerRY, startAngle, endAngle)}
        <Step kind="line" to={innerEnd} />
        {arcEl(inner[0], inner[1], endAngle, startAngle)}
        <Step kind="line" to={outerStart} />
      </Path>
    );
  }

  // 实心扇形（wedge 经圆心）
  const arcStart = polarXY(center, outerRX, outerRY, startAngle);
  return (
    <Path {...visual}>
      <Step kind="move" to={arcStart} />
      {arcEl(outerRX, outerRY, startAngle, endAngle)}
      <Step kind="line" to={center} />
      <Step kind="cycle" />
    </Path>
  );
};
