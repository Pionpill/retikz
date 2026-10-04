import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { translateDrawApiReference } from './draw.en';
import { embedApiReferenceMdx } from './embedded-reference';
import { createStandardApiReferenceMdx } from './standard-schema';
import type { ApiReferencePackageConfig } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const translations: Readonly<Record<string, string>> = {
  '嵌套对象与数组的展开选择；true 全部展开，false 全部显示为文本，数组选择 map / array':
    'Expansion of nested objects and arrays: true expands all, false displays text, and an array selects map/array',
  '完整的 Array Source，包含 namespace、type 及 items、data 或 skeleton':
    'Complete Array Source including namespace, type, and items, data, or skeleton',
  '输入的浅拷贝；不校验、不补默认值，嵌套对象与输入共享引用':
    'A shallow copy of the input; no validation or defaults are applied, and nested objects share references with the input',
  '由 arrayId、连字符与零基下标组成的单元格 id': 'A cell id composed of arrayId, a hyphen, and the zero-based index',
  '启用索引带时的位置、自动起点或显式标号与文本外观':
    'Position, automatic starting number or explicit labels, and text appearance of an enabled index strip',
  '索引文本的稀疏外观覆盖，不受单格样式影响': 'Sparse index text overrides, unaffected by cell-level styles',
  '文字或唯一可绘制 child，支持已注册的第三方复合组件':
    'Text or one drawable child, including registered third-party composites',
  'data、items、skeleton 与 ArrayItem children 内容入口互斥；全部省略时生成空数组。dataExpand 仅用于 data 入口':
    'The data, items, skeleton, and ArrayItem children inputs are mutually exclusive; omitting all inputs creates an empty array. dataExpand applies only to data',
  'text 与 children 互斥；同时省略表示空格，提供 children 时必须产生恰好一个图形。id 标识单元格边框区域，style 与 layout 覆盖 Array 的对应设置':
    'Text and children are mutually exclusive; omitting both leaves an empty cell, and provided children must produce exactly one drawable. id identifies the cell border box, while style and layout override the corresponding Array settings',
  'items、data 与 skeleton 三选一；dataExpand 仅用于 data 入口。其余字段沿用 IRArray，namespace 与 type 由 adapter 补齐':
    'Choose items, data, or skeleton; dataExpand applies only to data. Other fields follow IRArray, and the adapter supplies namespace and type',
  '使用显式单元格、JSON 数组或示意骨架的 Array 输入': 'Array input using explicit cells, a JSON array, or a skeleton',
  '持有原始 input 引用的 embed；内容归一与校验在后续 adapter 和编译阶段执行':
    'An embed retaining the original input reference; content normalization and validation occur during subsequent adaptation and compilation',
  可省略默认值的包络装饰: 'Envelope decoration with optional defaults',
  '非空白 Array id': 'Nonblank Array id',
  直属单元格的非负整数下标: 'Nonnegative integer index of the direct cell',
  '参数非法时抛出 RetikzStandardError': 'Throws RetikzStandardError for invalid arguments',
  'Array 的 React authoring 属性': 'React authoring props for Array',
  'Map 的 React authoring 属性；键值角色覆盖统一位于 style.key/value 与 layout.key/value':
    'React authoring props for Map; key/value overrides live in style.key/value and layout.key/value',
  'Standard Array 呈现组件': 'Standard Array presentation component',
  'Standard Map 呈现组件': 'Standard Map presentation component',
  'Array 单元格的文本或 drawable 输入，以及单格外观': 'Text or drawable input and appearance for a Array cell',
  'Array 的直属单元格声明，不单独生成图元': 'Direct cell declaration for Array; does not produce a standalone drawing',
  'Map 的一条键值记录，包含一个 MapKey 和一个 MapValue': 'One Map entry containing one MapKey and one MapValue',
  'Map 键单元格的文本或 drawable 输入': 'Text or drawable input for a Map key cell',
  'Map 值单元格的文本或 drawable 输入': 'Text or drawable input for a Map value cell',
  'Map 的直属记录声明': 'Direct entry declaration for Map',
  'MapEntry 的键槽位': 'Key slot of a MapEntry',
  'MapEntry 的值槽位': 'Value slot of a MapEntry',
  'Array 的 Vanilla authoring 输入': 'Vanilla authoring input for Array',
  'Map 的 Vanilla authoring 输入；键值角色覆盖统一位于 style.key/value 与 layout.key/value':
    'Vanilla authoring input for Map; key/value overrides live in style.key/value and layout.key/value',
  '将 Array 输入与嵌套内容交给根级 traversal': 'Pass Array input and nested content to root-level traversal',
  '将 Map 输入与嵌套内容交给根级 traversal': 'Pass Map input and nested content to root-level traversal',
  '创建 Array embed；显式 input.id 同时用作领域与 embed 身份':
    'Create a Array embed; explicit input.id identifies both the domain component and the embed',
  '创建 Map embed；显式 input.id 同时用作领域与 embed 身份':
    'Create a Map embed; explicit input.id identifies both the domain component and the embed',
  '稀疏 Array Source，保留尚未合并的样式': 'Sparse Array Source preserving unmerged styles',
  'Array 专属单格 Source，允许内容宽度模式': 'Array cell Source supporting content-based width',
  '稀疏 Map Source，展示键允许重复': 'Sparse Map Source allowing repeated display keys',
  '保留稀疏 Source 的类型化工厂': 'Typed factory preserving sparse Source',
  'Standard Array 的布局感知 Definition': 'Layout-aware Definition for Standard Array',
  'Standard Map 的布局感知 Definition': 'Layout-aware Definition for Standard Map',
  'Array 与单元格 lower target 的按需依赖声明': 'On-demand dependencies of Array and its cell lowering targets',
  'Map 与单元格 lower target 的按需依赖声明': 'On-demand dependencies of Map and its cell lowering targets',
  '字符串默认只提供 content；cellIdMode 为 string 时也提供 id':
    'A string supplies content by default and also supplies its id in string cellIdMode',
  '递归展示 JSON 数组；index 模式为直属格生成 id':
    'Render JSON arrays recursively; index mode assigns ids to direct cells',
  '返回 Array 直属格子的零基下标 id，不检查该位置是否存在':
    'Return the zero-based id of a direct Array cell without checking whether it exists',
  '直属格身份：explicit 仅显式 id，string 使用 items 字符串，index 由 Array id 与零基下标生成':
    'Direct cell identity: explicit ids only, items strings, or zero-based ids derived from the Array id',
  '递归展示 JSON 数组，不推导单元格 id': 'Render a JSON array recursively without inferring cell ids',
  '递归展示 JSON 对象，不推导单元格 id': 'Render a JSON object recursively without inferring cell ids',
  '无真实数据的示意骨架，与 data 及显式结构互斥':
    'Schematic skeleton without real data, mutually exclusive with data and explicit cells',
  显式键值单元格: 'Explicit key/value cells',
};

/** 复用公共字段翻译，缺译仍由既有生成器报错 */
const translateCollectionApiReference = (source: string): string =>
  translations[source] ?? translateDrawApiReference(source);

/** 从三个公开 collection 入口生成组件局部参考，嵌入合页 API 小节 */
export const writeStandardCollectionApiReferences = async (
  outputRoot: string,
  names: ReadonlyArray<'Array' | 'Map'> = ['Array', 'Map'],
): Promise<void> => {
  for (const name of names) {
    const slug = name.toLowerCase();
    const markers = name === 'Array' ? ['ArrayItem'] : ['MapEntry', 'MapKey', 'MapValue'];
    const owners = [
      {
        suffix: '-react',
        title: { zh: '`@retikz/standard-react`', en: '`@retikz/standard-react`' },
        symbols: [name, `${name}Props`, ...markers.flatMap(marker => [marker, `${marker}Props`])],
      },
      {
        suffix: '-vanilla',
        title: { zh: '`@retikz/standard-vanilla`', en: '`@retikz/standard-vanilla`' },
        symbols: [slug, `Input${name}`, `${name}InputEmbedAdapter`],
      },
      {
        suffix: '',
        title: { zh: '`@retikz/standard`', en: '`@retikz/standard`' },
        symbols: [
          `IR${name}`,
          ...(name === 'Array' ? ['IRArrayCell', 'IRArrayIndexOptions', 'IRArrayIndexStyle', 'getArrayCellId'] : []),
          `create${name}`,
          `${name}Definition`,
          `${name}Provider`,
        ],
      },
    ];
    const directory = path.resolve(outputRoot, slug, '_includes');
    mkdirSync(directory, { recursive: true });
    for (const lang of ['zh', 'en'] as const) {
      const sections: Array<string> = [];
      for (const owner of owners) {
        const packageDirectory = `packages/library/standard${owner.suffix}`;
        const config: ApiReferencePackageConfig = {
          packageName: `@retikz/standard${owner.suffix}/collection`,
          packageDirectory,
          tsconfigPath: path.resolve(repositoryRoot, packageDirectory, 'tsconfig.json'),
          entries: [
            {
              source: path.resolve(repositoryRoot, packageDirectory, 'src/collection/index.ts'),
              title: owner.title,
              symbols: owner.symbols,
              symbolPairs:
                owner.suffix === '-react'
                  ? [[name, `${name}Props`], ...markers.map(marker => [marker, `${marker}Props`] as [string, string])]
                  : owner.suffix === '-vanilla'
                    ? [[slug, `Input${name}`]]
                    : undefined,
              ...(name === 'Array' && owner.suffix === ''
                ? {
                    memberTypeLabels: {
                      IRArrayIndexStyle: { font: "IRArrayIndexStyle['font']" },
                    },
                  }
                : {}),
            },
          ],
          translate: translateCollectionApiReference,
        };
        const mdx = await createStandardApiReferenceMdx(config, lang);
        sections.push(embedApiReferenceMdx(mdx));
      }
      writeFileSync(
        path.resolve(directory, `generated.${lang}.mdx`),
        `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${sections.join('\n\n')}\n`,
        'utf8',
      );
    }
  }
};
