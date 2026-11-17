import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../../error';
import type { WeaveEntry, WeaveRoot } from '../shared';

/** 状态槽的稳定所有者 */
export type WeaveStateOwner = WeaveEntry | WeaveRoot;

/** 从具体状态所有者保留其状态类型 */
export type WeaveStateOf<TOwner extends WeaveStateOwner> = NonNullable<TOwner['current']>;

/** 读取当前候选视图，供不持有事务对象的派生索引使用 */
export const readWeaveCandidate = <TOwner extends WeaveStateOwner>(owner: TOwner): Readonly<WeaveStateOf<TOwner>> => {
  const state = owner.pending ?? owner.current;
  if (state === null) throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no state');
  return state as Readonly<WeaveStateOf<TOwner>>;
};

/** 读取已提交状态，不把候选当作当前结果 */
export const readWeaveCurrent = <TOwner extends WeaveStateOwner>(owner: TOwner): Readonly<WeaveStateOf<TOwner>> => {
  if (owner.current === null)
    throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Contract, 'Weave node has no committed state');
  // 状态只能从同一所有者读取，类别关联由所有者联合保证
  return owner.current as Readonly<WeaveStateOf<TOwner>>;
};
