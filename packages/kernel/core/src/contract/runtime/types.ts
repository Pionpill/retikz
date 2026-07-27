import type { RuntimeIdentity } from '@retikz/runtime';

/** Core document Snapshot 的固定 owner key */
export const CORE_OWNER_KEY = '@retikz/core/document' as const;

/** Core Snapshot change hint，不携带局部 IR value */
export type CoreChange =
  | Readonly<{
      /** 新增稳定实体 */
      kind: 'add';
      /** 新实体 identity */
      identity: RuntimeIdentity;
      /** next parent identity */
      parent: RuntimeIdentity;
      /** next 后继 sibling */
      before?: RuntimeIdentity;
    }>
  | Readonly<{
      /** 更新稳定实体 */
      kind: 'update';
      /** 被更新实体 identity */
      identity: RuntimeIdentity;
    }>
  | Readonly<{
      /** 移除稳定实体 */
      kind: 'remove';
      /** 被移除实体 identity */
      identity: RuntimeIdentity;
    }>
  | Readonly<{
      /** 移动稳定实体 */
      kind: 'move';
      /** 被移动实体 identity */
      identity: RuntimeIdentity;
      /** next parent identity */
      parent: RuntimeIdentity;
      /** next 后继 sibling */
      before?: RuntimeIdentity;
    }>;
