import type { InputFlowEntity } from '@retikz/diagram-vanilla/flow';

import type { Lang } from '@/i18n';

export type InspectSelectionTreeI18n = Readonly<
  Record<'scene' | 'inherit' | 'disable' | 'barrier' | 'inherited' | 'reopened' | 'blocked', InputFlowEntity['text']>
>;

export const inspectSelectionTreeI18n: Record<Lang, InspectSelectionTreeI18n> = {
  zh: {
    scene: ['Scene', { text: '指定 Inspector：options: true', fill: 'gray', font: { size: 'sm' } }],
    inherit: ['Scope A', { text: '未覆盖 · 继承开启', fill: 'gray', font: { size: 'sm' } }],
    disable: ['Scope B', { text: 'options: false · 关闭', fill: 'gray', font: { size: 'sm' } }],
    barrier: ['Scope C', { text: 'barrier · 全部封锁', fill: 'gray', font: { size: 'sm' } }],
    inherited: ['对象 A · 观测开启', { text: '未覆盖 · 沿用父级', fill: 'gray', font: { size: 'sm' } }],
    reopened: ['对象 B · 观测开启', { text: 'options: true · 重新开启', fill: 'gray', font: { size: 'sm' } }],
    blocked: ['对象 C · 观测关闭', { text: 'options: true · 仍被屏障阻止', fill: 'gray', font: { size: 'sm' } }],
  },
  en: {
    scene: ['Scene', { text: 'One Inspector: options: true', fill: 'gray', font: { size: 'sm' } }],
    inherit: ['Scope A', { text: 'No override · inherit ON', fill: 'gray', font: { size: 'sm' } }],
    disable: ['Scope B', { text: 'options: false · OFF', fill: 'gray', font: { size: 'sm' } }],
    barrier: ['Scope C', { text: 'barrier · block all', fill: 'gray', font: { size: 'sm' } }],
    inherited: ['Object A · inspection ON', { text: 'No override · inherit', fill: 'gray', font: { size: 'sm' } }],
    reopened: ['Object B · inspection ON', { text: 'options: true · reopen', fill: 'gray', font: { size: 'sm' } }],
    blocked: [
      'Object C · inspection OFF',
      { text: 'options: true · still blocked', fill: 'gray', font: { size: 'sm' } },
    ],
  },
};
