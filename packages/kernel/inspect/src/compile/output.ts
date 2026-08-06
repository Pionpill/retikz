import type { IRChild, Scene, ScenePrimitive } from '@retikz/core';

import { ChildSchema } from '@retikz/core';

import type { InspectorOutput } from '../shared';

/** 校验、脱离并深冻结 JSON-safe plain data */
export const cloneAndFreezeInspectionJson = <T>(value: T, label: string): T => {
  const ancestors = new Set<object>();
  const clone = (input: unknown, path: string): unknown => {
    if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
    if (typeof input === 'number') {
      if (!Number.isFinite(input)) throw new Error(`${path} must contain finite JSON numbers`);
      return input;
    }
    if (typeof input !== 'object') throw new Error(`${path} must be JSON-safe plain data`);
    if (ancestors.has(input)) throw new Error(`${path} must not contain cycles`);
    if (Object.getOwnPropertySymbols(input).length > 0) throw new Error(`${path} must not contain symbol keys`);
    ancestors.add(input);
    try {
      if (Array.isArray(input)) {
        if (Object.getOwnPropertyNames(input).length !== input.length + 1) {
          throw new Error(`${path} must be a dense JSON array without extra properties`);
        }
        return Object.freeze(
          input.map((child, index) => {
            if (!(index in input)) throw new Error(`${path} must be dense; missing index ${index}`);
            return clone(child, `${path}[${index}]`);
          }),
        );
      }
      const prototype = Object.getPrototypeOf(input);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new Error(`${path} must contain plain objects`);
      }
      const output = Object.create(null) as Record<string, unknown>;
      for (const key of Object.getOwnPropertyNames(input)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
          throw new Error(`${path}.${key} must be an enumerable JSON data property`);
        }
        output[key] = clone(descriptor.value, `${path}.${key}`);
      }
      return Object.freeze(output);
    } finally {
      ancestors.delete(input);
    }
  };
  return clone(value, label) as T;
};

/** callback output 做 JSON-safe 脱离、dense 校验与 Core child schema 恢复 */
export const normalizeInspectorOutput = (output: InspectorOutput): ReadonlyArray<IRChild> => {
  const values = Array.isArray(output) ? output : [output];
  for (let index = 0; index < values.length; index += 1) {
    if (!(index in values)) throw new Error(`Inspector output must be dense; missing output index ${index}`);
  }
  return Object.freeze(
    values.map((value, index) => {
      const detached = cloneAndFreezeInspectionJson(value, `Inspector output ${index}`);
      return cloneAndFreezeInspectionJson(ChildSchema.parse(detached), `Inspector output ${index}`);
    }),
  );
};

const sealPrimitive = (primitive: ScenePrimitive): ScenePrimitive => {
  const sealed = { ...primitive };
  Reflect.deleteProperty(sealed, 'id');
  Reflect.deleteProperty(sealed, 'meta');
  Reflect.deleteProperty(sealed, 'animations');
  if (primitive.type !== 'group') return sealed;
  return { ...sealed, children: primitive.children.map(sealPrimitive) } as ScenePrimitive;
};

/** 移除辅助 Scene 的公共 identity、meta 与 animation，并深冻结保留资源引用 */
export const sealInspectionScene = (scene: Scene): Scene => {
  const sealed: Scene = {
    primitives: scene.primitives.map(sealPrimitive),
    layout: { ...scene.layout },
    ...(scene.resources === undefined ? {} : { resources: structuredClone(scene.resources) }),
  };
  const freeze = <T>(value: T): T => {
    if (value === null || typeof value !== 'object') return value;
    for (const child of Object.values(value)) freeze(child);
    return Object.freeze(value);
  };
  return freeze(sealed);
};
