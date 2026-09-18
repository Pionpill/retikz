import type { IRTextBlock } from '@retikz/core';

import type { Lang } from '@/i18n';
export const principlesRegistryI18n: Record<
  Lang,
  { builtins: IRTextBlock; custom: IRTextBlock; resolver: IRTextBlock; registry: IRTextBlock; consumer: IRTextBlock }
> = {
  zh: {
    builtins: [
      { text: '内置 Definition', font: { size: 14 } },
      { text: 'BUILTIN_*', fill: 'gray', font: { size: 12 } },
    ],
    custom: [
      { text: '自定义 Definition', font: { size: 14 } },
      { text: 'defineXxx(...)', fill: 'gray', font: { size: 12 } },
    ],
    resolver: [
      { text: '建表与校验', font: { size: 14 } },
      { text: 'resolveXxxRegistry', fill: 'gray', font: { size: 12 } },
    ],
    registry: [
      { text: '有效 registry', font: { size: 14 } },
      { text: 'ReadonlyMap', fill: 'gray', font: { size: 12 } },
    ],
    consumer: [
      { text: '编译消费', font: { size: 14 } },
      { text: 'compile consumer', fill: 'gray', font: { size: 12 } },
    ],
  },
  en: {
    builtins: [
      { text: 'Builtin Definition', font: { size: 14 } },
      { text: 'BUILTIN_*', fill: 'gray', font: { size: 12 } },
    ],
    custom: [
      { text: 'Custom Definition', font: { size: 14 } },
      { text: 'defineXxx(...)', fill: 'gray', font: { size: 12 } },
    ],
    resolver: [
      { text: 'Build and validate', font: { size: 14 } },
      { text: 'resolveXxxRegistry', fill: 'gray', font: { size: 12 } },
    ],
    registry: [
      { text: 'Effective registry', font: { size: 14 } },
      { text: 'ReadonlyMap', fill: 'gray', font: { size: 12 } },
    ],
    consumer: [{ text: 'Compile consumer', font: { size: 14 } }],
  },
};
