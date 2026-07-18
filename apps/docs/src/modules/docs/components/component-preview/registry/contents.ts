import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import type {
  PreviewControlConfig,
  PreviewControlContract,
  PreviewControlSlot,
  PreviewSourceConfig,
  SourceLang,
} from '../types';

/**
 * 收集 contents 下全部 demo 模块与源码字符串。
 * @description 只在 component-preview 内部用于 demo、source、IR、vanilla 解析，不属于顶层公共 API。
 */
export const demoModules: Record<
  string,
  | {
      default: FC;
      previewIR?: IRScene;
      previewControlContract?: PreviewControlContract;
      previewControls?: Array<PreviewControlConfig | PreviewControlSlot>;
      previewSource?: PreviewSourceConfig;
    }
  | undefined
> = import.meta.glob<{
  default: FC;
  previewIR?: IRScene;
  previewControlContract?: PreviewControlContract;
  previewControls?: Array<PreviewControlConfig | PreviewControlSlot>;
  previewSource?: PreviewSourceConfig;
}>('../../contents/**/*.demo.tsx', { base: '../', eager: true });

export const demoSources: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.demo.tsx',
  {
    base: '../',
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

export const localSourceFiles: Record<string, string | undefined> = import.meta.glob<string>(
  ['../../contents/**/*.{ts,tsx}', '!../../contents/**/*.demo.tsx'],
  {
    base: '../',
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

/** vanilla 代码视图的手写覆盖：同级 `<name>.vanilla.ts`，命中则原文优先，否则走 IR codegen。 */
export const vanillaOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.vanilla.ts',
  {
    base: '../',
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

/** vanilla 视图的真渲染模块：同级 `<name>.vanilla.ts` 导出的 `svg` 字符串。 */
export const vanillaModules: Record<string, { svg?: unknown } | undefined> = import.meta.glob(
  '../../contents/**/*.vanilla.ts',
  {
    base: '../',
    eager: true,
  },
);

/** IR 视图的手写覆盖：同级 `<name>.ir.json`，语言无关，单文件两语共用。 */
export const irJsonOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.ir.json',
  {
    base: '../',
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

export const buildKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.demo.tsx`;
export const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;
export const buildSourceFileKey = (segments: Array<string>, filename: string) =>
  `../../contents/${segments.join('/')}/${filename}`;
export const buildVanillaKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.vanilla.ts`;
export const buildIrJsonKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.ir.json`;
export const filenameFromKey = (key: string) => key.slice(key.lastIndexOf('/') + 1);

/**
 * 解析 demo key。
 * @description 优先 `<name>.<lang>.demo.tsx`，找不到回退到 `<name>.demo.tsx`；含展示文本的 demo 配双语副本，纯几何 demo 单文件即可。
 */
export const resolveDemoKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangKey(segments, name, lang);
  if (demoModules[langKey] !== undefined) return langKey;
  return buildKey(segments, name);
};

/** 由文件名后缀推断语法高亮语言。 */
export const langOfFilename = (filename: string): SourceLang =>
  filename.endsWith('.json') ? 'json' : filename.endsWith('.tsx') ? 'tsx' : 'ts';
