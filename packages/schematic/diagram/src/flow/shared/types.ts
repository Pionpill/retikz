import type { ValueOf } from '@retikz/foundation';

import type { FlowDirection, FlowLayoutAlignment, FlowRoutingKind } from './constants';

/** Flow 自动布局作用域与 Layout 固定排列的主方向值 */
export type FlowDirectionValue = ValueOf<typeof FlowDirection>;

/** Flow Layout 交叉轴对齐值 */
export type FlowLayoutAlignmentValue = ValueOf<typeof FlowLayoutAlignment>;

/** Flow relation 路由值 */
export type FlowRoutingKindValue = ValueOf<typeof FlowRoutingKind>;
