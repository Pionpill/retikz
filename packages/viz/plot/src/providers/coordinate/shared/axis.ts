import type { AxisCardinalSideValue, IRPlotAxisGuide } from '../../../schemas';

import { AxisCardinalSide, AxisPlacementKind } from '../../../schemas';

/**
 * guide 维度到坐标角色的映射函数。
 * @description cartesian / ternary 的 guide.dimension 可直接作为角色；polar 会把 x/y 分别映射为 angular/radial，
 *   从而禁止同时声明两个指向同一极坐标角色的 axis。
 */
export type AxisRoleOf = (dimension: string) => string;

/** origin axis 未显式 tickSide 时按维度归一到实际下沉默认值。 */
export const defaultOriginAxisTickSideOf = (dimension: string): AxisCardinalSideValue =>
  dimension === 'x' ? AxisCardinalSide.Bottom : AxisCardinalSide.Left;

/**
 * 校验同一坐标角色只声明一根 axis。
 * @description definition.resolve 阶段调用，保证 guide lowering 不会为同一定位角色生成两套互相覆盖的轴层。
 *   roleOf 让不同坐标系在“IR 维度名”和“坐标角色名”之间做一次局部映射。
 */
export const assertUniqueAxisDimension = (
  guides: ReadonlyArray<IRPlotAxisGuide>,
  roleOf: AxisRoleOf = dimension => dimension,
): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    const role = roleOf(guide.dimension);
    if (seen.has(role)) {
      throw new Error(
        `lowerPlots: duplicate axis for "${role}" role (dimension "${guide.dimension}"); one axis per positional role`,
      );
    }
    seen.add(role);
  }
};

/** axis placement 的归一化 key；offset 是同一 key 上的几何位移，不参与唯一性。 */
export const axisPlacementKeyOf = (guide: IRPlotAxisGuide, roleOf: AxisRoleOf = dimension => dimension): string => {
  const role = roleOf(guide.dimension);
  const placement = guide.placement;
  if (placement === undefined || placement.kind === AxisPlacementKind.Auto) return `${role}:auto`;
  if (placement.kind === AxisPlacementKind.Side) return `${role}:side:${placement.side}`;
  if (placement.kind === AxisPlacementKind.Origin) {
    return `${role}:origin:${String(placement.origin ?? 0)}:${placement.tickSide ?? defaultOriginAxisTickSideOf(role)}`;
  }
  return `${role}:edge:${placement.edge}`;
};

/**
 * 校验同一定位 role + placement key 只声明一根 axis。
 * @description 同一 role 可放在不同 side / edge；完全相同 placement key 才视为重复。
 */
export const assertUniqueAxisPlacement = (
  guides: ReadonlyArray<IRPlotAxisGuide>,
  roleOf: AxisRoleOf = dimension => dimension,
): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    const key = axisPlacementKeyOf(guide, roleOf);
    if (seen.has(key)) {
      throw new Error(`lowerPlots: duplicate axis for placement "${key}"; one axis per coordinate role and placement`);
    }
    seen.add(key);
  }
};
