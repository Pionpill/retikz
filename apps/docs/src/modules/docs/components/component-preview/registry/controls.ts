import type { PreviewControlConfig, PreviewControlSlot } from '../types';

export const controlModules: Record<string, Record<string, unknown> | undefined> = import.meta.glob<
  Record<string, unknown>
>(['../../contents/**/*.controls.ts', '../../contents/**/*.zh.controls.ts', '../../contents/**/*.en.controls.ts'], {
  base: '../',
  eager: true,
});

export const buildControlsKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.controls.ts`;

/** 构建带语言后缀的 controls registry key。 */
export const buildLangControlsKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.controls.ts`;

/** 优先解析语言化 controls，缺失时回退到语言无关文件。 */
export const resolveControlsKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangControlsKey(segments, name, lang);
  return controlModules[langKey] !== undefined ? langKey : buildControlsKey(segments, name);
};

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
