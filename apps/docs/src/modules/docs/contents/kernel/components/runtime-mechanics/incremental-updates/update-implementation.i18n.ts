import type { Lang } from '@/i18n';

/** 增量更新机制图文案 */
export const text: Record<Lang, Record<string, [string, string]>> = {
  zh: {
    edge0: ['准备输出', ''],
    prepare: ['prepareProcessingInput', 'Vanilla 整理新输入'],
    runtime: ['ReconcilerSession.replace', '准备完整替换'],
    update: ['Weave / Core', '按输入类别编译'],
    full: ['publish', '协调候选状态与目标'],
    render: ['输出目标', '准备帧并提交宿主'],
    publish: ['发布结果', '成功后通知订阅者'],
  },
  en: {
    edge0: ['Prepare output', ''],
    prepare: ['prepareProcessingInput', 'Vanilla prepares input'],
    runtime: ['ReconcilerSession.replace', 'Prepare complete replacement'],
    update: ['Weave / Core', 'Compile by input kind'],
    full: ['publish', 'Coordinate state and target'],
    render: ['Output target', 'Prepare frame and commit host'],
    publish: ['Publish result', 'Then notify subscribers'],
  },
};
