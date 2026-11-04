import type { TextMeasurer } from '../../../contract';
import type { PathEmitOptions, PathTargetView } from '../types';

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
