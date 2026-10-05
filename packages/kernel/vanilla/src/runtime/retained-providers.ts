import type {
  AnyCompositeDefinition,
  AnyPathKindDefinition,
  ArrowDefinition,
  BoundaryDefinition,
  ClipDefinition,
  CoreProviderDefinitions,
  PathGeneratorDefinition,
  PatternDefinition,
  ShapeDefinition,
} from '@retikz/core';
import { RetikzRenderError, RetikzRenderErrorCode } from '@retikz/render/runtime';
import { defineRuntimeSource } from '@retikz/runtime';

type ProviderDefinition =
  | ShapeDefinition
  | BoundaryDefinition
  | ClipDefinition
  | ArrowDefinition
  | PatternDefinition
  | PathGeneratorDefinition
  | AnyPathKindDefinition
  | AnyCompositeDefinition;

type ProviderSlot = { current: ProviderDefinition };

/** 一次已应用但尚未确认的 provider 回调更新 */
type PreparedProviderDefinitions = Readonly<{
  /** 新旧定义是否至少有一个字段引用不同 */
  changed: boolean;
  /** 确认当前回调更新，使后续 rollback 不再恢复旧定义 */
  commit: () => void;
  /** 尚未确认时恢复旧定义；重复调用或确认后调用不产生变化 */
  rollback: () => void;
}>;

/** 在挂载生命周期内保持稳定定义代理，并为回调更新提供提交与回滚 */
export type RetainedProviderDefinitions = Readonly<{
  /** 供编译器持有的稳定代理集合，函数调用转发到当前定义 */
  definitions: CoreProviderDefinitions;
  /** 先验证全部定义兼容性，再立即切换回调；返回的事务可确认更新或恢复旧回调 */
  prepare: (next: CoreProviderDefinitions) => PreparedProviderDefinitions;
}>;

const invalidDefinitions = (cause: unknown): never => {
  throw new RetikzRenderError({
    code: RetikzRenderErrorCode.RetainedRuntimeInputInvalid,
    cause,
    message:
      'Vanilla retained update must preserve provider definition keys, schemas, and execution branches; dispose and remount to change compile capabilities',
  });
};

/** 在保留挂载生命周期内捕获提供者记录，同时保持回调/schema 标识 */
export const captureCoreProviderDefinitions = (
  definitions: CoreProviderDefinitions | undefined,
): CoreProviderDefinitions => {
  if (definitions === undefined) return Object.freeze({});

  return Object.freeze(
    Object.fromEntries(
      providerCollections
        .filter(collection => definitions[collection] !== undefined)
        .map(collection => [
          collection,
          Object.freeze((definitions[collection] ?? []).map(definition => copyDefinition(definition))),
        ]),
    ),
  );
};

/** 以非负安全整数记录 provider 回调版本，用于触发运行时重新计算 */
export const VanillaProviderRevisionSourceDefinition = defineRuntimeSource<number, number, number, never>({
  key: '@retikz/vanilla:provider-revision',
  value: {
    capture: value => {
      if (!Number.isSafeInteger(value) || value < 0) return invalidDefinitions(value);
      return value;
    },
    read: value => value,
    equals: Object.is,
  },
});

const definitionKey = (definition: ProviderDefinition): string => {
  if ('namespace' in definition && 'type' in definition)
    return `composite:${definition.namespace}\u0000${definition.type}`;
  if ('name' in definition && 'schema' in definition && 'compile' in definition) return `pathKind:${definition.name}`;
  if (
    'kind' in definition &&
    'schema' in definition &&
    'resolve' in definition &&
    'shapeSchema' in definition &&
    'lower' in definition
  )
    return `clip:${definition.kind}`;

  if ('kind' in definition) return invalidDefinitions(definition);

  return `${definition.name}`;
};

const definitionBranch = (definition: ProviderDefinition): 'expand' | 'compile' | 'plain' => {
  if ('expand' in definition) return 'expand';
  if ('compile' in definition) return 'compile';
  return 'plain';
};

const copyDefinition = (definition: ProviderDefinition): ProviderDefinition => {
  if ('namespace' in definition && 'type' in definition) {
    return Object.freeze(
      'expand' in definition
        ? {
            namespace: definition.namespace,
            type: definition.type,
            schema: definition.schema,
            expand: definition.expand,
          }
        : {
            namespace: definition.namespace,
            type: definition.type,
            schema: definition.schema,
            compile: definition.compile,
            ...(definition.artifactSchema === undefined ? {} : { artifactSchema: definition.artifactSchema }),
          },
    ) as ProviderDefinition;
  }

  if ('schema' in definition && 'compile' in definition) {
    return Object.freeze({
      name: definition.name,
      schema: definition.schema,
      compile: definition.compile,
      ...(definition.ownerOutput === undefined ? {} : { ownerOutput: definition.ownerOutput }),
    });
  }

  return Object.freeze({ ...definition });
};

const createDelegate = (slot: ProviderSlot): ProviderDefinition => {
  const initial = slot.current as unknown as Record<string, unknown>;
  const delegate: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(initial)) {
    delegate[key] =
      typeof value === 'function'
        ? (...args: ReadonlyArray<unknown>) => {
            const callback = (slot.current as unknown as Record<string, unknown>)[key];
            if (typeof callback !== 'function') return invalidDefinitions(slot.current);
            return Reflect.apply(callback, slot.current, args);
          }
        : value;
  }

  return Object.freeze(delegate) as ProviderDefinition;
};

const providerCollections = [
  'shapes',
  'boundaries',
  'clips',
  'arrows',
  'patterns',
  'pathGenerators',
  'pathKinds',
  'composites',
] as const satisfies ReadonlyArray<keyof CoreProviderDefinitions>;

const assertCompatibleDefinition = (initial: ProviderDefinition, next: ProviderDefinition): void => {
  const initialRecord = initial as unknown as Record<string, unknown>;
  const nextRecord = next as unknown as Record<string, unknown>;
  const initialKeys = Object.keys(initialRecord);
  const nextKeys = Object.keys(nextRecord);
  if (
    definitionKey(initial) !== definitionKey(next) ||
    definitionBranch(initial) !== definitionBranch(next) ||
    initialKeys.length !== nextKeys.length ||
    initialKeys.some(key => !Object.prototype.hasOwnProperty.call(nextRecord, key)) ||
    initialKeys.some(key => {
      const initialValue = initialRecord[key];
      const nextValue = nextRecord[key];
      return typeof initialValue !== 'function' && !Object.is(initialValue, nextValue);
    }) ||
    ('schema' in initial && 'schema' in next && initial.schema !== next.schema) ||
    ('paramsSchema' in initial && 'paramsSchema' in next && initial.paramsSchema !== next.paramsSchema) ||
    ('artifactSchema' in initial && 'artifactSchema' in next && initial.artifactSchema !== next.artifactSchema) ||
    ('ownerOutput' in initial && 'ownerOutput' in next && initial.ownerOutput !== next.ownerOutput)
  ) {
    invalidDefinitions({ initial, next });
  }
};

const definitionsEqual = (initial: ProviderDefinition, next: ProviderDefinition): boolean => {
  const initialRecord = initial as unknown as Record<string, unknown>;
  const nextRecord = next as unknown as Record<string, unknown>;
  const keys = Object.keys(initialRecord);

  return (
    keys.length === Object.keys(nextRecord).length &&
    keys.every(key => {
      const initialValue = initialRecord[key];
      const nextValue = nextRecord[key];
      return Object.is(initialValue, nextValue);
    })
  );
};

/**
 * 建立稳定 provider 代理及可回滚的回调更新入口
 * @description 更新必须保持集合长度、注册键、schema、非函数字段及执行分支一致；prepare 会立即应用通过校验的回调
 * @throws RetikzRenderError 定义改变挂载期固定的编译能力时抛出
 */
export const createRetainedProviderDefinitions = (
  initialDefinitions: CoreProviderDefinitions = {},
): RetainedProviderDefinitions => {
  const slotsByCollection = Object.fromEntries(
    providerCollections.map(collection => [
      collection,
      (initialDefinitions[collection] ?? []).map(definition => {
        definitionKey(definition);
        return { current: definition };
      }),
    ]),
  ) as { [K in keyof CoreProviderDefinitions]: Array<ProviderSlot> };
  const slots = (collection: keyof CoreProviderDefinitions): Array<ProviderSlot> => slotsByCollection[collection] ?? [];
  const presentCollections = providerCollections.filter(collection => initialDefinitions[collection] !== undefined);
  const definitions = Object.freeze(
    Object.fromEntries(
      presentCollections.map(collection => [collection, Object.freeze(slots(collection).map(createDelegate))]),
    ),
  ) as CoreProviderDefinitions;

  return Object.freeze({
    definitions,
    prepare: nextDefinitions => {
      const previous: Array<{ slot: ProviderSlot; definition: ProviderDefinition }> = [];
      let changed = false;

      for (const collection of providerCollections) {
        const initialSlots = slots(collection);
        const next = nextDefinitions[collection] ?? [];
        if (next.length !== initialSlots.length) invalidDefinitions({ collection, next });
        next.forEach((definition, index) => {
          const slot = initialSlots[index];
          assertCompatibleDefinition(slot.current, definition);
          previous.push({ slot, definition: slot.current });
          changed ||= !definitionsEqual(slot.current, definition);
        });
      }

      for (const collection of providerCollections) {
        const next = nextDefinitions[collection] ?? [];
        next.forEach((definition, index) => {
          const slot = slots(collection)[index];
          slot.current = definition;
        });
      }

      let settled = false;

      return Object.freeze({
        changed,
        commit: () => {
          settled = true;
        },
        rollback: () => {
          if (settled) return;

          previous.forEach(({ slot, definition }) => {
            slot.current = definition;
          });
          settled = true;
        },
      });
    },
  });
};
