import type { IRScene } from '@retikz/core';
import type { FC } from 'react';

import type { PreviewAction, SourceLang } from './types';

/**
 * 收集 contents 下全部 demo 模块 + 源码字符串
 * @description 双 glob 同 key 一一对应：default 导出当渲染组件，?raw 取源码喂底部代码段。`undefined` 显式声明，让 TS 知道存在性检查不是冗余
 */
export const demoModules: Record<
  string,
  { default: FC; previewIR?: IRScene; previewActions?: Array<PreviewAction> } | undefined
> = import.meta.glob<{
  default: FC;
  previewIR?: IRScene;
  previewActions?: Array<PreviewAction>;
}>('../../contents/**/*.demo.tsx', { eager: true });

export const demoSources: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.demo.tsx',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

export const localSourceFiles: Record<string, string | undefined> = import.meta.glob<string>(
  ['../../contents/**/*.{ts,tsx}', '!../../contents/**/*.demo.tsx'],
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

export const actionModules: Record<string, Record<string, unknown> | undefined> = import.meta.glob<
  Record<string, unknown>
>('../../contents/**/*.actions.ts', {
  eager: true,
});

/** vanilla 代码视图的手写覆盖：同级 `<name>.vanilla.ts`（命中则原文优先，否则走 IR codegen） */
export const vanillaOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.vanilla.ts',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

/** vanilla 视图的「真渲染」：同 `<name>.vanilla.ts` 导出的 `svg` 字符串。 */
export const vanillaModules: Record<string, { svg?: unknown } | undefined> = import.meta.glob(
  '../../contents/**/*.vanilla.ts',
  {
    eager: true,
  },
);

/** IR 视图的手写覆盖：同级 `<name>.ir.json`，语言无关、单文件两语共用。 */
export const irJsonOverrides: Record<string, string | undefined> = import.meta.glob<string>(
  '../../contents/**/*.ir.json',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
);

export const buildKey = (segments: Array<string>, name: string) => `../../contents/${segments.join('/')}/${name}.demo.tsx`;
export const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;
export const buildSourceFileKey = (segments: Array<string>, filename: string) =>
  `../../contents/${segments.join('/')}/${filename}`;
export const buildActionsKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.actions.ts`;
export const buildVanillaKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.vanilla.ts`;
export const buildIrJsonKey = (segments: Array<string>, name: string) =>
  `../../contents/${segments.join('/')}/${name}.ir.json`;
export const filenameFromKey = (key: string) => key.slice(key.lastIndexOf('/') + 1);

export const resolvePreviewActions = (mod: Record<string, unknown> | undefined): Array<PreviewAction> | undefined => {
  if (mod === undefined) return undefined;
  if (Array.isArray(mod.previewActions)) return mod.previewActions as Array<PreviewAction>;
  const namedActions = Object.entries(mod).find(([key, value]) => key.endsWith('Actions') && Array.isArray(value));
  return namedActions?.[1] as Array<PreviewAction> | undefined;
};

/**
 * 解析 demo key
 * @description 优先 `<name>.<lang>.demo.tsx`，找不到回退到 `<name>.demo.tsx`；含展示文本的 demo 配双语副本，纯几何 demo 单文件即可
 */
export const resolveDemoKey = (segments: Array<string>, name: string, lang: string): string => {
  const langKey = buildLangKey(segments, name, lang);
  if (demoModules[langKey] !== undefined) return langKey;
  return buildKey(segments, name);
};

/** 由文件名后缀推语法高亮语言 */
export const langOfFilename = (filename: string): SourceLang =>
  filename.endsWith('.json') ? 'json' : filename.endsWith('.tsx') ? 'tsx' : 'ts';
