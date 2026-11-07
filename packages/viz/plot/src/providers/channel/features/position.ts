import type { AnyChannelDefinition, PositionChannelDefinition, PositionScalePolicy } from '../../../contract';
import { ChannelDefinitionKind, positionField } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type { IRPlotPositionInput } from '../../../schemas';

/** 内置位置通道对数学映射的消费策略 */
export const POSITION_SCALE_POLICIES: Readonly<Partial<Record<string, PositionScalePolicy>>> = {
  linear: { continuity: 'continuous', allowsBaseline: true },
  log: { continuity: 'continuous', allowsBaseline: false },
  pow: { continuity: 'continuous', allowsBaseline: false },
  sqrt: { continuity: 'continuous', allowsBaseline: false },
  symlog: { continuity: 'continuous', allowsBaseline: false },
  radial: { continuity: 'continuous', allowsBaseline: true, padding: 'radial' },
  time: { continuity: 'continuous', allowsBaseline: true, tickKind: 'time' },
  band: { continuity: 'discrete', allowsBaseline: true },
  point: { continuity: 'discrete', allowsBaseline: true },
};

/** 内置 position channel definition 的扩展形态 */
type BuiltinPositionChannelDefinition = PositionChannelDefinition & {
  /** 创建用于读取 mark 位置绑定的函数 */
  pickWithOptions: () => PositionChannelDefinition['pick'];
};

const markEncoding = (mark: unknown): Record<string, IRPlotPositionInput | undefined> | undefined =>
  (mark as { encodings?: { position?: Record<string, IRPlotPositionInput | undefined> } }).encodings?.position;

const positionChannelDefinitionOf = (role: string): BuiltinPositionChannelDefinition => ({
  channel: role,
  kind: ChannelDefinitionKind.Position,
  role,
  scales: POSITION_SCALE_POLICIES,
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
  custom: ReadonlyArray<AnyChannelDefinition> = [],
): ReadonlyMap<string, BuiltinPositionChannelDefinition> => {
  const out = new Map<string, BuiltinPositionChannelDefinition>();
  for (const role of roles) out.set(role, positionChannelDefinitionOf(role));
  const customRoles = new Set<string>();
  for (const definition of custom) {
    if (definition.kind !== 'position' || !out.has(definition.role)) continue;
    if (customRoles.has(definition.role))
      throw new RetikzPlotError(`multiple position channels consume role "${definition.role}"`);
    customRoles.add(definition.role);
    out.set(definition.role, { ...definition, pickWithOptions: () => definition.pick });
  }
  return out;
};
