import { BlendMode, ShadowPreset } from '@retikz/core';

import type { Lang } from '@/i18n';
import type { PreviewControlContract } from '@/modules/docs/preview';
import { definePreviewControls } from '@/modules/docs/preview';

import { nodeRows } from './builtin-node.data';
import { builtinNodeI18n } from './builtin-node.i18n';

/** 按语言构建独立试验场契约 */
export const createPreviewControlContract = (lang: Lang) => {
  const i18n = builtinNodeI18n[lang];
  /** 试验场控件 */
  const builtinNodeControls = definePreviewControls({
    presentation: 'panel',
    title: i18n.title,
    defaultSize: 38,
    sections: [
      {
        label: i18n.data,
        defaultCollapsed: true,
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: i18n.rows,
            rows: nodeRows,
            columns: [{ key: 'x' }, { key: 'y' }],
          },
        ],
      },
      {
        label: i18n.geometry,
        controls: [
          {
            kind: 'range',
            id: 'cornerRadius',
            label: i18n.cornerRadius,
            defaultValue: 8,
            min: 0,
            max: 24,
            step: 1,
          },
          { kind: 'range', id: 'padding', label: i18n.padding, defaultValue: 18, min: 0, max: 36, step: 1 },
          { kind: 'range', id: 'rotate', label: i18n.rotate, defaultValue: 0, min: -30, max: 30, step: 1 },
          {
            kind: 'range',
            id: 'minimumSize',
            label: i18n.minimumSize,
            defaultValue: 36,
            min: 0,
            max: 108,
            step: 4,
          },
          { kind: 'range', id: 'scale', label: i18n.scale, defaultValue: 1, min: 0.7, max: 1.4, step: 0.1 },
        ],
      },
      {
        label: i18n.effects,
        controls: [
          {
            kind: 'select',
            id: 'shadow',
            label: i18n.shadow,
            defaultValue: ShadowPreset.Md,
            options: [
              { value: ShadowPreset.None, label: i18n.none },
              { value: ShadowPreset.Sm, label: i18n.small },
              { value: ShadowPreset.Md, label: i18n.medium },
              { value: ShadowPreset.Lg, label: i18n.large },
              { value: ShadowPreset.Xl, label: i18n.extraLarge },
            ],
          },
          {
            kind: 'select',
            id: 'blendMode',
            label: i18n.blendMode,
            defaultValue: BlendMode.Normal,
            options: [
              { value: BlendMode.Normal, label: i18n.normal },
              { value: BlendMode.Multiply, label: i18n.multiply },
              { value: BlendMode.Screen, label: i18n.screen },
              { value: BlendMode.Overlay, label: i18n.overlay },
            ],
          },
        ],
      },
    ],
  });

  /** 稳定文档契约 */
  return {
    controls: builtinNodeControls,
    canonicalValues: {
      padding: 18,
      cornerRadius: 8,
      rotate: 0,
      minimumSize: 36,
      scale: 1,
      shadow: ShadowPreset.Md,
      blendMode: BlendMode.Normal,
    },
    presetSelector: { label: i18n.preset, customLabel: i18n.custom },
    presets: [
      {
        id: 'card',
        label: i18n.rounded,
        values: {
          padding: 18,
          cornerRadius: 8,
          rotate: 0,
          minimumSize: 36,
          scale: 1,
          shadow: ShadowPreset.Md,
          blendMode: BlendMode.Normal,
        },
      },
      {
        id: 'tilted',
        label: i18n.tilted,
        values: {
          padding: 24,
          cornerRadius: 16,
          rotate: -18,
          minimumSize: 48,
          scale: 1.1,
          shadow: ShadowPreset.Xl,
          blendMode: BlendMode.Multiply,
        },
      },
    ],
    relatedApis: [
      'PointMark.padding',
      'PointMark.cornerRadius',
      'PointMark.rotate',
      'PointMark.minimumSize',
      'PointMark.scale',
      'PointMark.shadow',
      'PointMark.blendMode',
    ],
  } satisfies PreviewControlContract;
};
