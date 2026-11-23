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
