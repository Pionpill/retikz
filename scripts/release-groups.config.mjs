export const releaseGroups = {
  standard: {
    domain: 'library',
    kind: 'feature',
    packages: ['@retikz/standard', '@retikz/standard-react', '@retikz/standard-vanilla'],
  },
  kernel: {
    domain: 'kernel',
    kind: 'foundation',
    packages: [
      '@retikz/math',
      '@retikz/runtime',
      '@retikz/core',
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
  table: {
    domain: 'viz',
    kind: 'feature',
    packages: ['@retikz/table', '@retikz/table-react', '@retikz/table-vanilla'],
  },
};
