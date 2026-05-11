import type { Section } from './interface';

export const aboutSection: Array<Section> = [
  {
    pages: [
      { id: 'overview', label: 'about.overview' },
      { id: 'ai-assisted-development', label: 'about.aiAssistedDevelopment' },
    ],
  },
  {
    id: 'releases',
    label: 'about.releases',
    pages: [
      { id: 'changelog', label: 'about.changelog' },
      { id: 'versioning', label: 'about.versioning' },
      { id: 'roadmap', label: 'about.roadmap' },
    ],
  },
];
