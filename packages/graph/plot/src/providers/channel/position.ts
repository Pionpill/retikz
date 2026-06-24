import { ChannelDefinitionKind, type PositionChannelDefinition } from '../../contract';
import { type Channel } from '../../schemas';

/** link 的 source 端只在显式收集 link 源端时参与位置 role；普通投影仍由 mark lowering 自行处理。 */
export type PositionChannelPickOptions = {
  includeLinkSource?: boolean;
};

/** 内置 position channel definition 的扩展形态：pickWithOptions 支持 link source 这类上下文相关读取。 */
export type BuiltinPositionChannelDefinition = PositionChannelDefinition & {
  pickWithOptions: (options?: PositionChannelPickOptions) => PositionChannelDefinition['pick'];
};

const markEncoding = (mark: unknown): Record<string, Channel | undefined> | undefined => (mark as { encoding?: Record<string, Channel | undefined> }).encoding;

const sourcePositionChannel = (mark: unknown, role: string): Channel | undefined => {
  if (role !== 'x' && role !== 'y') return undefined;
  const source = (mark as { source?: { x?: Channel; y?: Channel } }).source;
  return role === 'x' ? source?.x : source?.y;
};

const positionChannelDefinitionOf = (role: string): BuiltinPositionChannelDefinition => ({
  channel: role,
  kind: ChannelDefinitionKind.Position,
  role,
  pick: mark => markEncoding(mark)?.[role],
  pickWithOptions:
    (options = {}) =>
    mark => {
      if (options.includeLinkSource === true) return sourcePositionChannel(mark, role) ?? markEncoding(mark)?.[role];
      return markEncoding(mark)?.[role];
    },
});

/** 把坐标系 roles 包成 position channel definitions，供校验、域收集和 scale 推导共用同一读取入口。 */
export const createPositionChannelDefinitions = (roles: ReadonlyArray<string>): ReadonlyMap<string, BuiltinPositionChannelDefinition> => {
  const out = new Map<string, BuiltinPositionChannelDefinition>();
  for (const role of roles) out.set(role, positionChannelDefinitionOf(role));
  return out;
};
