import type { PreviewControlConfig, PreviewControlSlot } from './types';

export const controlModules: Record<string, Record<string, unknown> | undefined> = import.meta.glob<
  Record<string, unknown>
>('../../contents/**/*.controls.ts', {
  eager: true,
});

export const buildControlsKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.controls.ts`;

export const resolvePreviewControls = (
  mod: Record<string, unknown> | undefined,
): Array<PreviewControlConfig | PreviewControlSlot> | undefined => {
  if (mod === undefined) return undefined;
  if (Array.isArray(mod.previewControls)) {
    return mod.previewControls as Array<PreviewControlConfig | PreviewControlSlot>;
  }
  const namedControls = Object.entries(mod).find(([key, value]) => key.endsWith('Controls') && Array.isArray(value));
  return namedControls?.[1] as Array<PreviewControlConfig | PreviewControlSlot> | undefined;
};
