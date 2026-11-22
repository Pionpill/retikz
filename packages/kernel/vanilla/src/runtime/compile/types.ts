import type { CompileResult } from '@retikz/reconciler';

import type { NamedLayerResult } from '../../normalize';

/** 一次成功 processing 编译得到的不可变结果 */
export type ProcessingResult = Readonly<{
  /** controller 内单调递增的 committed revision */
  revision: number;
  /** authored source 的完整 Core compile result */
  compileResult: CompileResult;
  /** processing 收集的诊断 */
  processingDiagnostics: ReadonlyArray<unknown>;
}>;

/** 视口按层序发布的完整结果，各层保留自己的编译结果 */
export type LayerProcessingResult = ReadonlyArray<NamedLayerResult<ProcessingResult>>;

/** 同步编译结束后的完整候选，其提交与丢弃互斥 */
export type PreparedAsyncStaticProcessing<TResult = ProcessingResult> = Readonly<{
  /** 同 revision 的不可变结果 */
  result: TResult;
  /** 原子发布一次；重复提交无副作用 */
  commit: () => void;
  /** 放弃候选；重复丢弃无副作用 */
  discard: () => void;
}>;
