import type { ComponentRenderSource, SourceView } from '../types';

import { SOURCE_VIEW_ORDER } from '../constants';

/**
 * 从 source 算出可用视图列表（固定顺序）
 * @description 一个视图「可用」= 它有至少一个源码文件。≥ 2 个可用视图才出视图切换；单视图直接展示、零视图不渲染代码面板。
 */
export const availableSourceViews = (source: ComponentRenderSource): Array<SourceView> =>
  SOURCE_VIEW_ORDER.filter(v => (source[v]?.files.length ?? 0) > 0);
