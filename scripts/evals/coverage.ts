import { createHash } from 'node:crypto';

import type { JsonValue } from '../../packages/kernel/foundation/src';
import { isJsonObject } from './grading';
import type { SchemaEvalCase, SchemaEvalScore } from './types';

/** 包提供诊断边界与可复用的属性上下文 */
export type SchemaCoverageOptions = {
  /** 接收解引用后的分支属性，识别不适用于当前宿主的能力 */
  isDiagnosticBranch?: (properties: Record<string, JsonValue>) => boolean;
  /** 只允许这些上下文中的相同属性定义共享断言 */
  canShareProperty?: (entry: SchemaCoverageEntry) => boolean;
};

/** 当前输入契约清单的一项属性、描述或 union 分支 */
export type SchemaCoverageEntry = {
  /** 覆盖维度，描述位置不等于独立语义规则数量 */
  kind: 'property' | 'description' | 'branch';
  /** 冻结契约中的 JSON Pointer */
  pointer: string;
  /** 有限 schema 图中首次到达的代表输入路径 */
  path: string;
  /** 原始描述，保留不同位置的相同文本 */
  description?: string;
  /** 可执行配置检查、共享定义、仅诊断或缺口 */
  status: 'direct' | 'shared' | 'diagnostic' | 'gap';
  /** 实际关联的任务及判分检查路径 */
  witnesses: Array<{ caseId: string; inputPath: string; assertionPaths: Array<string> }>;
};

/** 一次从当前 schema 导出的离线覆盖清单 */
export type SchemaCoverageReport = {
  /** 排序后的完整输入契约 SHA-256，变动后须重新审阅 */
  contractSha256: string;
  /** 属性、描述位置和分支的独立条目 */
  entries: Array<SchemaCoverageEntry>;
};

/** 规范化契约对象键顺序，数组和描述文本保持不变 */
const sortContract = (input: JsonValue): JsonValue => {
  if (Array.isArray(input)) return input.map(sortContract);
  if (isJsonObject(input))
    return Object.fromEntries(
      Object.keys(input)
        .sort()
        .map(key => [key, sortContract(input[key])]),
    );
  return input;
};

/** 生成当前契约与正式用例的配置断言关联，尚不代表模型评估结果 */
export const inspectSchemaEvalCoverage = <TExpected>(
  inputSchema: object,
  cases: Array<SchemaEvalCase<TExpected>>,
  gradeAnswer: (testCase: SchemaEvalCase<TExpected>, answer: string) => SchemaEvalScore,
  options: SchemaCoverageOptions = {},
): SchemaCoverageReport => {
  const schema: JsonValue = JSON.parse(JSON.stringify(inputSchema));
  const schemaNodes = new Map<string, Record<string, JsonValue>>();
  const entries: Array<SchemaCoverageEntry> = [];
  const escapePointer = (segment: string) => segment.replaceAll('~', '~0').replaceAll('/', '~1');
  const children = (node: Record<string, JsonValue>, pointer: string) => {
    const result: Array<{ node: JsonValue; pointer: string; suffix: string }> = [];
    for (const keyword of ['properties', '$defs']) {
      const fields = node[keyword];
      if (isJsonObject(fields))
        for (const [name, child] of Object.entries(fields))
          result.push({
            node: child,
            pointer: `${pointer}/${keyword}/${escapePointer(name)}`,
            suffix: keyword === 'properties' ? `.${name}` : '',
          });
    }
    for (const keyword of ['anyOf', 'oneOf', 'allOf', 'prefixItems']) {
      const branches = node[keyword];
      if (Array.isArray(branches))
        branches.forEach((child, index) =>
          result.push({
            node: child,
            pointer: `${pointer}/${keyword}/${index}`,
            suffix: keyword === 'prefixItems' ? `[${index}]` : '',
          }),
        );
    }
    for (const keyword of ['items', 'additionalProperties'])
      if (isJsonObject(node[keyword]))
        result.push({
          node: node[keyword],
          pointer: `${pointer}/${keyword}`,
          suffix: keyword === 'items' ? '[*]' : '.*',
        });
    return result;
  };
  const inventory = (input: JsonValue, pointer: string) => {
    if (!isJsonObject(input)) return;
    schemaNodes.set(pointer, input);
    if (typeof input.description === 'string')
      entries.push({
        kind: 'description',
        pointer,
        path: '',
        description: input.description,
        status: 'gap',
        witnesses: [],
      });
    if (isJsonObject(input.properties))
      for (const name of Object.keys(input.properties))
        entries.push({
          kind: 'property',
          pointer: `${pointer}/properties/${escapePointer(name)}`,
          path: '',
          status: 'gap',
          witnesses: [],
        });
    for (const keyword of ['anyOf', 'oneOf']) {
      const branches = input[keyword];
      if (Array.isArray(branches))
        branches.forEach((_, index) =>
          entries.push({
            kind: 'branch',
            pointer: `${pointer}/${keyword}/${index}`,
            path: '',
            status: 'gap',
            witnesses: [],
          }),
        );
    }
    children(input, pointer).forEach(child => inventory(child.node, child.pointer));
  };
  inventory(schema, '#');

  const representative = new Map<string, { path: string; diagnostic: boolean }>();
  const dereference = (node: Record<string, JsonValue>): Record<string, JsonValue> => {
    const seen = new Set<Record<string, JsonValue>>();
    while (typeof node.$ref === 'string' && !seen.has(node)) {
      seen.add(node);
      const referenced = schemaNodes.get(node.$ref);
      if (!referenced) break;
      node = referenced;
    }
    return node;
  };
  const queue = [{ pointer: '#', path: '$', diagnostic: false }];
  for (const next of queue) {
    if (representative.has(next.pointer)) continue;
    const node = schemaNodes.get(next.pointer);
    if (!node) continue;
    const properties = dereference(node).properties;
    const resolvedProperties = isJsonObject(properties)
      ? Object.fromEntries(
          Object.entries(properties).map(([name, field]) => [name, isJsonObject(field) ? dereference(field) : field]),
        )
      : {};
    const diagnostic = next.diagnostic || options.isDiagnosticBranch?.(resolvedProperties) === true;
    representative.set(next.pointer, { path: next.path, diagnostic });
    if (typeof node.$ref === 'string') queue.push({ pointer: node.$ref, path: next.path, diagnostic });
    children(node, next.pointer)
      .filter(child => !child.pointer.startsWith(`${next.pointer}/$defs/`))
      .forEach(child => queue.push({ pointer: child.pointer, path: next.path + child.suffix, diagnostic }));
  }

  // 只为已由权威 Zod 校验的参考解选择投影分支，不作为第二个输入校验器
  const matches = (
    node: Record<string, JsonValue>,
    input: JsonValue,
    trail: Array<[Record<string, JsonValue>, JsonValue]> = [],
  ): boolean => {
    if (trail.some(([ancestor, value]) => ancestor === node && value === input)) return true;
    const nested = [...trail, [node, input] as [Record<string, JsonValue>, JsonValue]];
    if (typeof node.$ref === 'string') {
      const referenced = schemaNodes.get(node.$ref);
      if (!referenced || !matches(referenced, input, nested)) return false;
    }
    if ('const' in node && input !== node.const) return false;
    if (Array.isArray(node.enum) && !node.enum.includes(input)) return false;
    const type = node.type;
    if (type === 'object' && !isJsonObject(input)) return false;
    if (type === 'array' && !Array.isArray(input)) return false;
    if (type === 'null' && input !== null) return false;
    if (
      ['number', 'integer', 'string', 'boolean'].includes(String(type)) &&
      typeof input !== (type === 'integer' ? 'number' : type)
    )
      return false;
    for (const keyword of ['anyOf', 'oneOf']) {
      const branches = node[keyword];
      if (Array.isArray(branches) && !branches.some(option => isJsonObject(option) && matches(option, input, nested)))
        return false;
    }
    if (isJsonObject(input)) {
      if (
        Array.isArray(node.required) &&
        node.required.some(field => typeof field === 'string' && !Object.hasOwn(input, field))
      )
        return false;
      if (isJsonObject(node.properties)) {
        for (const [field, child] of Object.entries(node.properties)) {
          if (Object.hasOwn(input, field) && isJsonObject(child) && !matches(child, input[field], nested)) return false;
        }
      }
    }
    if (Array.isArray(input)) {
      if (typeof node.minItems === 'number' && input.length < node.minItems) return false;
      if (typeof node.maxItems === 'number' && input.length > node.maxItems) return false;
      if (
        Array.isArray(node.prefixItems) &&
        node.prefixItems.some(
          (child, index) => isJsonObject(child) && index < input.length && !matches(child, input[index], nested),
        )
      )
        return false;
      if (
        isJsonObject(node.items) &&
        input.some(value => !matches(node.items as Record<string, JsonValue>, value, nested))
      )
        return false;
    }
    return true;
  };
  const witnesses = new Map<string, SchemaCoverageEntry['witnesses']>();
  const simplifyPath = (path: string) => path.replace(/\[(?:\d+|\*)\]/g, '');
  for (const testCase of cases) {
    const score = gradeAnswer(testCase, JSON.stringify(testCase.expected));
    const visit = (pointer: string, input: JsonValue, path: string, trail: Array<[string, JsonValue]> = []) => {
      if (trail.some(([ancestor, value]) => ancestor === pointer && value === input)) return;
      const node = schemaNodes.get(pointer);
      if (!node) return;
      const assertionPaths = score.checks
        .filter(check => check.passed && check.kind === 'value')
        .map(check => check.path)
        .filter(
          checkPath =>
            simplifyPath(checkPath) === simplifyPath(path) ||
            simplifyPath(checkPath).startsWith(`${simplifyPath(path)}.`),
        );
      const current = witnesses.get(pointer) ?? [];
      current.push({ caseId: testCase.id, inputPath: path, assertionPaths });
      witnesses.set(pointer, current);
      const nested: Array<[string, JsonValue]> = [...trail, [pointer, input]];
      if (typeof node.$ref === 'string') visit(node.$ref, input, path, nested);
      for (const keyword of ['anyOf', 'oneOf', 'allOf']) {
        const branches = node[keyword];
        if (Array.isArray(branches))
          branches.forEach((child, index) => {
            if (isJsonObject(child) && matches(child, input))
              visit(`${pointer}/${keyword}/${index}`, input, path, nested);
          });
      }
      if (isJsonObject(input)) {
        if (isJsonObject(node.properties))
          for (const field of Object.keys(node.properties)) {
            if (Object.hasOwn(input, field))
              visit(`${pointer}/properties/${escapePointer(field)}`, input[field], `${path}.${field}`, nested);
          }
        if (isJsonObject(node.additionalProperties))
          for (const [field, value] of Object.entries(input)) {
            if (!isJsonObject(node.properties) || !Object.hasOwn(node.properties, field))
              visit(`${pointer}/additionalProperties`, value, `${path}.${field}`, nested);
          }
      }
      if (Array.isArray(input)) {
        if (Array.isArray(node.prefixItems))
          node.prefixItems.forEach((_, index) => {
            if (index < input.length)
              visit(`${pointer}/prefixItems/${index}`, input[index], `${path}[${index}]`, nested);
          });
        if (isJsonObject(node.items)) input.forEach(value => visit(`${pointer}/items`, value, `${path}[*]`, nested));
      }
    };
    const raw: JsonValue = JSON.parse(JSON.stringify(testCase.expected));
    visit('#', raw, '$');
  }
  for (const entry of entries) {
    const context = representative.get(entry.pointer);
    entry.path = context?.path ?? '(不可达)';
    entry.witnesses = witnesses.get(entry.pointer) ?? [];
    if (context?.diagnostic) entry.status = 'diagnostic';
    else if (entry.witnesses.some(witness => witness.assertionPaths.length > 0)) entry.status = 'direct';
  }
  for (const entry of entries) {
    if (entry.status !== 'gap' || entry.kind !== 'property' || !options.canShareProperty?.(entry)) continue;
    const signature = JSON.stringify(schemaNodes.get(entry.pointer));
    const shared = entries.filter(
      other =>
        other.kind === 'property' &&
        other.status === 'direct' &&
        options.canShareProperty?.(other) &&
        JSON.stringify(schemaNodes.get(other.pointer)) === signature,
    );
    if (shared.length) {
      entry.status = 'shared';
      entry.witnesses = shared.flatMap(other => other.witnesses.filter(witness => witness.assertionPaths.length > 0));
    }
  }
  return {
    contractSha256: createHash('sha256')
      .update(JSON.stringify(sortContract(schema)))
      .digest('hex'),
    entries,
  };
};
