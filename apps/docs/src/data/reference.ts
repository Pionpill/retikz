import type { Section } from './interface';

export const referenceSection: Array<Section> = [
  {
    pages: [{ id: 'overview', label: 'reference.overview' }],
  },
  {
    id: 'releases',
    label: 'reference.releases',
    pages: [
      { id: 'changelog', label: 'reference.changelog' },
      { id: 'versioning', label: 'reference.versioning' },
      { id: 'roadmap', label: 'reference.roadmap' },
    ],
  },
];
