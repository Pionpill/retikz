import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '默认对齐与覆盖',
    inherit: '跟随容器',
    follower: '跟随容器',
    overridden: '单项覆盖',
    justifyItems: '容器水平对齐',
    justifyItems0: '起点',
    justifyItems1: '居中',
    justifyItems2: '终点',
    justifySelf: '橙色节点对齐',
    justifySelf0: '起点',
    justifySelf1: '居中',
    justifySelf2: '终点',
  },
  en: {
    title: 'Alignment and overrides',
    inherit: 'Inherit',
    follower: 'Inherits container',
    overridden: 'Item override',
    justifyItems: 'Container horizontal alignment',
    justifyItems0: 'Start',
    justifyItems1: 'Center',
    justifyItems2: 'End',
    justifySelf: 'Orange node alignment',
    justifySelf0: 'Start',
    justifySelf1: 'Center',
    justifySelf2: 'End',
  },
} satisfies Record<Lang, Record<string, string>>;
