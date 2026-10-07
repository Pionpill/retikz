import type { Lang } from '@/i18n';

/** 连接编译图文案；入口示例与分支布局图一致 */
export const connectionCompileFigureI18n: Record<Lang, Array<string>> = {
  zh: [
    '入口与出口\nA → { Bbbbbbbb, E }',
    'connections\n保存两端引用与连接配置',
    '生成引用节点与 IRPath\n最终尺寸与整节点引用',
    'Core 路径编译\n边界裁切、箭头与标签',
  ],
  en: [
    'Entries and exits\nA → { Bbbbbbbb, E }',
    'connections\nEndpoint references and options',
    'Create nodes and IRPath\nFinal bounds, whole-node targets',
    'Core path compilation\nBoundary clipping, arrows, labels',
  ],
};
