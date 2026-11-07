import type { StrokePathResolution } from '../../../resolve';
import { emitStrokePath } from './emit';
import { layoutStrokePath } from './layout';
import type { CompiledStrokePath, PreparedStrokePathCompilation, StrokePathCompileContext } from './types';

/** 组织标准描边布局与绘制，通过 prepared 消费调用方确认有效的原子结果 */
export const compileStrokePath = (
  resolution: StrokePathResolution,
  context: StrokePathCompileContext,
  prepared?: PreparedStrokePathCompilation,
): CompiledStrokePath => {
  if (prepared?.emit?.overall !== undefined)
    return { ...prepared, emit: { ...prepared.emit, overall: prepared.emit.overall } };
  const layout = layoutStrokePath(resolution, context, prepared?.layout);
  const emit = emitStrokePath(resolution, layout.overall, context, prepared?.emit);
  return { layout, emit };
};
