import type { PreviewControlContract } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Stable control ids for the Graph Theme selector */
export const EntityThemeSelectorControlId = {
  Color: 'color',
  StrokeWidth: 'strokeWidth',
  Opacity: 'opacity',
  TargetRole: 'targetRole',
} as const;

/** English controls for global Graph Theme tokens */
export const entityThemeSelectorControls = definePreviewControls({
  presentation: 'panel',
  title: 'Theme tokens',
  sections: [
    {
      label: 'Global tokens',
      controls: [
        {
          kind: 'color',
          id: EntityThemeSelectorControlId.Color,
          label: 'Primary color',
          defaultValue: '#000000',
        },
        {
          kind: 'range',
          id: EntityThemeSelectorControlId.StrokeWidth,
          label: 'Stroke width',
          defaultValue: 2,
          min: 1,
          max: 4,
          step: 0.5,
        },
        {
          kind: 'range',
          id: EntityThemeSelectorControlId.Opacity,
          label: 'Overall opacity',
          defaultValue: 1,
          min: 0.4,
          max: 1,
          step: 0.1,
        },
      ],
    },
    {
      label: 'Individual entity',
      controls: [
        {
          kind: 'select',
          id: EntityThemeSelectorControlId.TargetRole,
          label: 'Target Entity',
          defaultValue: 'service',
          options: [
            { value: 'service', label: 'Service' },
            { value: 'stage', label: 'Stage' },
          ],
        },
      ],
    },
  ],
});

/** Stable documentation contract for the Graph Theme selector */
export const previewControlContract = {
  controls: entityThemeSelectorControls,
  canonicalValues: {
    [EntityThemeSelectorControlId.Color]: '#000000',
    [EntityThemeSelectorControlId.StrokeWidth]: 2,
    [EntityThemeSelectorControlId.Opacity]: 1,
    [EntityThemeSelectorControlId.TargetRole]: 'service',
  },
  relatedApis: ['GraphThemeToken', 'Graph.graphThemeTokens', 'Graph.graphThemeTokenRules'],
} satisfies PreviewControlContract;
