/**
 * TeX lowering 诊断
 *
 * @description 描述引擎执行、MathJax 解析或 SVG 降解阶段不能产出公式路径的原因。它只承载可展示或记录的失败事实，不负责错误恢复；调用方可通过 `LowerTexOptions.onDiagnostic` 决定如何提示用户
 */
export type TexLoweringDiagnostic =
  | { kind: 'engine-error'; source: string; message: string }
  | { kind: 'mathjax-error'; source: string; message: string }
  | { kind: 'unsupported-svg'; source: string; message: string }
  | { kind: 'malformed-svg'; source: string; message: string };

/**
 * TeX lowerer 配置
 *
 * @description 控制由 `createLowerTex` 创建的 lowerer 如何向外报告失败。它不改变 TeX 解析或缓存语义，成功结果仍直接返回给 Core 的文本编译流程
 */
export type LowerTexOptions = {
  /** 每次公开 lowering 失败时接收一次诊断，供应用记录、提示或上报 */
  onDiagnostic?: (diagnostic: TexLoweringDiagnostic) => void;
};

/** 内部 lowering 成功结果 */
export type TexLoweringSuccess<T> = {
  ok: true;
  value: T;
};

/** 内部 lowering 失败结果 */
export type TexLoweringFailure = {
  ok: false;
  diagnostic: TexLoweringDiagnostic;
  cacheable: boolean;
};

/** 保留失败分类与缓存策略的内部 lowering 结果 */
export type TexLoweringResult<T> = TexLoweringSuccess<T> | TexLoweringFailure;
