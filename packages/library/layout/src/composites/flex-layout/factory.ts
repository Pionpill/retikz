import { LAYOUT_NAMESPACE } from '../../shared';
import type { FlexLayoutInput, IRFlexLayout } from './types';

/** 创建保留省略字段与简写的 FlexLayout 持久化输入
 * @param input 容器与子项配置；静态默认值由 Schema 解析时应用
 * @returns 带 layout 命名空间与容器类型的 Source IR，不修改 input
 */
export const createFlexLayout = (input: FlexLayoutInput): IRFlexLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'flexLayout',
  ...input,
});
