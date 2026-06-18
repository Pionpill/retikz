import type { AxisGuide } from '../ir';

/** guide 维度到坐标角色的映射函数；默认维度名即角色名。 */
export type AxisRoleOf = (dimension: string) => string;

/**
 * 校验同一坐标角色只声明一根 axis。
 * @description cartesian / ternary 直接按 dimension 去重；polar 把 x/y 映射为 angular/radial 后再去重。
 */
export const assertUniqueAxisDimension = (guides: ReadonlyArray<AxisGuide>, roleOf: AxisRoleOf = dimension => dimension): void => {
  const seen = new Set<string>();
  for (const guide of guides) {
    const role = roleOf(guide.dimension);
    if (seen.has(role)) {
      throw new Error(`lowerPlots: duplicate axis for "${role}" role (dimension "${guide.dimension}"); one axis per positional role`);
    }
    seen.add(role);
  }
};
