import type { PreviewControlsDefinition } from '../types';

/** 收集 contents 下 canonical 与本地化 controls definition 模块 */
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
): PreviewControlsDefinition | undefined => {
  if (mod === undefined) return undefined;
  if (isPreviewControlsDefinition(mod.previewControls)) return mod.previewControls;

  const namedControls = Object.entries(mod).find(
    ([key, value]) => key.endsWith('Controls') && isPreviewControlsDefinition(value),
  );
  return namedControls?.[1] as PreviewControlsDefinition | undefined;
};

/** 判断模块导出是否是声明式预览控件定义 */
const isPreviewControlsDefinition = (value: unknown): value is PreviewControlsDefinition => {
  if (typeof value !== 'object' || value === null) return false;
  const presentation = Reflect.get(value, 'presentation');
  return presentation === 'overlay' || presentation === 'panel';
};
