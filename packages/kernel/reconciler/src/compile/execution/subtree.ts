import type { IRChild } from '@retikz/core';

import type { CompileRuntime } from '../runtime';
import { CompileElementExecutor } from './element';
import type { SubtreeCompileHost, SubtreeCompileOptions, SubtreeCompilation } from './types';

/** 全量及 Composite 隔离子树驱动；作者增量树由 Weave 调度 */
export class SubtreeCompiler {
  constructor(
    private readonly children: ReadonlyArray<IRChild>,
    private readonly runtime: CompileRuntime,
    private readonly options: SubtreeCompileOptions & SubtreeCompileHost,
  ) {}

  /** 按完整声明顺序执行并封闭输出 */
  run(): SubtreeCompilation {
    const executor = new CompileElementExecutor(this.children, this.runtime, this.options);
    const frame = executor.createRootFrame();
    executor.compileChildren(this.children, frame, true);
    return executor.finish(frame.state);
  }
}
