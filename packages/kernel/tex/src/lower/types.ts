/** TeX lowering 诊断 */
export type TexLoweringDiagnostic =
  | { kind: 'engine-error'; source: string; message: string }
  | { kind: 'mathjax-error'; source: string; message: string }
  | { kind: 'unsupported-svg'; source: string; message: string }
  | { kind: 'malformed-svg'; source: string; message: string };

/** TeX lowerer 配置 */
export type LowerTexOptions = {
  /** 每次公开 lowering 失败时接收一次诊断 */
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
