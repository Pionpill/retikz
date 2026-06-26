import { ChannelDefinitionKind, type PositionChannelDefinition } from '../../../contract';
import { type Channel } from '../../../schemas';

/** 内置 position channel definition 的扩展形态。 */
export type BuiltinPositionChannelDefinition = PositionChannelDefinition & {
  pickWithOptions: () => PositionChannelDefinition['pick'];
};

const markEncoding = (mark: unknown): Record<string, Channel | undefined> | undefined => (mark as { encoding?: Record<string, Channel | undefined> }).encoding;

const positionChannelDefinitionOf = (role: string): BuiltinPositionChannelDefinition => ({
  channel: role,
  kind: ChannelDefinitionKind.Position,
  role,
  pick: mark => markEncoding(mark)?.[role],
  pickWithOptions: () => mark => markEncoding(mark)?.[role],
});

/** 把坐标系 roles 包成 position channel definitions，供校验、域收集和 scale 推导共用同一读取入口。 */
export const createPositionChannelDefinitions = (roles: ReadonlyArray<string>): ReadonlyMap<string, BuiltinPositionChannelDefinition> => {
  const out = new Map<string, BuiltinPositionChannelDefinition>();
  for (const role of roles) out.set(role, positionChannelDefinitionOf(role));
  return out;
};
