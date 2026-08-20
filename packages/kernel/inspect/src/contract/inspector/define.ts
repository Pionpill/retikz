import type { IRJsonObject, JsonValue } from '@retikz/core';

import { assertNonEmptyString } from '@retikz/foundation';

import type { AnyInspectorDefinition, InspectorDefinition } from './types';

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: AnyInspectorDefinition['owner']): void => {
  if (owner.kind === 'pathKind') {
    assertNonEmptyString(owner.name, 'Inspector owner name');
    return;
  }
  assertNonEmptyString(owner.namespace, 'Inspector owner namespace');
  assertNonEmptyString(owner.type, 'Inspector owner type');
};

/** registry 与公开 define 共用的擦除后 Definition 校验 */
export const normalizeInspectorDefinition = (definition: AnyInspectorDefinition): AnyInspectorDefinition => {
  assertNonEmptyString(definition.namespace, 'Inspector namespace');
  assertNonEmptyString(definition.name, 'Inspector name');
  assertValidOwner(definition.owner);
  return Object.freeze({ ...definition, owner: Object.freeze({ ...definition.owner }) });
};

/** 校验并冻结一个独立 Inspector Definition */
export const defineInspector = <
  TSubject extends JsonValue,
  TOptionsInput extends IRJsonObject,
  TResolvedOptions extends IRJsonObject,
>(
  definition: InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions>,
): InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions> => {
  return normalizeInspectorDefinition(definition) as unknown as InspectorDefinition<
    TSubject,
    TOptionsInput,
    TResolvedOptions
  >;
};
