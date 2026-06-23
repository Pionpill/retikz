import { type CoordinateFrame, type DimensionRole } from '../../contract';
import { type Channel, type ExternalRow, type Mark, PlotMark } from '../../schemas';
import { channelValue } from '../data';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）。
 * @description polar 在坐标系内部把 x/y 解释为角向/径向；ternary 直接消费 x/y/z。
 *   link 无位置通道（端点来自 source/target 字段对）→ undefined。
 */
export const channelForRole = (mark: Mark, role: DimensionRole): Channel | undefined => {
  // link 无 encoding.x/y 位置通道（端点来自 source/target 字段对）→ undefined
  if (mark.type === PlotMark.Link) return undefined;
  return (mark.encoding as Record<string, Channel | undefined>)[role];
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关）。 */
export const roleValues = (mark: Mark, row: ExternalRow, frame: CoordinateFrame): Array<unknown> =>
  frame.roles.map(role => channelValue(channelForRole(mark, role), row));
