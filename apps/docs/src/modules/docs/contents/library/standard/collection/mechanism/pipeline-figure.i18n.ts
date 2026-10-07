import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const pipelineFigureI18n: Record<Lang, Array<string>> = {
  zh: [
    'IRMatrix\n集合输入',
    'resolveMatrix\n展开输入与配置',
    'resolveCell\n逐格继承与补全',
    'measureCell\n探测内容需求',
    'MeasuredCell[][]\n保留结果与需求',
    'compileMatrix\n汇总轨道与放置',
    'CellPlacement[]\n最终位置与尺寸',
    'compileCells\n回放与组装',
    'children + allocationBounds\n交回编译上下文',
  ],
  en: [
    'IRMatrix\nCollection input',
    'resolveMatrix\nExpand input',
    'resolveCell\nResolve each cell',
    'measureCell\nProbe content',
    'MeasuredCell[][]\nResults and needs',
    'compileMatrix\nTracks and placement',
    'CellPlacement[]\nPosition and size',
    'compileCells\nReplay and assemble',
    'children + allocationBounds\nReturn to compiler',
  ],
};
