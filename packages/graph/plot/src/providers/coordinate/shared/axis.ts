import type { AxisGuide } from '../../../schemas';

/**
 * guide 维度到坐标角色的映射函数。
 * @description cartesian / ternary 的 guide.dimension 可直接作为角色；polar 会把 x/y 分别映射为 angular/radial，
 *   从而禁止同时声明两个指向同一极坐标角色的 axis。
 */
export type AxisRoleOf = (dimension: string) => string;

/**
 * 校验同一坐标角色只声明一根 axis。
 * @description definition.resolve 阶段调用，保证 guide lowering 不会为同一定位角色生成两套互相覆盖的轴层。
 *   roleOf 让不同坐标系在“IR 维度名”和“坐标角色名”之间做一次局部映射。
 */
export const assertUniqueAxisDimension = (
  guides: ReadonlyArray<AxisGuide>,
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
