import type { JsonObject, JsonValue } from '@retikz/foundation';
import { strictObject } from 'zod';

import { RetikzInspectError, RetikzInspectErrorCode } from '../error';
import type {
  AnyInspectorDefinition,
  InputAnyInspectorDefinition,
  InputInspectorDefinition,
  InspectorSubject,
} from './types';

/** 未声明选项时仅允许空对象 */
const EmptyInspectorOptionsSchema = strictObject({});

/** 补全统一注册契约，不读取任何主图编译环境 */
export const sealInspectorDefinition = (definition: InputAnyInspectorDefinition): AnyInspectorDefinition => {
  const identifiers = [definition.namespace, definition.type];
  if (definition.subject.kind === 'artifact') identifiers.push(definition.subject.namespace, definition.subject.type);
  if (identifiers.some(identifier => identifier.trim().length === 0)) {
    throw new RetikzInspectError(
      RetikzInspectErrorCode.Contract,
      'Inspector and artifact subject keys must not be blank',
    );
  }
  return Object.freeze({
    ...definition,
    subject: Object.freeze({ ...definition.subject }),
    optionsSchema: definition.optionsSchema ?? EmptyInspectorOptionsSchema,
  });
};

/** 定义消费公开编译结果的检查器，保留图元类别与领域值类型 */
export const defineInspector = <
  const TSubject extends InspectorSubject,
  TOptions extends JsonObject = Record<string, never>,
  TValue extends JsonValue = JsonValue,
>(
  definition: InputInspectorDefinition<TSubject, TOptions, TValue>,
): InputInspectorDefinition<TSubject, TOptions, TValue> => Object.freeze(definition);
