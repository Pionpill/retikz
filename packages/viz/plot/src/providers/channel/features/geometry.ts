import type { MarkChannelDefinition } from '../../../contract';
import { ChannelDefinitionKind } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import { BuiltinPlotMark, isBuiltinMark } from '../../../schemas';
import { resolveNumericChannel } from '../shared';

/** 极坐标区间的径向位移，先解析数值再由区间几何消费 */
export const intervalPullChannel: MarkChannelDefinition<number> = {
  channel: 'pull',
  kind: ChannelDefinitionKind.Mark,
  resolve: (context, mark) => {
    if (!isBuiltinMark(mark) || mark.type !== BuiltinPlotMark.Interval) return undefined;
    const binding = mark.encodings?.pull;
    if (binding === undefined) return undefined;
    const resolution = resolveNumericChannel(context.node, context.rows, context.model, binding, 'pull');
    if (resolution === undefined) return undefined;
    return {
      resolver: row => {
        const value = resolution.resolver(row);
        if (value === undefined || !Number.isFinite(value) || value < 0)
          throw new RetikzPlotError('Interval pull must map to a finite non-negative numeric value');
        return value;
      },
    };
  },
};
