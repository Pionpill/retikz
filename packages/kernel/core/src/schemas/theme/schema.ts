import { z } from 'zod';

import { ThemeMode, ThemeStyle } from '../../shared';

/** 判断输入是否为可无损遍历且不会执行 accessor 的普通 JSON 对象 */
const isPlainJsonObject = (input: unknown): input is Record<string, unknown> => {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  try {
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return Reflect.ownKeys(input).every(key => {
      if (typeof key !== 'string') return false;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      return (
        descriptor !== undefined && descriptor.enumerable && 'value' in descriptor && descriptor.value !== undefined
      );
    });
  } catch {
    return false;
  }
};

const ThemeObjectSchema = z.strictObject({
  style: z.enum(ThemeStyle).optional().describe('Sparse visual personality inherited from the enclosing Theme.'),
  mode: z.enum(ThemeMode).optional().describe('Sparse light or dark environment inherited from the enclosing Theme.'),
});

const ThemeInputSchema = z
  .custom<Record<string, unknown>>(isPlainJsonObject, { error: 'Theme must be a plain JSON object.' })
  .superRefine((input, context) => {
    for (const key of Reflect.ownKeys(input)) {
      if (key === 'style' || key === 'mode') continue;
      context.addIssue({ code: 'custom', path: [key], message: `Unrecognized Theme field: "${String(key)}".` });
    }
  });

export const ThemeSchema = ThemeInputSchema.pipe(ThemeObjectSchema).describe(
  'Sparse, JSON-serializable Theme override for a Scene or Scope.',
);
