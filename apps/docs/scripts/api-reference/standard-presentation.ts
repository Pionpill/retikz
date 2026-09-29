import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { standardSchemaLocalizations } from '../../src/modules/docs/components/mdx-content/zod-schema/standard-schema-localizations';
import { translateDrawApiReference } from './draw.en';
import { embedApiReferenceMdx } from './embedded-reference';
import { translateNodeApiReference } from './node.en';
import { createStandardApiReferenceMdx } from './standard-schema';
import type { ApiReferencePackageConfig } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const pages = {
  Legend: {
    react: [
      'Legend',
      'LegendProps',
      'LegendTitle',
      'LegendTitleProps',
      'LegendItem',
      'LegendItemProps',
      'LegendRamp',
      'LegendRampProps',
      'LegendTick',
      'LegendTickProps',
    ],
    vanilla: ['legend', 'InputLegend', 'LegendInputEmbedAdapter'],
    core: [
      'LegendInput',
      'IRLegend',
      'IRLegendItem',
      'IRLegendItemsContent',
      'IRLegendTick',
      'IRLegendRampContent',
      'createLegend',
      'LegendDefinition',
      'LegendProvider',
      'LegendArtifact',
      'LegendCompileArtifact',
    ],
  },
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
  'Frame 正文使用 Core Node Source，保留可省略的位置': 'Frame body uses Core Node Source with optional positions',
  'Standard Legend 的 React Tier 2 无头 authoring 组件':
    'React Tier 2 headless authoring component for Standard Legend',
  'React Legend 的两个显式无头 authoring form': 'Two explicit headless React Legend authoring forms',
  'Standard Legend 标题 marker 的属性': 'Props of the Standard Legend title marker',
  'Standard Legend 离散条目 marker 的属性': 'Props of the Standard Legend item marker',
  'Standard Legend 连续样本 marker 的属性': 'Props of the Standard Legend ramp marker',
  'Standard Legend 连续刻度 marker 的属性': 'Props of the Standard Legend tick marker',
  '声明 Legend 标题，只能作为 Legend 的直接 child': 'Declare a title as a direct Legend child',
  '声明 Legend 离散条目，只能作为 items Legend 的直接 child': 'Declare a discrete entry as a direct items Legend child',
  '声明 Legend 连续样本，只能作为 ramp Legend 的直接 child':
    'Declare a continuous sample as a direct ramp Legend child',
  '声明 Legend 连续刻度，只能作为 ramp Legend 的直接 child': 'Declare a continuous tick as a direct ramp Legend child',
  '转换为唯一标题 IRChild 的 React element': 'React element converted to exactly one title IRChild',
  'Legend 内稳定且唯一的条目标识': 'Stable item identity unique within this Legend',
  '转换为唯一视觉样本 IRChild 的 React element': 'React element converted to exactly one visual sample IRChild',
  '转换为可选标签 IRChild 的 React element': 'React element converted to an optional label IRChild',
  '转换为唯一连续视觉样本 IRChild 的 React element': 'React element converted to exactly one continuous sample IRChild',
  'Legend 内稳定且唯一的刻度标识': 'Stable tick identity unique within this Legend',
  沿连续样本主轴的归一化位置: 'Normalized position along the continuous sample main axis',
  '转换为可选刻度标签 IRChild 的 React element': 'React element converted to an optional tick-label IRChild',
  'Standard Legend 的 framework-neutral authoring 输入': 'Framework-neutral Standard Legend authoring input',
  '创建 Legend 时允许省略固定 discriminator 与 schema 默认字段的输入':
    'Legend input allowing fixed discriminators and schema defaults to be omitted',
  '创建稀疏持久化的 Standard Legend composite': 'Create a sparse persistent Standard Legend composite',
  'Standard Legend 的官方 Core layout-aware composite definition':
    'Official layout-aware Core composite definition for Standard Legend',
  'Standard Legend 的 typed artifact': 'Typed artifact of Standard Legend',
  'Legend definition 推导出的公开 compile artifact envelope':
    'Public compile artifact envelope derived from the Legend definition',
  '持久化的 Legend 离散条目': 'Persistent discrete Legend item',
  '持久化的 Legend 离散内容': 'Persistent discrete Legend content',
  '持久化的 Legend 连续刻度': 'Persistent continuous Legend tick',
  '持久化的 Legend 连续样本内容': 'Persistent continuous Legend sample content',
  '显式选择离散条目 form': 'Explicitly select the discrete-items form',
  'LegendTitle 与按声明顺序排列的 LegendItem marker': 'LegendTitle and LegendItem markers in authored order',
  '显式选择连续样本 form': 'Explicitly select the continuous-ramp form',
  'LegendTitle、唯一 LegendRamp 与按声明顺序排列的 LegendTick marker':
    'LegendTitle, exactly one LegendRamp, and LegendTick markers in authored order',
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
          schemaLocalizations: standardSchemaLocalizations,
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
        sections.push(embedApiReferenceMdx(await createStandardApiReferenceMdx(config, lang)));
      }
      writeFileSync(
        path.resolve(directory, `generated.${lang}.mdx`),
        `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${sections.join('\n\n')}\n`,
        'utf8',
      );
    }
  }
};
