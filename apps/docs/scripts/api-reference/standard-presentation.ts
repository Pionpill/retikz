import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { translateDrawApiReference } from './draw.en';
import { translateNodeApiReference } from './node.en';
import { createApiReferenceMdx } from './tex';
import type { ApiReferencePackageConfig } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const pages = {
  Surface: {
    react: ['Surface', 'SurfaceProps'],
    vanilla: ['surface', 'InputSurface', 'surfaceChild', 'InputSurfaceChild', 'SurfaceInputEmbedAdapter'],
    core: ['SurfaceInput', 'IRSurface', 'createSurface', 'SurfaceDefinition', 'SurfaceProvider'],
  },
  Frame: {
    react: ['Frame', 'FrameProps', 'FrameTitle', 'FrameTitleProps', 'FrameDescription', 'FrameDescriptionProps'],
    vanilla: ['frame', 'InputFrame', 'frameTitle', 'frameDescription', 'FrameInputEmbedAdapter'],
    core: [
      'FrameInput',
      'FrameTitleInput',
      'FrameDescriptionInput',
      'IRFrame',
      'createFrame',
      'FrameDefinition',
      'FrameProvider',
    ],
  },
  Axes: {
    react: ['Axes', 'AxesProps'],
    vanilla: ['axes', 'AxesInputEmbedAdapter'],
    core: ['AxesInput', 'IRAxes', 'createAxes', 'AxesDefinition', 'AxesProvider'],
  },
  Grid: {
    react: ['Grid', 'GridProps'],
    vanilla: ['grid', 'GridInputEmbedAdapter'],
    core: ['GridInput', 'GridLineInput', 'IRGrid', 'createGrid', 'GridDefinition', 'GridProvider'],
  },
} as const;

const translations: Readonly<Partial<Record<string, string>>> = {
  'Standard Surface 的官方 Core layout-aware composite definition':
    'Official layout-aware Core composite definition for Standard Surface',
  '恰好一个可转换为 Core IR 的 Kernel、Sugar 或 Tier 2 child':
    'Exactly one Kernel, Sugar, or Tier 2 child convertible to Core IR',
  'Surface 唯一 child 的作者侧输入': 'Authoring input for the single Surface child',
  'Surface 输入可显式指定持久化 Scope id': 'Surface input with an optional persistent Scope id',
  '要持久化到 Surface IR 的显式身份': 'Explicit identity to persist in Surface IR',
  '唯一 child 与其可选 Tier 2 依赖': 'The single child and its optional Tier 2 dependencies',
  '创建由 Surface adapter 在根 Scene traversal 中归一化的唯一 child 输入':
    'Create input for the single child normalized by the Surface adapter during root Scene traversal',
  'Surface 的公开 authoring 输入': 'Public Surface authoring input',
  '稀疏持久化 Standard Surface composite': 'Sparse persistent Standard Surface composite',
  '创建稀疏 Standard Surface composite': 'Create a sparse Standard Surface composite',
  'FrameTitle、FrameDescription 与参与 body bounds 的 Core Node children':
    'FrameTitle, FrameDescription, and Core Node children contributing to the body bounds',
  'Frame 主标题接受的 JSON-safe Node authoring 字段': 'JSON-safe Node authoring fields for the Frame title',
  'Frame 辅助说明接受的 JSON-safe Node authoring 字段': 'JSON-safe Node authoring fields for the Frame description',
  '声明 Frame 的 Node-like 主标题，只能作为 Frame 的直接 child':
    'Declare a Node-like Frame title as a direct Frame child',
  '声明 Frame 的 Node-like 辅助说明，只能作为 Frame 的直接 child':
    'Declare a Node-like Frame description as a direct Frame child',
  'Vanilla Frame 输入可显式指定持久化 Scope id': 'Vanilla Frame input with an optional persistent Scope id',
  '要持久化到 Frame IR 的显式身份': 'Explicit identity to persist in Frame IR',
  '在根 Scene traversal 中归一化的 Frame body children': 'Frame body children normalized during root Scene traversal',
  'React marker 提供、等待同次 traversal 归一化的 header 输入':
    'Header input supplied by React markers and normalized in the same traversal',
  '创建 JSON-safe 的 Frame 主标题输入': 'Create JSON-safe Frame title input',
  '创建 JSON-safe 的 Frame 辅助说明输入': 'Create JSON-safe Frame description input',
  '创建 Frame 时允许省略固定 discriminator 与 schema 默认字段的输入':
    'Frame input allowing fixed discriminators and schema defaults to be omitted',
  '创建 Frame 主标题时接受的输入': 'Input for creating a Frame title',
  '创建 Frame 辅助说明时接受的输入': 'Input for creating a Frame description',
  '创建稀疏持久化的 Standard Frame composite': 'Create a sparse persistent Standard Frame composite',
};

/** Node 与 Path 的继承字段复用各自的人工译文 */
const translateSharedApiReference = (source: string): string => {
  if (translations[source] !== undefined) return translations[source];
  try {
    return translateDrawApiReference(source);
  } catch {
    return translateNodeApiReference(source);
  }
};

/** 公开声明的英文文案；通用字段沿用已有翻译，缺译由生成器拒绝 */
const translatePresentationApiReference = (source: string): string =>
  translations[source] ??
  translateSharedApiReference(
    source
      .replace('可省略默认值的包络装饰', 'Envelope decoration with optional defaults')
      .replace(/React (\w+) 组件接受的 Standard authoring 输入/g, 'Standard authoring input accepted by React $1')
      .replace(/Standard (\w+) 的 React Tier 2 authoring 组件/g, 'React Tier 2 authoring component for Standard $1')
      .replace(/Standard (\w+) 的 InputEmbed adapter/g, 'InputEmbed adapter for Standard $1')
      .replace(
        /创建由 (\w+)InputEmbedAdapter 下沉的 Standard (\w+) embed/g,
        'Create a Standard $2 embed lowered by $1InputEmbedAdapter',
      )
      .replace(/组装持久化的 Standard (\w+) composite/g, 'Assemble a persistent Standard $1 composite')
      .replace(/持久化的 Standard (\w+) composite/g, 'Persistent Standard $1 composite')
      .replace(
        /创建 (\w+) 时允许省略固定 discriminator 的输入/g,
        'Input for creating $1 with fixed discriminators omitted',
      )
      .replace(/Standard (\w+) 的官方 Core composite definition/g, 'Official Core composite definition for Standard $1')
      .replace(/(\w+) 的 Core Composite dependency provider/g, 'Core composite dependency provider for $1')
      .replace('单个 Grid 方向的线条输入配置', 'Line configuration for one Grid direction'),
  );

/** 按组件合页生成呈现家族的三个公开入口 */
export const writeStandardPresentationApiReferences = async (
  outputRoot: string,
  names: ReadonlyArray<keyof typeof pages> = Object.keys(pages) as Array<keyof typeof pages>,
): Promise<void> => {
  for (const name of names) {
    const page = pages[name];
    const owners = [
      { suffix: '-react', symbols: page.react },
      { suffix: '-vanilla', symbols: page.vanilla },
      { suffix: '', symbols: page.core },
    ];
    const directory = path.resolve(outputRoot, name.toLowerCase(), '_includes');
    mkdirSync(directory, { recursive: true });
    for (const lang of ['zh', 'en'] as const) {
      const sections: Array<string> = [];
      for (const owner of owners) {
        const packageName = `@retikz/standard${owner.suffix}`;
        const packageDirectory = `packages/library/standard${owner.suffix}`;
        const config: ApiReferencePackageConfig = {
          packageName: `${packageName}/presentation`,
          packageDirectory,
          tsconfigPath: path.resolve(repositoryRoot, packageDirectory, 'tsconfig.json'),
          translate: translatePresentationApiReference,
          entries: [
            {
              source: path.resolve(repositoryRoot, packageDirectory, 'src/presentation/index.ts'),
              title: { zh: `\`${packageName}\``, en: `\`${packageName}\`` },
              symbols: owner.symbols,
              declarationOnlySymbols: [`${name}Definition`, `${name}Provider`, `${name}InputEmbedAdapter`],
              ...(owner.suffix === '-react'
                ? {
                    symbolPairs: owner.symbols
                      .filter(symbol => !symbol.endsWith('Props'))
                      .map(symbol => [symbol, `${symbol}Props`] as const),
                  }
                : {}),
            },
          ],
        };
        sections.push((await createApiReferenceMdx(config, lang)).replace(/^(#{2,4}) /gm, '#$1 '));
      }
      writeFileSync(
        path.resolve(directory, `generated.${lang}.mdx`),
        `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${sections.join('\n\n')}\n`,
        'utf8',
      );
    }
  }
};
