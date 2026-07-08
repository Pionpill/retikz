import type { IRStepAnisotropicRadius, IRStepLabelInput } from '@retikz/core';
import type { FC, ReactElement } from 'react';

import type { DslTarget } from '../../kernel/components';
import type { AngleInput, PathVisualProps } from './shape-helpers';

import { Path } from '../../kernel/components';
import { Step } from '../../kernel/components';
import { pickPathVisual, polarXY, requireXY, resolveAngles } from './shape-helpers';

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
    label?: IRStepLabelInput;
  } & (
    | { center: DslTarget; radius: number; innerRadius?: number }
    | {
        center: DslTarget;
        radius: IRStepAnisotropicRadius;
        innerRadius?: IRStepAnisotropicRadius;
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

  const { radius } = props;
  const circular = typeof radius === 'number';
  const outerRX = circular ? radius : radius.x;
  const outerRY = circular ? radius : radius.y;

  // 内半径（空心扇形）：圆用 innerRadius；椭圆用 innerRadiusX + innerRadiusY（both-or-neither）
  let inner: [number, number] | null = null;
  if (props.innerRadius !== undefined) {
    inner =
      typeof props.innerRadius === 'number'
        ? [props.innerRadius, props.innerRadius]
        : [props.innerRadius.x, props.innerRadius.y];
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
            radius={{ x: outerRX, y: outerRY }}
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

  /** 一段 arc step（圆用 number，椭圆用 { x, y }） */
  const arcEl = (rx: number, ry: number, a: number, b: number, label?: IRStepLabelInput): ReactElement =>
    circular ? (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radius={rx} label={label} />
    ) : (
      <Step kind="arc" center={center} startAngle={a} endAngle={b} radius={{ x: rx, y: ry }} label={label} />
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
