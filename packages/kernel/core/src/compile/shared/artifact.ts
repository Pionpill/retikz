import type { JsonValue, PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';
import type { ZodType } from 'zod';

import type { CompileOccurrenceLocator } from '../../contract';
import { compareCompileOccurrences } from '../../contract';

/**
 * layout-aware composite 返回的显式领域产物
 * @template TNamespace 产生该产物的复合组件命名空间
 * @template TType 产生该产物的复合组件类型标识
 * @template TValue 复合组件声明的 JSON 值类型
 */
export type CompositeArtifact<
  TNamespace extends string = string,
  TType extends string = string,
  TValue extends JsonValue = JsonValue,
> = Readonly<{
  /** 产物所属复合组件的注册命名空间 */
  namespace: TNamespace;
  /** 产物所属复合组件的注册类型 */
  type: TType;
  /** 产生该产物的最终编译出现位置 */
  occurrence: CompileOccurrenceLocator;
  /** 组件声明的领域结果 */
  value: TValue;
}>;

/**
 * 从精确 composite definition 推导 artifact envelope
 * @template TDefinition 用于推导命名空间、类型标识与产物值的复合组件定义
 */
export type CompositeArtifactOf<TDefinition> = TDefinition extends {
  namespace: infer TNamespace extends string;
  type: infer TType extends string;
  artifactSchema: ZodType<infer TArtifact extends JsonValue>;
}
  ? CompositeArtifact<TNamespace, TType, TArtifact>
  : never;

/** 把结构化 occurrence locator 格式化为唯一调试字符串 */
export const formatCompileOccurrence = (locator: CompileOccurrenceLocator): string =>
  formatPropertyPath(locator.sourcePath) +
  locator.expansionPath.map(({ kind, index }) => `::${kind}[${index}]`).join('');

/**
 * 创建声明子元素相对输入根的完整属性路径
 */
export const createCompileChildPath = (prefix: PropertyPath, index: number): PropertyPath => [
  ...prefix,
  'children',
  index,
];

/** 创建递归冻结的 occurrence locator */
export const freezeOccurrence = (occurrence: CompileOccurrenceLocator): CompileOccurrenceLocator =>
  Object.freeze({
    sourcePath: Object.freeze([...occurrence.sourcePath]),
    expansionPath: Object.freeze(
      occurrence.expansionPath.map(segment => Object.freeze({ kind: segment.kind, index: segment.index })),
    ),
  });

/**
 * 冻结完整 artifact envelope
 * @template T 要保留判别信息与产物值关联的编译产物类型
 */
export const freezeCompileArtifact = <T extends CompositeArtifact>(artifact: T): T => {
  Object.freeze(artifact.value);
  return Object.freeze({
    ...artifact,
    occurrence: freezeOccurrence(artifact.occurrence),
  });
};

/** 按最终逻辑树 occurrence preorder 排列 compile artifacts */
export const orderCompileArtifacts = (artifacts: ReadonlyArray<CompositeArtifact>): Array<CompositeArtifact> =>
  [...artifacts].sort((left, right) => compareCompileOccurrences(left.occurrence, right.occurrence));
