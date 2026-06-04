import type { Section } from './interface';

/** plot module 的 sections + pages 树（alpha.1：单页 introduction，URL `/plot/introduction`） */
export const plotSection: Array<Section> = [
  {
    pages: [{ id: 'introduction', label: 'plot.introduction' }],
  },
];
