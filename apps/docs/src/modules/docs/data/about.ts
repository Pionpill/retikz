import type { Section } from './types';

export const aboutSection: Array<Section> = [
  {
    pages: [{ id: 'introduction', label: 'about.introduction' }],
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
      { id: 'iteration-design', label: 'about.iterationDesign' },
      { id: 'ai-assisted-development', label: 'about.aiAssistedDevelopment' },
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
];
