import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import { defineThemeStyle, ThemeMode } from '@retikz/core';
import {
  createEntity,
  createGraph,
  createGraphDefinitions,
  defineEntityRole,
  defineGraphThemeStyle,
  getDefaultGraphThemePreset,
  GraphThemeToken,
} from '@retikz/graph';
import { Layout } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  entityThemeSelectorControls,
  EntityThemeSelectorControlId,
  previewControlContract,
} from './entity-theme-selector.en.controls';

const serviceRole = defineEntityRole({ role: 'service', shape: 'rectangle', padding: { x: 12, y: 8 } });

const brandCoreTheme = defineThemeStyle({
  name: 'brand',
  resolve: ({ mode }) => ({
    semantic: {
      error: mode === ThemeMode.Light ? '#dc2626' : '#fca5a5',
      success: mode === ThemeMode.Light ? '#16a34a' : '#86efac',
      warning: mode === ThemeMode.Light ? '#ca8a04' : '#fde047',
    },
    categorical: ['#2563eb'],
  }),
});

const brandGraphTheme = defineGraphThemeStyle({
  name: 'brand',
  resolve: theme => ({
    tokens: {
      ...getDefaultGraphThemePreset(theme),
      [GraphThemeToken.EntityStrokeOpacity]: theme.mode === ThemeMode.Light ? 0.7 : 0.9,
    },
    tokenRules: [
      {
        select: { variant: 'mixed' },
        tokens: {
          [GraphThemeToken.EntityFillOpacity]: theme.mode === ThemeMode.Light ? 0.2 : 0.3,
        },
      },
    ],
  }),
});

const createScene = (values: typeof previewControlContract.canonicalValues): IRScene => ({
  version: 1,
  type: 'scene',
  theme: { style: 'brand' },
  children: [
    createGraph({
      id: 'selector-map',
      entityVariant: 'mixed',
      graphThemeTokens: {
        [GraphThemeToken.EntityColor]: values[EntityThemeSelectorControlId.Color],
        [GraphThemeToken.EntityStrokeWidth]: values[EntityThemeSelectorControlId.StrokeWidth],
        [GraphThemeToken.EntityOpacity]: values[EntityThemeSelectorControlId.Opacity],
      },
      graphThemeTokenRules: [
        {
          select: { role: values[EntityThemeSelectorControlId.TargetRole], variant: 'mixed' },
          tokens: {
            [GraphThemeToken.EntityTextForeground]: '#1e3a8a',
            [GraphThemeToken.EntityStroke]: '#2563eb',
            [GraphThemeToken.EntityFill]: '#dbeafe',
          },
        },
      ],
      children: [
        createEntity({ id: 'service', role: 'service', position: [-80, 0], text: 'Service' }),
        createEntity({ id: 'stage', role: 'stage', position: [80, 0], text: 'Stage' }),
      ],
    }),
  ],
});

const options = { entityRoles: [serviceRole], graphThemeStyles: [brandGraphTheme] };

export const previewControls = entityThemeSelectorControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout
    ir={createScene(values)}
    composites={createGraphDefinitions(options)}
    themeStyles={[brandCoreTheme]}
    width={520}
    height={150}
    viewBox={{ x: -180, y: -58, width: 360, height: 116 }}
  />
));

export const previewSource = controlledPreview.source;

/** Graph Theme selectors override tokens by effective role and variant */
const Demo: FC = controlledPreview.Component;

export default Demo;
