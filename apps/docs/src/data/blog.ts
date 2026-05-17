import type { Section } from './interface';

/** 博客分区栏目：设计理念 / 开发历程 */
export const blogSection: Array<Section> = [
  {
    id: 'design',
    label: 'blog.design',
    pages: [
      { id: 'why-react-tikz', label: 'blog.designWhyReactTikz' },
    ],
  },
  {
    id: 'journey',
    label: 'blog.journey',
    pages: [
      { id: 'alpha-from-zero', label: 'blog.journeyAlphaFromZero' },
    ],
  },
];
