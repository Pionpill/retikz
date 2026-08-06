import { z } from 'zod';

import type { IRJsonObject, JsonValue } from '../../schemas';
import type { InspectorDefinition } from './types';

import { cloneAndFreezeJson } from '../../shared/json';

/** 校验 Inspector 的 sparse input 与 canonical options 契约 */
const validateInspectorOptions = (definition: Readonly<Record<string, unknown>>): void => {
  const inputSchema = definition.optionsInputSchema;
  const optionsSchema = definition.optionsSchema;
  if (!(inputSchema instanceof z.ZodObject)) {
    throw new Error('defineInspector: optionsInputSchema must be a direct strict ZodObject.');
  }
  let sentinel = '__retikzInspectorUnknown__';
  while (Object.hasOwn(inputSchema.shape, sentinel)) sentinel = `_${sentinel}`;
  if (inputSchema.safeParse({ [sentinel]: true }).success) {
    throw new Error('defineInspector: optionsInputSchema must reject unknown keys as a strict object.');
  }
  const emptyInput = inputSchema.safeParse({});
  if (!emptyInput.success) {
    throw new Error('defineInspector: optionsInputSchema must accept an empty options object.');
  }
  if (!(optionsSchema instanceof z.ZodType)) {
    throw new Error('defineInspector: optionsSchema must be a Zod schema.');
  }
  const resolved = optionsSchema.safeParse(emptyInput.data);
  if (!resolved.success) {
    throw new Error('defineInspector: optionsSchema must resolve an empty input to canonical options.');
  }
  try {
    const frozen = cloneAndFreezeJson(resolved.data, 'Inspector canonical options');
    if (frozen === null || typeof frozen !== 'object' || Array.isArray(frozen)) {
      throw new Error('resolved options must be a JSON object');
    }
  } catch (cause) {
    throw new Error('defineInspector: optionsSchema must resolve to a JSON-safe object.', { cause });
  }
};

/**
 * 定义依附 owner Definition 的 Inspector
 * @remarks Inspector 不独立注册；Composite、PathKind 等 owner helper 负责把它绑定到 settled subject
 */
export const defineInspector = <
  const TKind extends string,
  TSubject extends JsonValue,
  const TInputSchema extends z.ZodObject,
  const TOptionsSchema extends z.ZodType<IRJsonObject, z.output<TInputSchema>>,
>(
  definition: Readonly<{
    kind: TKind;
    optionsInputSchema: TInputSchema;
    optionsSchema: TOptionsSchema;
    inspect: InspectorDefinition<
      TKind,
      TSubject,
      z.input<TInputSchema> & IRJsonObject,
      z.output<TOptionsSchema>
    >['inspect'];
  }>,
): InspectorDefinition<TKind, TSubject, z.input<TInputSchema> & IRJsonObject, z.output<TOptionsSchema>> => {
  if (typeof definition.kind !== 'string' || definition.kind.trim().length === 0) {
    throw new Error('defineInspector: kind must be a non-empty string.');
  }
  validateInspectorOptions(definition);
  if (typeof definition.inspect !== 'function') {
    throw new Error('defineInspector: inspect must be a function.');
  }
  return definition as unknown as InspectorDefinition<
    TKind,
    TSubject,
    z.input<TInputSchema> & IRJsonObject,
    z.output<TOptionsSchema>
  >;
};
