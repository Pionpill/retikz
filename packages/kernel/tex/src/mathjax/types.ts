import type { MathJaxExtension, MathJaxProfile } from './constants';

/**
 * 同步 TeX → SVG 引擎接口
 *
 * @description 定义 `createLowerTex` 所需的最小引擎边界：输入 TeX 字符串和 display 选项，输出可由本包 SVG lowerer 消费的标记。调用方可使用内置 MathJax 工厂，也可注入兼容实现；通用 SVG 导入与渲染不属于该接口
 */
export type MathJaxSvgEngine = {
  /** 把一段 TeX 和 display 模式转换成受支持的 SVG 标记 */
  convert: (tex: string, options: { display: boolean }) => string;
};

/**
 * MathJax 引擎配置
 *
 * @description 指定内置配置档及其额外扩展，供 `createMathJaxEngine`、`createMathJaxLowerTex` 与 React Hook 在初始化时解析。它不包含 MathJax 实例，也不控制公式绘制样式
 */
export type MathJaxEngineOptions = {
  /**
   * 选择基础或数学扩展集合的内置配置档
   * @default 'base'
   */
  profile?: MathJaxProfile;
  /**
   * 在配置档之后追加的扩展，重复项会在初始化前去重
   * @default []
   */
  extensions?: Array<MathJaxExtension>;
};
