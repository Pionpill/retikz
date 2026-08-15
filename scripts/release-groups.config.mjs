export const releaseGroups = {
  layout: {
    domain: 'library',
    kind: 'feature',
    packages: ['@retikz/layout', '@retikz/layout-react', '@retikz/layout-vanilla'],
  },
  standard: {
    domain: 'library',
    kind: 'feature',
    packages: ['@retikz/standard', '@retikz/standard-react', '@retikz/standard-vanilla'],
  },
  graph: {
    domain: 'diagram',
    kind: 'foundation',
    packages: ['@retikz/graph', '@retikz/graph-react', '@retikz/graph-vanilla'],
  },
  kernel: {
    domain: 'kernel',
    kind: 'foundation',
    packages: [
      '@retikz/foundation',
      '@retikz/math',
      '@retikz/runtime',
      '@retikz/core',
      '@retikz/inspect',
      '@retikz/render',
      '@retikz/react',
      '@retikz/vanilla',
      '@retikz/tex',
    ],
  },
  data: {
    domain: 'viz',
    kind: 'foundation',
    packages: ['@retikz/data'],
  },
  plot: {
    domain: 'viz',
    kind: 'feature',
    packages: ['@retikz/plot', '@retikz/plot-react', '@retikz/plot-vanilla'],
  },
  chart: {
    domain: 'viz',
    kind: 'feature',
    dependsOn: ['plot'],
    packages: ['@retikz/chart', '@retikz/chart-react', '@retikz/chart-vanilla'],
  },
  table: {
    domain: 'viz',
    kind: 'feature',
    packages: ['@retikz/table', '@retikz/table-react', '@retikz/table-vanilla'],
  },
};
