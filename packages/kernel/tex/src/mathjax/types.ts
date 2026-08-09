import type { ValueOf } from '@retikz/foundation';

import type { MathJaxExtension, MathJaxProfile } from './constants';

/** MathJax 配置档取值 */
export type MathJaxProfileValue = ValueOf<typeof MathJaxProfile>;

/** MathJax 扩展取值 */
export type MathJaxExtensionValue = ValueOf<typeof MathJaxExtension>;

/**
 * 同步 TeX → SVG 引擎接口
 * @description 调用方可使用内置 MathJax 工厂，也可注入返回受支持 SVG 子集的自定义实现
 */
export type MathJaxSvgEngine = {
  /** 把一段 TeX 转换成 SVG 标记 */
  convert: (tex: string, options: { display: boolean }) => string;
};

/** MathJax 引擎配置 */
export type MathJaxEngineOptions = {
  /**
   * 内置配置档
   * @default 'base'
   */
  profile?: MathJaxProfileValue;
  /**
   * 在配置档之后追加的扩展
   * @default []
   */
  extensions?: Array<MathJaxExtensionValue>;
};

/** 规范化后的 MathJax 引擎配置 */
export type ResolvedMathJaxEngineOptions = {
  /** 配置档 */
  profile: MathJaxProfileValue;
  /** 按稳定顺序去重后的公开扩展 */
  extensions: Array<MathJaxExtensionValue>;
  /** 包含内部依赖的 MathJax package 顺序 */
  packages: Array<string>;
  /** 可用于共享引擎的稳定键 */
  key: string;
};
