import { type ExternalRow } from '@retikz/data';

import { type CoordinateFrame, type DimensionRole } from '../../../contract';
import { type IRPlotChannel, type IRPlotMark } from '../../../schemas';
import { channelValue } from '../../channel/shared';

/**
 * 取某 mark 在某位置角色下的 encoding 通道（投影时按 frame.roles 序逐角色取值）。
 * @description polar 在坐标系内部把 x/y 解释为角向/径向；ternary 直接消费 x/y/z。
 */
export const channelForRole = (mark: IRPlotMark, role: DimensionRole): IRPlotChannel | undefined => {
  return (mark.encoding as Record<string, IRPlotChannel | undefined>)[role];
};

/** 按 frame.roles 序取某 mark 某行的位置值数组（喂 frame.projectRoles；坐标系无关）。 */
export const roleValues = (mark: IRPlotMark, row: ExternalRow, frame: CoordinateFrame): Array<unknown> =>
  frame.roles.map(role => channelValue(channelForRole(mark, role), row));
