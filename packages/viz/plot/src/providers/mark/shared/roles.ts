import type { ExternalRow } from '@retikz/data';

import type { CoordinateFrame, DimensionRole, PositionScale } from '../../../contract';
import { positionField, positionValue, mapPositionInput } from '../../../contract';
import type { IRPlotChannel, IRPlotMarkOperation, IRPlotMark } from '../../../schemas';
import type { IRPlotPositionInput } from '../../../schemas';

/** 读取已声明的角色位置输入 */
export const positionForRole = (mark: IRPlotMarkOperation, role: string): IRPlotPositionInput | undefined =>
  (mark.encodings?.position as Partial<Record<string, IRPlotPositionInput>> | undefined)?.[role];

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）
 * @description polar 在坐标系内部把 x/y 解释为角向/径向；自定义坐标系按 definition.roles 消费位置通道
 */
export const channelForRole = (mark: IRPlotMark, role: DimensionRole): IRPlotChannel | undefined => {
  return positionField(positionForRole(mark, role));
};

/** 读取位置角色的有效固定值；字段绑定存在时不回退 */
export const fixedRoleValue = (mark: IRPlotMarkOperation, role: DimensionRole) => {
  const input = positionForRole(mark, role);
  return input === undefined || 'field' in input ? undefined : 'value' in input ? input.value : input;
};

/** 读取数据空间角色值，边缘引用不参与数据域推导 */
export const roleValue = (mark: IRPlotMark, role: DimensionRole, row: ExternalRow | undefined): unknown => {
  return positionValue(positionForRole(mark, role), row);
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关） */
export const roleValues = (mark: IRPlotMark, row: ExternalRow | undefined, frame: CoordinateFrame): Array<unknown> =>
  frame.roles.map(role => roleValue(mark, role, row));

/** 映射数据角色，并将固定边缘解析到最终尺度范围 */
export const mapMarkRoles = (
  mark: IRPlotMarkOperation,
  values: ReadonlyArray<unknown>,
  frame: CoordinateFrame,
): ReadonlyArray<number> | null => {
  if (!frame.roles.some(role => typeof fixedRoleValue(mark, role) === 'object'))
    return frame.mapRoles?.(values) ?? null;
  const mapped = frame.roles.map((role, index) => {
    const scale = frame.roleScales?.[role];
    const fixed = fixedRoleValue(mark, role);
    return typeof fixed === 'object'
      ? (scale?.range()[fixed.edge === 'start' ? 0 : 1] ?? NaN)
      : (scale?.coordinate(values[index]) ?? NaN);
  });
  return mapped.every(Number.isFinite) ? mapped : null;
};

/** 映射一个位置角色，固定边缘直接消费最终 range */
export const mappedRoleValue = (
  mark: IRPlotMark,
  role: DimensionRole,
  row: ExternalRow | undefined,
  scale: PositionScale,
): number => {
  return mapPositionInput(positionForRole(mark, role), scale, row);
};
