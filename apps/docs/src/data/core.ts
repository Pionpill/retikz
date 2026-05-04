import { Package } from 'lucide-react';
import type { Section } from './interface';

export const coreSection: Array<Section> = [
  {
    id: 'profile',
    pages: [
      { id: 'overview', label: 'core.overview' },
      { id: 'introduction', label: 'core.introduction' },
      { id: 'get-start', label: 'core.getStart' },
    ],
  },
  {
    id: 'core',
    label: 'core.label',
    pages: [
      {
        id: 'core-intro',
        label: 'core.intro',
        icon: Package,
        children: [{ id: 'core-intro', label: 'core.intro' }],
      },
    ],
  },
];
