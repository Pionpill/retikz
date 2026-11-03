import type { PropertyPath } from '@retikz/foundation';

import type { IRPosition } from '../../../schemas';

/** 坐标编译状态，不创建虚构的可见图元 */
export type CompiledCoordinate = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
  /** 供名称登记的作者 id */
  id: string;
  /** 本地位置 */
  position: IRPosition;
}>;
