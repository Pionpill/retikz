import type { JsonObject, JsonValue } from '@retikz/foundation';

import { assertNonEmptyString } from '@retikz/foundation';

import type { AnyInspectorDefinition, InspectorDefinition } from './types';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';

const inspectorContractError = (label: string): RetikzInspectError =>
  new RetikzInspectError(RetikzInspectErrorCode.Contract, `${label} must be a non-empty string.`);

/** 校验 Inspector owner 判别字段 */
const assertValidOwner = (owner: AnyInspectorDefinition['owner']): void => {
  if (owner.kind === 'pathKind') {
    assertNonEmptyString(owner.name, 'Inspector owner name', inspectorContractError('Inspector owner name'));
    return;
  }
  assertNonEmptyString(
    owner.namespace,
    'Inspector owner namespace',
    inspectorContractError('Inspector owner namespace'),
  );
  assertNonEmptyString(owner.type, 'Inspector owner type', inspectorContractError('Inspector owner type'));
};

/** 校验并冻结 registry 与公开 define 共用的擦除后 Definition */
export const sealInspectorDefinition = (definition: AnyInspectorDefinition): AnyInspectorDefinition => {
  assertNonEmptyString(definition.namespace, 'Inspector namespace', inspectorContractError('Inspector namespace'));
  assertNonEmptyString(definition.type, 'Inspector type', inspectorContractError('Inspector type'));
  assertValidOwner(definition.owner);
  return Object.freeze({ ...definition, owner: Object.freeze({ ...definition.owner }) });
};

/** 校验并冻结一个独立 Inspector Definition */
export const defineInspector = <
  TSubject extends JsonValue,
  TOptionsInput extends JsonObject,
  TResolvedOptions extends JsonObject,
>(
  definition: InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions>,
): InspectorDefinition<TSubject, TOptionsInput, TResolvedOptions> => {
  return sealInspectorDefinition(definition) as unknown as InspectorDefinition<
    TSubject,
    TOptionsInput,
    TResolvedOptions
  >;
};
