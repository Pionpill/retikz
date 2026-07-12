import type { ComponentPreviewFile, ComponentPreviewFileConfig, ComponentPreviewFiles } from '../types';

/** ComponentPreview 内部统一消费的文件配置。 */
export type NormalizedComponentPreviewFiles = {
  /** 主 demo id。 */
  name: string;
  /** 主 demo 的 diff baseline。 */
  diffFrom?: string;
  /** 附加源码文件。 */
  sourceFiles: Array<ComponentPreviewFileConfig>;
};

/** 判断规范化输入是否为包含主文件的非空文件列表。 */
const isComponentPreviewFileList = (
  files: ComponentPreviewFiles,
): files is readonly [ComponentPreviewFile, ...Array<ComponentPreviewFile>] => Array.isArray(files);

/** 将单个文件输入规范化为对象配置。 */
const normalizeComponentPreviewFile = (file: ComponentPreviewFile): ComponentPreviewFileConfig =>
  typeof file === 'string' ? { file } : file;

/** 将 ComponentPreview 的公开 files 输入规范化为内部文件配置。 */
export const normalizeComponentPreviewFiles = (files: ComponentPreviewFiles): NormalizedComponentPreviewFiles => {
  if (!isComponentPreviewFileList(files)) {
    const mainFile = normalizeComponentPreviewFile(files);
    return {
      name: mainFile.file,
      ...(mainFile.diffFrom !== undefined ? { diffFrom: mainFile.diffFrom } : {}),
      sourceFiles: [],
    };
  }

  const [mainFileInput, ...sourceFileInputs] = files;
  const mainFile = normalizeComponentPreviewFile(mainFileInput);
  return {
    name: mainFile.file,
    ...(mainFile.diffFrom !== undefined ? { diffFrom: mainFile.diffFrom } : {}),
    sourceFiles: sourceFileInputs.map(normalizeComponentPreviewFile),
  };
};
