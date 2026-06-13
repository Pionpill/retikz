import type { Section } from './interface';

export const aboutSection: Array<Section> = [
  {
    pages: [
      { id: 'overview', label: 'about.overview' },
    ],
  },
  {
    id: 'blog',
    label: 'about.blog',
    pages: [
      { id: 'core-philosophy', label: 'about.blogCorePhilosophy' },
      { id: 'origin', label: 'about.blogOrigin' },
    ],
  },
  {
    id: 'releases',
    label: 'about.releases',
    pages: [
      { id: 'versioning', label: 'about.versioning' },
      { id: 'roadmap', label: 'about.roadmap' },
    ],
  },
  {
    id: 'developer',
    label: 'about.developer',
    pages: [
      { id: 'source-code-guide', label: 'about.sourceCodeGuide' },
      { id: 'ai-assisted-development', label: 'about.aiAssistedDevelopment' },
    ],
  },
];
