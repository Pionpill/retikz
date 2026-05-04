import { Package } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Section } from './interface';

/** 没真实内容的页用占位文案——通过 t('common.contentPlaceholder', { title }) 在渲染处填 */
const placeholder = (): ReactNode => null;

export const coreSection: Array<Section> = [
  {
    id: 'profile',
    pages: [
      { id: 'overview', label: 'core.overview', content: placeholder() },
      { id: 'introduction', label: 'core.introduction', content: placeholder() },
      { id: 'get-start', label: 'core.getStart', content: placeholder() }
    ],
  },
  {
    id: 'core',
    label: 'core.label',
    pages: [{ id: 'core-intro', label: 'core.intro', icon: Package, content: placeholder(), children: [
      { id: 'core-intro', label: 'core.intro', content: placeholder() },
    ] }],
  },
];
