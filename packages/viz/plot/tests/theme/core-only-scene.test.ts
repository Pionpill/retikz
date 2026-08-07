import type { IRScene } from '@retikz/core';

import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { PlotThemeTokenDefinition } from '../../src';

const coreOnlyScene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'node',
      id: 'core-only-node',
      position: [12, 18],
      shape: 'circle',
      minimumSize: 8,
      fill: '#123456',
    },
  ],
};

describe('Plot definition isolation from Core-only scenes', () => {
  it('Core-only Scene output is identical with or without the Plot definition', () => {
    const withoutPlotDefinition = compileToScene(coreOnlyScene).scene;
    const withPlotDefinition = compileToScene(coreOnlyScene, {
      themeTokenDefinitions: [PlotThemeTokenDefinition],
    }).scene;

    expect(withPlotDefinition).toEqual(withoutPlotDefinition);
  });
});
