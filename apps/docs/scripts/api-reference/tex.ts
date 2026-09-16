import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { JSONOutput } from 'typedoc';
import { Application, normalizePath, OptionDefaults, ReflectionKind } from 'typedoc';

import { translateTexApiReference } from './tex.en';

const docsRoot = path.resolve(import.meta.dirname, '../..');
const repositoryRoot = path.resolve(docsRoot, '../..');
export type ApiReferenceLanguage = 'zh' | 'en';

export type ApiReferenceEntry = {
  source: string;
  /** 组件参考按公开标识符筛选；省略时收录入口全部导出 */
  symbols?: ReadonlyArray<string>;
  /** 展开所选交叉类型中直接声明的字段，引用契约仍保留在签名中 */
  expandIntersectionMembers?: boolean;
  title: Record<ApiReferenceLanguage, string>;
};

export type ApiReferencePackageConfig = {
  packageName: string;
  packageDirectory: string;
  tsconfigPath: string;
  entries: ReadonlyArray<ApiReferenceEntry>;
  translate: (source: string) => string;
  /** schema 符号只保留摘要并链接到字段真源 */
  schemaReferences?: Readonly<Record<string, string>>;
};

type ApiReferenceMember = {
  name: string;
  optional: boolean;
  type: string;
  description: string;
  defaultValue: string;
};

type ApiReferenceParameter = {
  name: string;
  type: string;
  description: string;
};

type ApiReferenceTypeParameter = {
  name: string;
  description: string;
};

type ApiReferenceSource = {
  path: string;
  startLine: number;
};

type ApiReferenceSymbol = {
  name: string;
  description: string;
  details: string;
  remarks: string;
  examples: Array<string>;
  parameters: Array<ApiReferenceParameter>;
  typeParameters: Array<ApiReferenceTypeParameter>;
  returns: string;
  throws: Array<string>;
  deprecated: string;
  since: string;
  see: Array<string>;
  signature: string;
  members: Array<ApiReferenceMember>;
  source?: ApiReferenceSource;
};

/** TypeDoc 的 glob 入口在 Windows 上也必须使用 POSIX 分隔符 */
const toPosixPath = (value: string): string => value.replaceAll(path.sep, '/');

const texPackageRoot = path.resolve(repositoryRoot, 'packages/kernel/tex');

const texEntries: Array<ApiReferenceEntry> = [
  {
    title: { zh: '`@retikz/tex`', en: '`@retikz/tex`' },
    source: path.resolve(texPackageRoot, 'src/index.ts'),
  },
  {
    title: { zh: '`@retikz/tex/react`', en: '`@retikz/tex/react`' },
    source: path.resolve(texPackageRoot, 'src/react/index.ts'),
  },
];

const texApiReferenceConfig: ApiReferencePackageConfig = {
  packageName: '@retikz/tex',
  packageDirectory: 'packages/kernel/tex',
  tsconfigPath: path.resolve(texPackageRoot, 'tsconfig.json'),
  entries: texEntries,
  translate: translateTexApiReference,
};

/** 把 TypeDoc 的注释片段还原为简洁可读的 Markdown */
const renderComment = (comment: JSONOutput.Comment | undefined): string =>
  comment?.summary
    .map(part => part.text)
    .join('')
    .trim() ?? '';

/** 读取 TypeDoc 注释中同名 block tag 的文本内容 */
const renderBlockTags = (comments: Array<JSONOutput.Comment | undefined>, tag: string): Array<string> =>
  comments.flatMap(
    comment =>
      comment?.blockTags
        ?.filter(blockTag => blockTag.tag === tag)
        .map(blockTag =>
          blockTag.content
            .map(part => part.text)
            .join('')
            .trim(),
        )
        .filter(Boolean) ?? [],
  );

/** 读取一个或多个同义 JSDoc tag 的正文 */
const renderTagContent = (comments: Array<JSONOutput.Comment | undefined>, tags: Array<string>): string =>
  tags.flatMap(tag => renderBlockTags(comments, tag)).join('\n\n');

/** 删除 JSDoc example 中可选的 Markdown 围栏，统一由 MDX 渲染器包裹 */
const unwrapCodeFence = (value: string): string =>
  value.replace(/^```(?:ts|tsx|typescript)?\s*\n?/, '').replace(/\n?```\s*$/, '');

/** 将 TypeDoc JSON 类型转为稳定、紧凑的 TypeScript 表达 */
const renderType = (type: JSONOutput.SomeType | undefined): string => {
  if (!type) return 'unknown';
  switch (type.type) {
    case 'intrinsic':
    case 'unknown':
      return type.name;
    case 'literal':
      return typeof type.value === 'string' ? `'${type.value}'` : String(type.value);
    case 'array':
      return `Array<${renderType(type.elementType)}>`;
    case 'optional':
      return `${renderType(type.elementType)} | undefined`;
    case 'rest':
      return `...${renderType(type.elementType)}`;
    case 'reference': {
      const typeArguments = type.typeArguments?.map(renderType).join(', ');
      return typeArguments ? `${type.name}<${typeArguments}>` : type.name;
    }
    case 'union':
      return type.types.map(renderType).join(' | ');
    case 'intersection':
      return type.types.map(renderType).join(' & ');
    case 'tuple':
      return `[${type.elements?.map(renderType).join(', ') ?? ''}]`;
    case 'indexedAccess':
      return `${renderType(type.objectType)}[${renderType(type.indexType)}]`;
    case 'query':
      return `typeof ${renderType(type.queryType)}`;
    case 'typeOperator':
      return `${type.operator} ${renderType(type.target)}`;
    case 'reflection':
      return renderReflectionType(type.declaration);
    default:
      return type.type;
  }
};

/** 渲染匿名对象或函数类型 */
const renderReflectionType = (reflection: JSONOutput.DeclarationReflection): string => {
  const signature = reflection.signatures?.[0];
  if (signature) return renderSignature(signature);
  const members = reflection.children ?? [];
  if (members.length === 0) return '{}';
  return `{ ${members
    .map(member => `${member.name}${member.flags.isOptional ? '?' : ''}: ${renderType(member.type)}`)
    .join('; ')} }`;
};

/** 渲染函数签名 */
const renderSignature = (signature: JSONOutput.SignatureReflection): string => {
  const parameters = signature.parameters ?? [];
  const typeParameters = signature.typeParameters?.map(parameter => parameter.name).join(', ');
  const prefix = typeParameters ? `<${typeParameters}>` : '';
  return `${prefix}(${parameters
    .map(parameter => `${parameter.name}${parameter.flags.isOptional ? '?' : ''}: ${renderType(parameter.type)}`)
    .join(', ')}) => ${renderType(signature.type)}`;
};

/** 从函数签名与 TypeDoc 已投影到参数节点的 JSDoc 生成参数表 */
const toParameters = (signature: JSONOutput.SignatureReflection | undefined): Array<ApiReferenceParameter> =>
  (signature?.parameters ?? []).map(parameter => ({
    name: parameter.name,
    type: renderType(parameter.type),
    description: renderComment(parameter.comment),
  }));

/** 从函数或类型声明提取泛型参数及其 JSDoc 说明 */
const toTypeParameters = (
  reflection: JSONOutput.DeclarationReflection,
  signature: JSONOutput.SignatureReflection | undefined,
): Array<ApiReferenceTypeParameter> =>
  (signature?.typeParameters ?? reflection.typeParameters ?? []).map(parameter => ({
    name: parameter.name,
    description: renderComment(parameter.comment),
  }));

/** 提取交叉类型中直接声明的对象字段，引用类型保留在签名中 */
const inlineMembers = (type: JSONOutput.SomeType | undefined): Array<JSONOutput.DeclarationReflection> => {
  if (type?.type === 'reflection') return type.declaration.children ?? [];
  if (type?.type === 'intersection') return type.types.flatMap(inlineMembers);
  return [];
};

/** 从 declaration 提取可查询的对象成员 */
const toMembers = (
  reflection: JSONOutput.DeclarationReflection,
  expandIntersectionMembers: boolean,
): Array<ApiReferenceMember> =>
  (
    reflection.children ??
    (expandIntersectionMembers && reflection.type?.type === 'intersection' ? inlineMembers(reflection.type) : [])
  )
    .filter(member => member.flags.isInherited !== true)
    .map(member => ({
      name: member.name,
      optional: member.flags.isOptional === true,
      type: member.signatures?.length ? member.signatures.map(renderSignature).join('; ') : renderType(member.type),
      description: renderComment(member.comment),
      defaultValue:
        unwrapCodeFence(renderTagContent([member.comment], ['@default', '@defaultValue'])) ||
        member.defaultValue ||
        '—',
    }));

/** 将 TypeDoc declaration 转为页面需要的公开 API 投影 */
const toSymbol = (
  reflection: JSONOutput.DeclarationReflection,
  packageDirectory: string,
  expandIntersectionMembers: boolean,
): ApiReferenceSymbol => {
  const signature = reflection.signatures?.[0];
  const comments = [signature?.comment, reflection.comment];
  const primaryComment = signature?.comment ?? reflection.comment;
  const sourceFileName = reflection.sources?.[0] ? toPosixPath(reflection.sources[0].fileName) : undefined;
  const sourceBasePath = `${packageDirectory}/src/`;
  return {
    name: reflection.name,
    description: renderComment(primaryComment),
    details: renderTagContent(comments, ['@description']),
    remarks: renderTagContent(comments, ['@remarks']),
    examples: renderBlockTags(comments, '@example').map(unwrapCodeFence),
    parameters: toParameters(signature),
    typeParameters: toTypeParameters(reflection, signature),
    returns: renderTagContent(comments, ['@returns', '@return']),
    throws: [...renderBlockTags(comments, '@throws'), ...renderBlockTags(comments, '@exception')],
    deprecated: renderTagContent(comments, ['@deprecated']),
    since: renderTagContent(comments, ['@since']),
    see: renderBlockTags(comments, '@see'),
    signature: signature
      ? renderSignature(signature)
      : reflection.type
        ? renderType(reflection.type)
        : renderReflectionType(reflection),
    members: toMembers(reflection, expandIntersectionMembers),
    source:
      sourceFileName && reflection.sources?.[0]
        ? {
            path: sourceFileName.startsWith(sourceBasePath)
              ? sourceFileName
              : `${sourceBasePath}${sourceFileName.replace(/^src\//, '')}`,
            startLine: reflection.sources[0].line,
          }
        : undefined,
  };
};

/** 转义 GFM 表格单元格中会破坏列结构的字符 */
const escapeTableCell = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('|', '\\|').replaceAll('\n', '<br />');

/** 中文是 JSDoc 真源；英文只采用受审查的翻译产物 */
const localizeText = (value: string, lang: ApiReferenceLanguage, translate: (source: string) => string): string =>
  lang === 'en' ? translate(value) : value;

/** 在默认值列保留字面量的代码语义；无默认值时保持占位符 */
const renderDefaultValue = (value: string): string => (value === '—' ? value : `\`${escapeTableCell(value)}\``);

/** 渲染一个公开 API 的成员表 */
const renderMembers = (
  members: Array<ApiReferenceMember>,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  if (members.length === 0) return '';
  const labels = lang === 'zh' ? ['成员', '类型', '默认值', '说明'] : ['Member', 'Type', 'Default', 'Description'];
  const rows = members.map(member => {
    return `| \`${member.name}${member.optional ? '?' : ''}\` | \`${escapeTableCell(member.type)}\` | ${renderDefaultValue(member.defaultValue)} | ${escapeTableCell(localizeText(member.description || '—', lang, translate))} |`;
  });
  return [`| ${labels.join(' | ')} |`, '| --- | --- | --- | --- |', ...rows].join('\n');
};

/** 渲染由公共 JSDoc 提供的实际调用片段 */
const renderExamples = (examples: Array<string>, lang: ApiReferenceLanguage): string => {
  if (examples.length === 0) return '';
  return [`#### ${lang === 'zh' ? '用法' : 'Usage'}`, ...examples.map(example => `\`\`\`ts\n${example}\n\`\`\``)].join(
    '\n\n',
  );
};

/** 渲染函数或 Hook 的 JSDoc 参数表 */
const renderParameters = (
  parameters: Array<ApiReferenceParameter>,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  if (parameters.length === 0) return '';
  const labels = lang === 'zh' ? ['参数', '类型', '说明'] : ['Parameter', 'Type', 'Description'];
  return [
    `#### ${lang === 'zh' ? '参数' : 'Parameters'}`,
    `| ${labels.join(' | ')} |`,
    '| --- | --- | --- |',
    ...parameters.map(
      parameter =>
        `| \`${parameter.name}\` | \`${escapeTableCell(parameter.type)}\` | ${escapeTableCell(localizeText(parameter.description || '—', lang, translate))} |`,
    ),
  ].join('\n');
};

/** 渲染泛型参数的 JSDoc 说明 */
const renderTypeParameters = (
  parameters: Array<ApiReferenceTypeParameter>,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  if (parameters.length === 0) return '';
  const labels = lang === 'zh' ? ['类型参数', '说明'] : ['Type parameter', 'Description'];
  return [
    `#### ${lang === 'zh' ? '类型参数' : 'Type parameters'}`,
    `| ${labels.join(' | ')} |`,
    '| --- | --- |',
    ...parameters.map(
      parameter =>
        `| \`${parameter.name}\` | ${escapeTableCell(localizeText(parameter.description || '—', lang, translate))} |`,
    ),
  ].join('\n');
};

/** 渲染带标题的单段 JSDoc 内容 */
const renderTagSection = (
  title: string,
  content: string,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => (content ? [`#### ${title}`, localizeText(content, lang, translate)].join('\n\n') : '');

/** 渲染 JSDoc 的非主路径补充说明 */
const renderRemarks = (remarks: string, lang: ApiReferenceLanguage, translate: (source: string) => string): string =>
  remarks
    ? `> **${lang === 'zh' ? '备注' : 'Notes'}${lang === 'zh' ? '：' : ':'}** ${localizeText(remarks, lang, translate)}`
    : '';

/** 渲染版本、弃用与延伸阅读等不改变签名的 JSDoc 元数据 */
const renderMetadata = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  const parts = [
    symbol.since
      ? `**${lang === 'zh' ? '自' : 'Since'}${lang === 'zh' ? '：' : ':'}** ${localizeText(symbol.since, lang, translate)}`
      : '',
    symbol.deprecated
      ? `> **${lang === 'zh' ? '已弃用' : 'Deprecated'}${lang === 'zh' ? '：' : ':'}** ${localizeText(symbol.deprecated, lang, translate)}`
      : '',
    symbol.see.length > 0
      ? [
          `#### ${lang === 'zh' ? '延伸阅读' : 'See also'}`,
          ...symbol.see.map(item => `- ${localizeText(item, lang, translate)}`),
        ].join('\n\n')
      : '',
  ];
  return parts.filter(Boolean).join('\n\n');
};

/** 以 API 摘要作为源码面板的唯一入口，不额外占用独立的“查看源码”行 */
const renderSummary = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  const summary = localizeText(symbol.description, lang, translate);
  if (!symbol.source || !summary) return summary;
  return `<p><ApiSourceLink label={${JSON.stringify(symbol.name)}} path={${JSON.stringify(symbol.source.path)}} startLine={${symbol.source.startLine}}>${summary}</ApiSourceLink></p>`;
};

/** 渲染一个公开 API 的常规 MDX 片段 */
const renderSymbol = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string =>
  [
    `### ${symbol.name}`,
    renderSummary(symbol, lang, translate),
    localizeText(symbol.details, lang, translate),
    symbol.members.length === 0 || symbol.signature.includes(' & ') ? `\`\`\`ts\n${symbol.signature}\n\`\`\`` : '',
    renderMembers(symbol.members, lang, translate),
    renderTypeParameters(symbol.typeParameters, lang, translate),
    renderParameters(symbol.parameters, lang, translate),
    renderTagSection(lang === 'zh' ? '返回值' : 'Returns', symbol.returns, lang, translate),
    symbol.throws.length > 0
      ? [
          `#### ${lang === 'zh' ? '异常' : 'Throws'}`,
          ...symbol.throws.map(item => `- ${localizeText(item, lang, translate)}`),
        ].join('\n\n')
      : '',
    renderRemarks(symbol.remarks, lang, translate),
    renderMetadata(symbol, lang, translate),
    renderExamples(symbol.examples, lang),
  ]
    .filter(Boolean)
    .join('\n\n');

/** 从公开入口、签名与 JSDoc 生成可由 MDX include 直接展开的 API 内容 */
export const createApiReferenceMdx = async (
  config: ApiReferencePackageConfig,
  lang: ApiReferenceLanguage,
): Promise<string> => {
  const app = await Application.bootstrapWithPlugins({
    entryPoints: config.entries.map(entry => toPosixPath(entry.source)),
    entryPointStrategy: 'expand',
    basePath: repositoryRoot,
    name: config.packageName,
    skipErrorChecking: true,
    tsconfig: config.tsconfigPath,
    blockTags: [
      ...OptionDefaults.blockTags,
      '@description',
      '@default',
      '@defaultValue',
      '@exception',
      '@typeParam',
      '@deprecated',
      '@see',
      '@since',
    ],
  });
  const project = await app.convert();
  if (!project) throw new Error(`TypeDoc 未能解析 ${config.packageName} 公开入口`);
  const output = app.serializer.projectToObject(project, normalizePath(repositoryRoot));
  const children = output.children ?? [];
  const entrySymbols =
    config.entries.length === 1 ? [children] : config.entries.map((_, index) => children[index]?.children ?? []);

  return config.entries
    .map((entry, index) => {
      const exported = entrySymbols[index] ?? [];
      for (const name of entry.symbols ?? []) {
        if (!exported.some(symbol => symbol.name === name)) {
          throw new Error(`Missing public API ${name} in ${entry.source}`);
        }
      }
      const symbols = exported
        .filter(symbol => entry.symbols === undefined || entry.symbols.includes(symbol.name))
        .filter(
          symbol =>
            !(
              symbol.kind === ReflectionKind.Namespace &&
              exported.some(other => other.name === symbol.name && other.kind === ReflectionKind.Variable)
            ),
        )
        .map(symbol => toSymbol(symbol, config.packageDirectory, entry.expandIntersectionMembers === true))
        .map(symbol => {
          const schemaUrl = config.schemaReferences?.[symbol.name];
          if (!schemaUrl) return renderSymbol(symbol, lang, config.translate);
          return [
            `### ${symbol.name}`,
            renderSummary(symbol, lang, config.translate),
            `[${lang === 'zh' ? 'Schema 参考' : 'Schema reference'}](${schemaUrl})`,
          ]
            .filter(Boolean)
            .join('\n\n');
        });
      return [`## ${entry.title[lang]}`, ...symbols].join('\n\n');
    })
    .join('\n\n');
};

/** 写出受版本控制的双语 API Reference MDX include */
export const writeApiReferenceMdx = async (
  config: ApiReferencePackageConfig,
  outputDirectory: string,
): Promise<void> => {
  mkdirSync(outputDirectory, { recursive: true });
  for (const lang of ['zh', 'en'] as const) {
    const source = await createApiReferenceMdx(config, lang);
    writeFileSync(
      path.resolve(outputDirectory, `generated.${lang}.mdx`),
      `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${source}\n`,
      'utf8',
    );
  }
};

/** 生成 @retikz/tex 的 API Reference MDX */
export const createTexApiReferenceMdx = async (lang: ApiReferenceLanguage): Promise<string> =>
  createApiReferenceMdx(texApiReferenceConfig, lang);

/** 写出 @retikz/tex 的双语 API Reference MDX include */
export const writeTexApiReferenceMdx = async (outputDirectory: string): Promise<void> =>
  writeApiReferenceMdx(texApiReferenceConfig, outputDirectory);
