import type { PositionChannelDefinition } from '../../../contract';
import { ChannelDefinitionKind, positionField } from '../../../contract';
import type { IRPlotPositionInput } from '../../../schemas';

/** 内置 position channel definition 的扩展形态 */
export type BuiltinPositionChannelDefinition = PositionChannelDefinition & {
  /** 创建用于读取 mark 位置绑定的函数 */
  pickWithOptions: () => PositionChannelDefinition['pick'];
};

const markEncoding = (mark: unknown): Record<string, IRPlotPositionInput | undefined> | undefined =>
  (mark as { encodings?: { position?: Record<string, IRPlotPositionInput | undefined> } }).encodings?.position;

const positionChannelDefinitionOf = (role: string): BuiltinPositionChannelDefinition => ({
  channel: role,
  kind: ChannelDefinitionKind.Position,
  role,
  pick: mark => positionField(markEncoding(mark)?.[role]),
  pickWithOptions: () => mark => positionField(markEncoding(mark)?.[role]),
});

/**
 * 把坐标系 roles 包成 position channel definitions，供校验、域收集和 scale 推导共用同一读取入口
 * @param roles 坐标系声明的位置角色；同名角色在索引中保留最后一项
 * @returns 按角色名称索引的位置通道定义
 */
export const createPositionChannelDefinitions = (
  roles: ReadonlyArray<string>,
): ReadonlyMap<string, BuiltinPositionChannelDefinition> => {
  const out = new Map<string, BuiltinPositionChannelDefinition>();
  for (const role of roles) out.set(role, positionChannelDefinitionOf(role));
  return out;
};
