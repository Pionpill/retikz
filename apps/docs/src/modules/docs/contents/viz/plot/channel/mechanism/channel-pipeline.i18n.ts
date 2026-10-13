import type { Lang } from '@/i18n';

/** 源码导览的双语标签 */
export const channelPipelineI18n: Record<Lang, Array<Array<string>>> = {
  zh: [
    ['注册定义', 'resolveChannelRegistry'],
    ['解析图元通道', 'resolveMarkChannels'],
    ['逐行取值', 'entry.resolver(row)'],
    ['写入节点', 'lowerPoint → deliver'],
    ['收集映射描述', 'collectChannelDescriptors'],
    ['生成图例', 'buildLegendLayers'],
  ],
  en: [
    ['Register definitions', 'resolveChannelRegistry'],
    ['Resolve mark channels', 'resolveMarkChannels'],
    ['Read each row', 'entry.resolver(row)'],
    ['Write node properties', 'lowerPoint → deliver'],
    ['Collect descriptors', 'collectChannelDescriptors'],
    ['Build legends', 'buildLegendLayers'],
  ],
};
