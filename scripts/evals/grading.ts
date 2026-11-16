import type { JsonValue } from '../../packages/kernel/foundation/src';
import type { SchemaEvalCase, SchemaEvalCheck, SchemaEvalContract, SchemaEvalScore } from './types';

/** 外部 JSON 中的普通对象，不把数组或 null 当成字段容器 */
export const isJsonObject = (input: JsonValue | undefined): input is Record<string, JsonValue> =>
  input !== null && typeof input === 'object' && !Array.isArray(input);

/** 点路径在单标签/数组两种同义表示下都检查原始字段 */
const hasInputPath = (input: JsonValue | undefined, parts: Array<string>): boolean => {
  if (parts.length === 0) return input !== undefined;
  if (Array.isArray(input) && !/^\d+$/.test(parts[0])) return input.some(element => hasInputPath(element, parts));
  if (Array.isArray(input)) return hasInputPath(input[Number(parts[0])], parts.slice(1));
  return isJsonObject(input) && Object.hasOwn(input, parts[0]) && hasInputPath(input[parts[0]], parts.slice(1));
};

/** 比较全部配置事实；未知字段保留至此，不能被 Zod 的剥离行为隐藏 */
const compareFacts = (
  expected: JsonValue,
  actual: JsonValue | undefined,
  path: string,
  checks: Array<SchemaEvalCheck>,
  contract: SchemaEvalContract,
): void => {
  const record = (kind: SchemaEvalCheck['kind'], passed: boolean, message: string) =>
    checks.push({ path, kind, passed, message });
  if (actual === undefined) {
    record('selection', false, '缺少必要配置事实');
    record('value', false, '缺少配置，赋值不能成立');
    return;
  }
  if (isJsonObject(expected)) {
    if (!isJsonObject(actual)) {
      record('selection', false, '对象层级或变体不匹配');
      record('value', false, '配置对象不匹配');
      return;
    }
    record('selection', true, '对象层级匹配');
    if (Object.keys(expected).length === 0) record('value', true, '启用无局部覆盖的配置对象');
    for (const [field, value] of Object.entries(expected))
      compareFacts(value, actual[field], `${path}.${field}`, checks, contract);
    for (const field of Object.keys(actual))
      if (!Object.hasOwn(expected, field)) {
        checks.push({
          path: `${path}.${field}`,
          kind: 'selection',
          passed: false,
          message: '增加了题目未要求的覆盖或未知字段',
        });
      }
    return;
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length !== expected.length) {
      record('selection', false, '数组分支或元素数量不匹配');
      record('value', false, '有序或独立元素集合不匹配');
      return;
    }
    record('selection', true, '数组分支及元素数量匹配');
    if (expected.length === 0) record('value', true, '要求空集合');
    expected.forEach((value, index) => compareFacts(value, actual[index], `${path}[${index}]`, checks, contract));
    return;
  }
  const equal =
    typeof expected === 'number' && typeof actual === 'number'
      ? Math.abs(expected - actual) <= 1e-6
      : contract.equalLeaf
        ? contract.equalLeaf(expected, actual, path)
        : expected === actual;
  record(
    'selection',
    typeof expected === typeof actual && (!contract.isDiscriminator(path) || equal),
    '属性与判别分支选择',
  );
  record('value', equal, equal ? '满足配置事实' : `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`);
};

/** 根据权威输入契约与原始回答判分，不尝试抽取、修复或重试回答 */
export const gradeSchemaAnswer = <TExpected>(
  testCase: SchemaEvalCase<TExpected>,
  answer: string,
  contract: SchemaEvalContract,
): SchemaEvalScore => {
  const score: SchemaEvalScore = {
    eligible: testCase.diagnostic === undefined,
    jsonValid: false,
    schemaValid: false,
    fieldSelectionCorrect: false,
    valuesCorrect: false,
    success: false,
    checks: [],
    diagnostics: [],
  };
  if (!score.eligible) {
    score.diagnostics.push('契约诊断题不进入模型成功率分母');
    return score;
  }
  let raw: JsonValue;
  try {
    raw = JSON.parse(answer);
    score.jsonValid = true;
  } catch {
    score.diagnostics.push('回答不是完整的单个 JSON 值');
    return score;
  }
  score.diagnostics = contract.validate(raw);
  score.schemaValid = score.diagnostics.length === 0;
  for (const path of testCase.mustOmit ?? [])
    score.checks.push({
      path: `$.${path}`,
      kind: 'selection',
      passed: !hasInputPath(raw, path.split('.')),
      message: '原始字段必须省略以保留继承/缺省意图',
    });
  const reference: JsonValue = JSON.parse(JSON.stringify(testCase.expected));
  compareFacts(contract.project(reference, reference), contract.project(raw, reference), '$', score.checks, contract);
  score.fieldSelectionCorrect = score.checks.filter(check => check.kind === 'selection').every(check => check.passed);
  score.valuesCorrect = score.checks.filter(check => check.kind === 'value').every(check => check.passed);
  score.success = score.schemaValid && score.fieldSelectionCorrect && score.valuesCorrect;
  return score;
};
