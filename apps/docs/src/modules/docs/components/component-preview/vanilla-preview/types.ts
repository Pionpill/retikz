import type { PreviewDatasetImport } from '../types';

/** 自动生成 Vanilla 预览时可用的源码上下文。 */
export type BuildVanillaPreviewOptions = {
  /** 按外部数据引用名声明可复用的数据导入。 */
  datasetImports?: Readonly<Record<string, PreviewDatasetImport>>;
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
