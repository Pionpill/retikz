import type { JsonValue } from '../../packages/kernel/foundation/src';

/** 完整输入契约的一条自然语言任务，只有 task 发送给模型 */
export type SchemaEvalCase<TExpected> = {
  /** 稳定标识，用于跨版本比较 */
  id: string;
  /** 自然语言需求 */
  task: string;
  /** 判分侧参考配置 */
  expected: TExpected;
  /** 原始回答必须省略的点路径 */
  mustOmit?: Array<string>;
  /** 只作契约诊断的原因；存在时跳过模型调用与计分 */
  diagnostic?: string;
  /** 通过 schema 但不满足题意的已知反例 */
  counterexample?: { expected: TExpected; reason: string };
};

/** 一条可追踪到输入路径的确定性检查 */
export type SchemaEvalCheck = {
  /** 输入字段或关系路径 */
  path: string;
  /** 字段选择或赋值 */
  kind: 'selection' | 'value';
  /** 是否满足要求 */
  passed: boolean;
  /** 判定依据 */
  message: string;
};

/** 一次独立回答的判分结果，各分项使用同一个样本分母 */
export type SchemaEvalScore = {
  /** 是否进入模型成功率 */
  eligible: boolean;
  /** 是否为完整单个 JSON 值 */
  jsonValid: boolean;
  /** 是否通过权威 schema */
  schemaValid: boolean;
  /** 必要字段、层级、分支和省略均正确 */
  fieldSelectionCorrect: boolean;
  /** 配置事实均正确 */
  valuesCorrect: boolean;
  /** 同次回答所有分项联合成功 */
  success: boolean;
  /** 逐路径判分 */
  checks: Array<SchemaEvalCheck>;
  /** 解析、校验或不计分原因 */
  diagnostics: Array<string>;
};

/** 包提供权威校验与领域等价，通用判分器不依赖具体 IR */
export type SchemaEvalContract = {
  /** 返回权威 schema 的错误；空数组表示合法 */
  validate: (input: JsonValue) => Array<string>;
  /** 将允许的等价配置投影为可比较事实 */
  project: (input: JsonValue, reference: JsonValue) => JsonValue;
  /** 判别字段的错值同时算字段选择错误，由包声明其路径 */
  isDiscriminator: (path: string) => boolean;
  /** 领域叶值等价，例如颜色；未配置时严格比较 */
  equalLeaf?: (expected: JsonValue, actual: JsonValue, path: string) => boolean;
};
