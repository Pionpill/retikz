import { ThemeMode } from '@retikz/core';
import { renderToSvgString, scene } from '@retikz/vanilla';

import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

import { themeCardComposite } from './theme-card';

const input = scene({
  viewBox: { x: -120, y: -70, width: 240, height: 140 },
  theme: { style: 'academic', mode: ThemeMode.Light },
  children: [{ namespace: 'theme-demo', type: 'card', label: 'Composite' }],
});

export const svg = renderToSvgString(input, {
  output: { width: 240, height: 140 },
  compile: {
    composites: [themeCardComposite],
    measureText: browserMeasurer,
    themeStyles: PreviewThemeDefinitionBundle.core,
  },
});
