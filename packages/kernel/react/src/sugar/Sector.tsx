import type { FC, ReactElement } from 'react';
import type { IRStepLabel } from '@retikz/core';
import { Path } from '../kernel/Path';
import { type DslTarget, Step } from '../kernel/Step';
import {
  type AngleInput,
  type PathVisualProps,
  pickPathVisual,
  polarXY,
  requireXY,
  resolveAngles,
} from './_shared';

/**
 * `<Sector>` 形态：扇形（wedge 经圆心闭合）；圆 / 椭圆；必给角度（三选二）。
 * @description 实心扇形走 circlePath / ellipsePath 的 `closed="sector"`，圆心 = 游标，故 `center` 可为
 *   节点 id / 极坐标等任意 Target。给 innerRadius（圆）或 innerRadiusX + innerRadiusY（椭圆）画**空心扇形**
 *   （环形扇区 / donut 切片）；空心需算内 / 外弧端点，`center` 须 literal 笛卡尔。
 *   `label` 透传到弧 step，沿弧定位（`position` 缺省 midway）。
 */
export type SectorProps = PathVisualProps &
  AngleInput & {
    /** 扇形弧上的边标注（透传到弧 step；`position` 缺省 midway，沿弧 startAngle..endAngle 线性映射） */
    label?: IRStepLabel;
  } & (
    | { center: DslTarget; radius: number; innerRadius?: number }
    | {
        center: DslTarget;
        radiusX: number;
        radiusY: number;
        innerRadiusX?: number;
        innerRadiusY?: number;
      }
  );

/**
 * Sector sugar——扇形
 * @description 实心（无内半径）：`move(center) → circlePath/ellipsePath(closed="sector")`——圆心 = 游标，
 *   center 接任意 Target。空心（给内半径）：`move(外弧起点) → 外弧 → line(内弧终点) → 内弧(反向) → line(回外弧起点)`——
 *   末段用 line 回起点而非 cycle（内弧不在 hasTo 内，cycle 会从前一段闭合而错位），需 literal center 算端点。
 */
export const Sector: FC<SectorProps> = props => {
  const angles = resolveAngles(props, 'Sector', true);
  if (!angles) throw new Error('<Sector> 需给角度');
  const { startAngle, endAngle } = angles;

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

  const visual = pickPathVisual(props);

  if (!inner) {
    // 实心扇形：circlePath / ellipsePath closed="sector"，圆心 = 游标（center 接任意 Target）
    return (
      <Path {...visual}>
        <Step kind="move" to={props.center} />
        {circular ? (
          <Step
            kind="circlePath"
            radius={outerRX}
            startAngle={startAngle}
            endAngle={endAngle}
            closed="sector"
            label={props.label}
          />
        ) : (
          <Step
            kind="ellipsePath"
            radiusX={outerRX}
            radiusY={outerRY}
            startAngle={startAngle}
            endAngle={endAngle}
            closed="sector"
            label={props.label}
          />
        )}
      </Path>
    );
  }

  // 空心扇形：须 literal center 算内 / 外弧端点
  const center = requireXY(props.center, 'Sector', 'center');

  /** 一段 arc step（圆用 radius、椭圆用 radiusX/radiusY） */
  const arcEl = (rx: number, ry: number, a: number, b: number, label?: IRStepLabel): ReactElement =>
    circular ? (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radius={rx} label={label} />
    ) : (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radiusX={rx} radiusY={ry} label={label} />
    );

  // 空心扇形：外弧 → 径向边 → 内弧（反向）→ 径向边回起点；label 挂外弧
  const outerStart = polarXY(center, outerRX, outerRY, startAngle);
  const innerEnd = polarXY(center, inner[0], inner[1], endAngle);
  return (
    <Path {...visual}>
      <Step kind="move" to={outerStart} />
      {arcEl(outerRX, outerRY, startAngle, endAngle, props.label)}
      <Step kind="line" to={innerEnd} />
      {arcEl(inner[0], inner[1], endAngle, startAngle)}
      <Step kind="line" to={outerStart} />
    </Path>
  );
};
