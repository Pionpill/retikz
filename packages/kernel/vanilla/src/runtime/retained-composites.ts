import type {
  AnyCompositeDefinition,
  AnyCompositeInspectorDefinition,
  AnyExpandCompositeDefinition,
  AnyLayoutCompositeDefinition,
} from '@retikz/core';

import { RetainedRenderError, RetainedRenderErrorCode } from '@retikz/render/runtime';
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
  /** 校验固定 topology 并暂存下一组 callback */
  prepare: (next: ReadonlyArray<AnyCompositeDefinition> | undefined) => PreparedCompositeDefinitions;
}>;

const invalidDefinitions = (cause: unknown): never => {
  throw new RetainedRenderError({
    code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message:
      'Vanilla retained update must preserve composite definition keys, schemas, and execution branches; dispose and remount to change compile capabilities',
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
  expand: node => {
    const expand = slot.current.expand;
    if (typeof expand !== 'function') return invalidDefinitions(slot.current);
    return expand(node);
  },
});

/** 用稳定 callable 包装 normalization 每轮生成的 inspector callback */
const createInspectorDelegate = (
  initial: AnyCompositeInspectorDefinition,
  slot: CompositeSlot,
): AnyCompositeInspectorDefinition => ({
  kind: 'layout',
  localOptionsInputSchema: initial.localOptionsInputSchema,
  localOptionsSchema: initial.localOptionsSchema,
  inspect: (artifact: never, context: never) => {
    const inspector = slot.current.inspector;
    if (inspector === undefined) return invalidDefinitions(slot.current);
    return inspector.inspect(artifact, context);
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
    ...(initial.inspector === undefined ? {} : { inspector: createInspectorDelegate(initial.inspector, slot) }),
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
const assertCompatibleDefinition = (initial: AnyCompositeDefinition, next: AnyCompositeDefinition): void => {
  const initialExpand = typeof initial.expand === 'function';
  const nextExpand = typeof next.expand === 'function';
  const initialInspector = initial.inspector;
  const nextInspector = next.inspector;
  if (
    initial.namespace !== next.namespace ||
    initial.type !== next.type ||
    initial.schema !== next.schema ||
    initialExpand !== nextExpand ||
    initial.artifactSchema !== next.artifactSchema ||
    (initialInspector === undefined) !== (nextInspector === undefined) ||
    (initialInspector !== undefined &&
      nextInspector !== undefined &&
      (initialInspector.localOptionsInputSchema !== nextInspector.localOptionsInputSchema ||
        initialInspector.localOptionsSchema !== nextInspector.localOptionsSchema))
  ) {
    invalidDefinitions({ initial, next });
  }
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
    prepare: nextDefinitions => {
      const next = nextDefinitions ?? [];
      if (next.length !== slots.length) invalidDefinitions({ initial, next });
      next.forEach((definition, index) => assertCompatibleDefinition(initial[index], definition));
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
