import type { ExternalRow } from '@retikz/data';

import type { CoordinateFrame, DimensionRole, PositionScale } from '../../../contract';
import type { IRPlotAnnotationPosition, IRPlotChannel, IRPlotMarkOperation, IRPlotMark } from '../../../schemas';
import { channelValue } from '../../channel/shared';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）
 * @description polar 在坐标系内部把 x/y 解释为角向/径向；自定义坐标系按 definition.roles 消费位置通道
 */
export const channelForRole = (mark: IRPlotMark, role: DimensionRole): IRPlotChannel | undefined => {
  return (mark.encodings?.position as Record<string, string | undefined> | undefined)?.[role];
};

/** 读取位置角色的有效固定值；字段绑定存在时不回退 */
export const fixedRoleValue = (mark: IRPlotMarkOperation, role: DimensionRole) => {
  const position = mark.encodings?.position as Record<string, string> | undefined;
  if (position?.[role] !== undefined) return undefined;
  return (mark.properties as { position?: IRPlotAnnotationPosition } | undefined)?.position?.[role];
};

/** 读取数据空间角色值，边缘引用不参与数据域推导 */
export const roleValue = (mark: IRPlotMark, role: DimensionRole, row: ExternalRow): unknown => {
  const binding = channelForRole(mark, role);
  if (binding !== undefined) return channelValue(binding, row);
  const fixed = fixedRoleValue(mark, role);
  return typeof fixed === 'object' ? undefined : fixed;
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关） */
export const roleValues = (mark: IRPlotMark, row: ExternalRow, frame: CoordinateFrame): Array<unknown> =>
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
  row: ExternalRow,
  scale: PositionScale,
): number => {
  const fixed = fixedRoleValue(mark, role);
  return typeof fixed === 'object'
    ? scale.range()[fixed.edge === 'start' ? 0 : 1]
    : scale.coordinate(roleValue(mark, role, row));
};
