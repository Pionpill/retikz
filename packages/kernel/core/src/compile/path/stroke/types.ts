import type { PropertyPath } from '@retikz/foundation';

import type { TextMeasurer } from '../../../contract';
import type { PathEmitOptions, PathTargetView, PathTargetContext } from '../types';
import type { PathCommandEmitter } from './commands';
import type { StrokeCursor } from './cursor';
import type { StrokeSamplingCollector } from './sampling';

/** 普通 path emit 所需的编译上下文 */
export type EmitPathPrimitiveContext = {
  /** 节点 id 与 target 几何解析视图 */
  targetView: PathTargetView;
  /** 坐标取整函数 */
  round: (n: number) => number;
  /** 文本测量函数 */
  measureText?: TextMeasurer;
  /** path emit 选项与 warning 钩子 */
  options?: PathEmitOptions;
};

/** 同一次 stroke 降级共享的查询、游标与写入能力；步骤事实由消费方单独传递 */
export type StrokeLoweringContext = PathTargetContext & {
  /** 当前路径的诊断出口 */
  warn: (code: string, message: string, subPath?: PropertyPath) => void;
  /** 当前路径的命令写入器 */
  commandEmitter: PathCommandEmitter;
  /** 当前步骤游标 */
  cursor: StrokeCursor;
  /** 标签与标记的采样收集器 */
  sampling: StrokeSamplingCollector;
};
