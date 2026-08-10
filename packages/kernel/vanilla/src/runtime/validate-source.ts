import type { IRScene } from '@retikz/core';

import { SceneSchema } from '@retikz/core';

type ValidationIssue = Readonly<{
  code: string;
  path: ReadonlyArray<PropertyKey>;
  message: string;
  keys?: ReadonlyArray<string>;
  errors?: ReadonlyArray<ReadonlyArray<ValidationIssue>>;
}>;

/** 安全读取诊断路径中的自有数据字段，不触发 accessor */
const readOwnValue = (input: unknown, key: PropertyKey): unknown => {
  if (input === null || typeof input !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
};

/** 提取 union 嵌套后的首个具体 schema issue */
const flattenIssue = (issue: ValidationIssue): Readonly<{ path: ReadonlyArray<PropertyKey>; message: string }> => {
  const path = [...issue.path];
  let current = issue;
  while (current.code === 'invalid_union') {
    const nested = current.errors?.[0]?.[0];
    if (nested === undefined) break;
    current = nested;
    path.push(...nested.path);
  }
  if (current.code === 'unrecognized_keys' && current.keys?.[0] !== undefined) path.push(current.keys[0]);
  return { path, message: current.message };
};

/** 把 schema 字段路径转换为 Core compile 使用的语义 IR 路径 */
const formatScenePath = (source: unknown, segments: ReadonlyArray<PropertyKey>): string => {
  let path = 'scene';
  let current = source;
  let previous: PropertyKey | undefined;
  for (const segment of segments) {
    if (typeof segment === 'number') {
      path += `[${segment}]`;
      current = readOwnValue(current, segment);
      if (previous === 'children') {
        const type = readOwnValue(current, 'type');
        if (type === 'node' || type === 'path' || type === 'coordinate' || type === 'scope') path += `.${type}`;
      }
    } else {
      path += `.${String(segment)}`;
      current = readOwnValue(current, segment);
    }
    previous = segment;
  }
  return path;
};

/** 在 Vanilla 外部输入边界解析并脱离 canonical Core IR */
export const validateVanillaCoreSource = (source: unknown): IRScene => {
  const result = SceneSchema.safeParse(source);
  if (result.success) return result.data;
  const issue = flattenIssue(result.error.issues[0]);
  throw new Error(`Invalid Core IR at ${formatScenePath(source, issue.path)}: ${issue.message}`, {
    cause: result.error,
  });
};
