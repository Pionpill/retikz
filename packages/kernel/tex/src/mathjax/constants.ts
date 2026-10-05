import type { ValueOf } from '@retikz/foundation';
/**
 * 内置 MathJax 配置档
 * @description `base` 仅启用基础 TeX 配置，`math` 额外启用常用数学扩展集合。它提供 `createMathJaxEngine` 与 lowerer 工厂可识别的扩展集合选择，不创建引擎，也不改变已创建实例
 */
export const MathJaxProfile = {
  /** 仅启用 MathJax 基础 TeX 配置 */
  Base: 'base',
  /** 启用内置数学扩展集合 */
  Math: 'math',
} as const;

/**
 * 可按需加载的 MathJax TeX 扩展
 * @description 值与 MathJax configuration 的扩展标识保持一致，并由 profile 解析阶段统一校验、去重和加载。它提供可传给引擎配置的稳定扩展标识
 */
export const MathJaxExtension = {
  /** AMS 数学环境与命令 */
  Ams: 'ams',
  /** 用户自定义 TeX 命令 */
  Newcommand: 'newcommand',
  /** 粗体数学符号命令 */
  Boldsymbol: 'boldsymbol',
  /** Dirac bra-ket 记号命令 */
  Braket: 'braket',
  /** 公式删除线与取消标记命令 */
  Cancel: 'cancel',
  /** 分段公式与相关环境 */
  Cases: 'cases',
  /** 居中否定符号命令 */
  Centernot: 'centernot',
  /** mathtools 数学工具扩展 */
  Mathtools: 'mathtools',
  /** 数学公式颜色命令 */
  Color: 'color',
} as const;

/**
 * MathJax 扩展的稳定规范顺序
 * @description profile 解析使用该顺序去重并生成确定性的扩展与 package 列表
 */
export const MATHJAX_EXTENSION_ORDER = Object.values(MathJaxExtension);

/**
 * MathJax 配置档取值
 *
 * @description 由 `MathJaxProfile` 派生的受限字符串集合，用于选择内置扩展组合；它只描述配置值，实际扩展加载由 MathJax 工厂负责
 */
export type MathJaxProfile = ValueOf<typeof MathJaxProfile>;

/**
 * MathJax 扩展取值
 *
 * @description 由 `MathJaxExtension` 派生的受限字符串集合，可在内置配置档之后追加。配置解析会去重并按稳定顺序加载，调用方无需自行处理 package 顺序
 */
export type MathJaxExtension = ValueOf<typeof MathJaxExtension>;
