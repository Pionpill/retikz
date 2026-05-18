import type { Section } from './interface';

/** 博客分区栏目：设计理念 / 开发历程 */
export const blogSection: Array<Section> = [
  {
    id: 'design',
    label: 'blog.design',
    pages: [{ id: 'core-philosophy', label: 'blog.designCorePhilosophy' },],
  },
  {
    id: 'journey',
    label: 'blog.journey',
    pages: [
      { id: 'origin', label: 'blog.journeyOrigin' },
      
    ],
  },
];
