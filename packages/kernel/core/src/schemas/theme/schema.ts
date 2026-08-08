import { z } from 'zod';

import { ThemeMode, ThemeStyle } from '../../shared';

type JsonValidationFailure = Readonly<{ path: Array<PropertyKey> }>;

/** 定位第一个非 JSON-safe 值，不读取 accessor */
const findJsonValidationFailure = (
  input: unknown,
  ancestors: ReadonlySet<object> = new Set(),
  path: Array<PropertyKey> = [],
): JsonValidationFailure | undefined => {
  if (input === null || typeof input === 'string' || typeof input === 'boolean') return undefined;
  if (typeof input === 'number') return Number.isFinite(input) ? undefined : { path };
  if (typeof input !== 'object' || ancestors.has(input)) return { path };

  try {
    const symbols = Object.getOwnPropertySymbols(input);
    if (symbols.length > 0) return { path: [...path, symbols[0]] };
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(input);
    if (Array.isArray(input)) {
      if (Object.getPrototypeOf(input) !== Array.prototype) return { path };
      const names = Object.getOwnPropertyNames(input);
      if (names.length !== input.length + 1 || !names.includes('length')) {
        const unexpected = names.find(name => name !== 'length' && !/^(0|[1-9]\d*)$/.test(name));
        return { path: unexpected === undefined ? path : [...path, unexpected] };
      }
      for (let index = 0; index < input.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
        const itemPath = [...path, index];
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) return { path: itemPath };
        const failure = findJsonValidationFailure(descriptor.value, nextAncestors, itemPath);
        if (failure !== undefined) return failure;
      }
      return undefined;
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return { path };
    for (const key of Object.getOwnPropertyNames(input)) {
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      const valuePath = [...path, key];
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) return { path: valuePath };
      const failure = findJsonValidationFailure(descriptor.value, nextAncestors, valuePath);
      if (failure !== undefined) return failure;
    }
    return undefined;
  } catch {
    return { path };
  }
};

const isPlainJsonObject = (input: unknown): input is Record<string, unknown> =>
  input !== null &&
  typeof input === 'object' &&
  !Array.isArray(input) &&
  findJsonValidationFailure(input) === undefined;

const isPlainObjectContainer = (input: unknown): input is Record<string, unknown> => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  try {
    const prototype = Object.getPrototypeOf(input);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
};

const ThemeObjectSchema = z.strictObject({
  style: z.enum(ThemeStyle).optional().describe('Sparse visual personality inherited from the enclosing Theme.'),
  mode: z.enum(ThemeMode).optional().describe('Sparse light or dark environment inherited from the enclosing Theme.'),
});

const ThemeInputSchema = z
  .custom<Record<string, unknown>>(isPlainObjectContainer, { error: 'Theme must be a plain JSON object.' })
  .superRefine((input, context) => {
    const failure = findJsonValidationFailure(input);
    if (failure !== undefined) {
      context.addIssue({ code: 'custom', path: failure.path, message: 'Theme must be a plain JSON object.' });
      return;
    }
    for (const key of Reflect.ownKeys(input)) {
      if (key === 'style' || key === 'mode') continue;
      context.addIssue({ code: 'custom', path: [key], message: `Unrecognized Theme field: "${String(key)}".` });
    }
  });

export const ThemeSchema = ThemeInputSchema.pipe(ThemeObjectSchema).describe(
  'Sparse, JSON-serializable Theme override for a Scene or Scope.',
);
