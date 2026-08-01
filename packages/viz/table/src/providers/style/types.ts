import type { IRTableStyleTokens, TableStyleTokenKey, TableStyleTokenMap } from '../../schemas';
import type { DeepReadonly } from '../../shared';

/** 包内 style resolver 产出的完整 token 与胜者来源 */
export type ResolvedTableStyleTokens = DeepReadonly<{
  /** 完整 19 项 token map */
  tokens: TableStyleTokenMap;
  /** 每个 token 的 preset/user winner */
  sources: Record<TableStyleTokenKey, 'preset' | 'user'>;
}>;

/** 包内 style resolver 接收的用户叶级 overlay */
export type ResolveTableStyleTokenOverlay = DeepReadonly<IRTableStyleTokens>;
