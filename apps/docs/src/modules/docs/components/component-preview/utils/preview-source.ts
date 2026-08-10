import type { ComponentPreviewFileConfig, ComponentSourceFile } from '../types';

import { buildSourceFileKey, filenameFromKey, langOfFilename, resolveSourceBaselineFilename } from '../registry';
import { computeUnifiedDiff } from './diff';

/** 构建 React 源码视图文件列表。 */
export type BuildReactSourceFilesInput = {
  key: string;
  name: string;
  segments: Array<string>;
  rawSource: string;
  sourceFiles: Array<ComponentPreviewFileConfig>;
  diffFrom?: string;
  baselineRawSource?: string;
  sourceContents: Readonly<Record<string, string | undefined>>;
  hideCode: boolean;
};

/** 构建 React 源码视图文件列表。 */
export const buildReactSourceFiles = (input: BuildReactSourceFilesInput): Array<ComponentSourceFile> => {
  const { key, name, segments, rawSource, sourceFiles, diffFrom, baselineRawSource, sourceContents, hideCode } = input;
  const trimmedSource = rawSource.replace(/\n$/, '');
  const reactDiff =
    !hideCode && baselineRawSource !== undefined
      ? computeUnifiedDiff(baselineRawSource.replace(/\n$/, ''), trimmedSource)
      : undefined;
  const extraSourceFiles: Array<ComponentSourceFile> = sourceFiles.map(entry => {
    const filename = entry.file;
    const rawSourceFile = sourceContents[buildSourceFileKey(segments, filename)];
    const code = rawSourceFile?.replace(/\n$/, '') ?? `// Source file not found: ${filename}`;
    const baselineFilename = resolveSourceBaselineFilename(entry, name, diffFrom);
    if (baselineFilename === undefined) return { filename, code, lang: langOfFilename(filename) };
    const baselineRaw = sourceContents[buildSourceFileKey(segments, baselineFilename)];
    const diff =
      !hideCode && rawSourceFile !== undefined && baselineRaw !== undefined
        ? computeUnifiedDiff(baselineRaw.replace(/\n$/, ''), code)
        : undefined;
    return { filename, code, lang: langOfFilename(filename), diff };
  });
  const mainFilename = filenameFromKey(key);
  return [
    { filename: mainFilename, code: trimmedSource, lang: langOfFilename(mainFilename), diff: reactDiff, isMain: true },
    ...extraSourceFiles,
  ];
};
