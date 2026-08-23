import type { IRScene, TextMeasurer } from '@retikz/core';

import type { PreviewDatasetImport } from '../types';

/** 自动生成 Vanilla 预览时可用的源码上下文。 */
export type BuildVanillaPreviewOptions = {
  /** 自动 SVG 预览使用的文字度量器；缺省由 Core 使用确定性的估算器 */
  measureText?: TextMeasurer;
  /** 按外部数据引用名声明可复用的数据导入。 */
  datasetImports?: Readonly<Record<string, PreviewDatasetImport>>;
  /** ComponentPreview 全局 ambient Theme，仅作用于动态生成的 SVG */
  theme?: IRScene['theme'];
  /** 动态 SVG 使用的宿主文本度量；浏览器预览缺省读取当前页面字体 */
  measureText?: TextMeasurer;
};

/** ComponentPreview 自动生成的 Vanilla 源码与真实 SVG。 */
export type VanillaPreviewArtifact = {
  /** 可复制的 Vanilla 作者代码。 */
  code: string;
  /** Vanilla runtime 生成的 SVG；转换失败时省略。 */
  svg?: string;
  /** 是否用 Vanilla SVG 替换可见 demo；缺省替换。 @default true */
  replacePreviewRender?: boolean;
};
