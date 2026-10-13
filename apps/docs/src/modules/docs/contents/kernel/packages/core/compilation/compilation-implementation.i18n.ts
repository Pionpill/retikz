import type { Lang } from '@/i18n';

/** 编译源码导览的双语文案 */
export const compilationImplementationI18n: Record<
  Lang,
  Record<
    | 'entry'
    | 'context'
    | 'visit'
    | 'flush'
    | 'sort'
    | 'result'
    | 'input'
    | 'dependencies'
    | 'layouts'
    | 'pending'
    | 'paths'
    | 'primitives'
    | 'scene'
    | 'extras',
    string
  >
> = {
  zh: {
    entry: '进入完整编译',
    context: '准备能力与本次编译状态',
    visit: '分派子项，递归进入 Scope',
    flush: '遍历收尾：解析路径并回填',
    sort: '遍历收尾：检查占位并排序',
    result: '返回外层，汇总编译结果',
    input: '输入声明与编译选项',
    dependencies: 'registry、资源表与测量能力',
    layouts: '登记命名空间，供后续引用',
    pending: '待解析路径与绘制占位',
    paths: '替换原位置的路径占位',
    primitives: '已完成回填的有序图元',
    scene: '图元、画布边界与绘制资源',
    extras: '附属产物与具名空间索引',
  },
  en: {
    entry: 'Enter full compilation',
    context: 'Prepare compile dependencies',
    visit: 'Dispatch children; recurse into Scope',
    flush: 'Finish traversal: resolve queued paths',
    sort: 'Finish traversal: check slots and sort',
    result: 'Return to caller; assemble the result',
    input: 'Source and compile options',
    dependencies: 'Registries and resources',
    layouts: 'Named node geometry',
    pending: 'Queued paths and slots',
    paths: 'Replace original path slots',
    primitives: 'Resolved drawing order',
    scene: 'Primitives, bounds, resources',
    extras: 'Artifacts and spatial index',
  },
};
