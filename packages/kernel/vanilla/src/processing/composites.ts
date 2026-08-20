import type { AnyCompositeDefinition, AnyExpandCompositeDefinition, AnyLayoutCompositeDefinition } from '@retikz/core';

import { RetikzRenderError, RetikzRenderErrorCode } from '@retikz/render/runtime';
import { defineRuntimeOwner } from '@retikz/runtime';

type CompositeSlot = {
  /** 当前 transaction 可见的 composite Definition */
  current: AnyCompositeDefinition;
};

/** 一次 composite definition callback 切换的提交句柄 */
export type PreparedCompositeDefinitions = Readonly<{
  /** 本次 candidate 是否替换了任一 callback identity */
  changed: boolean;
  /** 固定当前 candidate callback */
  commit: () => void;
  /** 恢复 transaction 前的 callback */
  rollback: () => void;
}>;

/** retained Core Program 使用的稳定 composite definition 容器 */
export type RetainedCompositeDefinitions = Readonly<{
  /** session-lifetime identity 稳定的代理 Definitions */
  definitions: ReadonlyArray<AnyCompositeDefinition>;
  /** 判断 candidate 能否复用当前 Core Program 的固定 definition topology */
  isCompatible: (next: ReadonlyArray<AnyCompositeDefinition> | undefined) => boolean;
  /** 校验固定 topology 并暂存下一组 callback */
  prepare: (next: ReadonlyArray<AnyCompositeDefinition> | undefined) => PreparedCompositeDefinitions;
}>;

const invalidDefinitions = (cause: unknown): never => {
  throw new RetikzRenderError({
    code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message: 'Vanilla retained processing must preserve composite definition keys, schemas, and execution branches',
  });
};

/** Vanilla composite callback revision 的内部 owner */
export const VanillaCompositeRevisionOwnerDefinition = defineRuntimeOwner<number, number, number, never>({
  key: '@retikz/vanilla:composite-revision',
  value: {
    capture: value => {
      if (!Number.isSafeInteger(value) || value < 0) return invalidDefinitions(value);
      return value;
    },
    read: value => value,
    equals: Object.is,
  },
});

/** 用稳定 callback 包装 normalization 每轮生成的 expand definition */
const createExpandDelegate = (
  initial: AnyExpandCompositeDefinition,
  slot: CompositeSlot,
): AnyExpandCompositeDefinition => ({
  namespace: initial.namespace,
  type: initial.type,
  schema: initial.schema,
  expand: (node, context) => {
    const expand = slot.current.expand;
    if (typeof expand !== 'function') return invalidDefinitions(slot.current);
    return expand(node, context);
  },
});

/** 用稳定 callback 包装 normalization 每轮生成的 layout-aware definition */
const createLayoutDelegate = (
  initial: AnyLayoutCompositeDefinition,
  slot: CompositeSlot,
): AnyLayoutCompositeDefinition => {
  const delegate = {
    namespace: initial.namespace,
    type: initial.type,
    schema: initial.schema,
    compile: (node: never, context: Parameters<NonNullable<AnyLayoutCompositeDefinition['compile']>>[1]) => {
      const compile = slot.current.compile;
      if (typeof compile !== 'function') return invalidDefinitions(slot.current);
      return compile(node, context);
    },
    ...(initial.artifactSchema === undefined ? {} : { artifactSchema: initial.artifactSchema }),
  };
  return delegate as AnyLayoutCompositeDefinition;
};

const createDelegate = (slot: CompositeSlot): AnyCompositeDefinition => {
  const initial = slot.current;
  return typeof initial.expand === 'function'
    ? createExpandDelegate(initial, slot)
    : createLayoutDelegate(initial, slot);
};

/** 校验 next normalization 没有热改 Core Program 的固定 definition 拓扑 */
/** 判断 candidate 是否保持当前 Core Program 的 definition topology */
const isCompatibleDefinition = (initial: AnyCompositeDefinition, next: AnyCompositeDefinition): boolean => {
  const initialExpand = typeof initial.expand === 'function';
  const nextExpand = typeof next.expand === 'function';
  return (
    initial.namespace === next.namespace &&
    initial.type === next.type &&
    initial.schema === next.schema &&
    initialExpand === nextExpand &&
    initial.artifactSchema === next.artifactSchema
  );
};

/**
 * 为 Vanilla normalization 生成的 definitions 建立稳定代理
 * @description Core Program options 在 session 内固定；同 key/schema/分支的 callback 可在 transaction prepare 前切到候选值，
 *   失败时恢复旧 callback，成功时与 Core artifact 一起成为 committed 语义
 */
export const createRetainedCompositeDefinitions = (
  initialDefinitions: ReadonlyArray<AnyCompositeDefinition> | undefined,
): RetainedCompositeDefinitions => {
  const initial = initialDefinitions ?? [];
  const slots: Array<CompositeSlot> = initial.map(current => ({ current }));
  const definitions = Object.freeze(slots.map(createDelegate));
  return Object.freeze({
    definitions,
    isCompatible: nextDefinitions => {
      const next = nextDefinitions ?? [];
      return (
        next.length === slots.length &&
        next.every((definition, index) => isCompatibleDefinition(slots[index].current, definition))
      );
    },
    prepare: nextDefinitions => {
      const next = nextDefinitions ?? [];
      if (
        next.length !== slots.length ||
        !next.every((definition, index) => isCompatibleDefinition(slots[index].current, definition))
      ) {
        invalidDefinitions({ initial, next });
      }
      const previous = slots.map(slot => slot.current);
      const changed = next.some((definition, index) => definition !== previous[index]);
      next.forEach((definition, index) => {
        slots[index].current = definition;
      });
      let settled = false;
      return Object.freeze({
        changed,
        commit: () => {
          settled = true;
        },
        rollback: () => {
          if (settled) return;
          previous.forEach((definition, index) => {
            slots[index].current = definition;
          });
          settled = true;
        },
      });
    },
  });
};
