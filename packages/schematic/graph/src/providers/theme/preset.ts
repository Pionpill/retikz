import type { ResolvedTheme } from '@retikz/core';

import { ThemeMode } from '@retikz/core';

import type { GraphThemeStyleResolution } from '../../contract';

import { GraphStatus, GraphType } from '../../shared';

/** 从当前 Core Theme 建立 Graph Entity 与 Relation 的中立完整 baseline */
export const getDefaultGraphThemePreset = (theme: ResolvedTheme): GraphThemeStyleResolution => {
  const foreground = theme.mode === ThemeMode.Light ? '#000000' : '#ffffff';
  return {
    entity: {
      tokens: {
        color: foreground,
        textColor: 'contrast',
        fill: 0.08,
        stroke: 1,
        strokeWidth: 1,
        fillOpacity: 1,
        strokeOpacity: 1,
        opacity: 1,
      },
      rules: [
        {
          type: GraphType.Entity,
          selector: { status: GraphStatus.Error },
          appearance: { color: theme.colors.semantic.error },
        },
        {
          type: GraphType.Entity,
          selector: { status: GraphStatus.Success },
          appearance: { color: theme.colors.semantic.success },
        },
        {
          type: GraphType.Entity,
          selector: { status: GraphStatus.Warning },
          appearance: { color: theme.colors.semantic.warning },
        },
        {
          type: GraphType.Entity,
          selector: { status: GraphStatus.Disabled },
          appearance: { color: theme.colors.semantic.guide },
        },
      ],
    },
    relation: {
      tokens: {
        color: foreground,
        stroke: 'currentColor',
        strokeWidth: 1,
        strokeOpacity: 1,
        opacity: 1,
        labelTextForeground: 'gray',
        labelFont: { size: 'sm' },
        labelOpacity: 1,
      },
      rules: [
        {
          type: GraphType.Relation,
          selector: { status: GraphStatus.Error },
          appearance: {
            color: theme.colors.semantic.error,
            sourceMarker: { color: theme.colors.semantic.error },
            targetMarker: { color: theme.colors.semantic.error },
          },
        },
        {
          type: GraphType.Relation,
          selector: { status: GraphStatus.Success },
          appearance: {
            color: theme.colors.semantic.success,
            sourceMarker: { color: theme.colors.semantic.success },
            targetMarker: { color: theme.colors.semantic.success },
          },
        },
        {
          type: GraphType.Relation,
          selector: { status: GraphStatus.Warning },
          appearance: {
            color: theme.colors.semantic.warning,
            sourceMarker: { color: theme.colors.semantic.warning },
            targetMarker: { color: theme.colors.semantic.warning },
          },
        },
        {
          type: GraphType.Relation,
          selector: { status: GraphStatus.Disabled },
          appearance: {
            color: theme.colors.semantic.guide,
            sourceMarker: { color: theme.colors.semantic.guide },
            targetMarker: { color: theme.colors.semantic.guide },
          },
        },
      ],
    },
    group: {
      tokens: {
        background: { fill: 'lightgray', fillOpacity: 0.04 },
        border: { stroke: 'lightgray', strokeWidth: 1, dashPattern: [4, 3] },
        cornerRadius: 4,
      },
    },
    block: {
      tokens: {
        background: { fill: 'none' },
        border: { stroke: 'currentColor', strokeWidth: 1, strokeOpacity: 0.2 },
        cornerRadius: 8,
      },
    },
  };
};
