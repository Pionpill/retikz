import type { IRJsonObject, JsonValue } from '../../schemas';
import type { AnyPathKindDefinition, PathKindDefinition } from './types';

import { defineInspector } from '../inspection';

/** 保留普通与带 Inspector Path kind 两个互斥分支的定义入口 */
type DefinePathKind = {
  <TOptions = IRJsonObject>(definition: PathKindDefinition<TOptions, never>): PathKindDefinition<TOptions, never>;
  <
    TOptions,
    TInspectionSubject extends JsonValue,
    TInspectionOptionsInput extends IRJsonObject,
    TResolvedInspectionOptions extends IRJsonObject,
  >(
    definition: PathKindDefinition<TOptions, TInspectionSubject, TInspectionOptionsInput, TResolvedInspectionOptions>,
  ): PathKindDefinition<TOptions, TInspectionSubject, TInspectionOptionsInput, TResolvedInspectionOptions>;
};

/**
 * 定义 path kind 注册项，并校验 schema literal key
 * @remarks 保留入口用于对齐 registry API，并集中处理定义点泛型
 * @throws 当 schema.shape.kind 不是非空 literal 字符串时
 */
const definePathKindImplementation = (input: unknown): unknown => {
  const definition = input as AnyPathKindDefinition;
  const kind = definition.schema.shape.kind.value;
  if (typeof kind !== 'string' || kind.trim().length === 0) {
    throw new Error('definePathKind: schema.shape.kind must be a non-empty z.literal string.');
  }
  const record = definition as unknown as Readonly<Record<string, unknown>>;
  const hasSubjectSchema = record.inspectionSubjectSchema !== undefined;
  const hasInspector = record.inspector !== undefined;
  if (hasSubjectSchema !== hasInspector) {
    throw new Error('definePathKind: inspectionSubjectSchema and inspector must be provided together.');
  }
  if (hasInspector) {
    const inspector = record.inspector as Parameters<typeof defineInspector>[0];
    if (inspector.kind !== 'path') throw new Error('definePathKind: inspector.kind must be "path".');
    defineInspector(inspector);
  }
  return definition;
};

export const definePathKind = definePathKindImplementation as DefinePathKind;
