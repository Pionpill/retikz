import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { JSONOutput } from 'typedoc';
import { Application, Converter, normalizePath, OptionDefaults, ReflectionKind } from 'typedoc';
import ts from 'typescript';
import { z } from 'zod';

import { apiReferenceBranchLabels } from './branch-labels';
import { apiReferenceGroupLabels, apiReferenceMemberGroups } from './member-groups';
import type { ApiReferenceGroupPlan } from './member-groups';
import { translateTexApiReference } from './tex.en';

const docsRoot = path.resolve(import.meta.dirname, '../..');
const repositoryRoot = path.resolve(docsRoot, '../..');
export type ApiReferenceLanguage = 'zh' | 'en';

export type ApiReferenceEntry = {
  source: string;
  /** 组件参考按公开标识符筛选；省略时收录入口全部导出 */
  symbols?: ReadonlyArray<string>;
  /** 按阅读顺序合并入口与其专属 Props / Input，二者仍从源码解析 */
  symbolPairs?: ReadonlyArray<readonly [entry: string, input: string]>;
  /** 配对入口的参数与返回值已由输入属性和签名说明时，省略重复章节 */
  omitPairedCallDetails?: boolean;
  /** 按声明顺序为需要分栏的调用形式提供语义名称 */
  overloadTabs?: Readonly<
    Record<string, ReadonlyArray<{ value: string; label: Record<ApiReferenceLanguage, string> }>>
  >;
  /** 指定组合类型展示解析后的全部字段，而非仅展示直接声明的字段 */
  fullMemberSymbols?: ReadonlyArray<string>;
  /** 不透明类型仅展示声明，不将品牌字段当作可调用成员 */
  declarationOnlySymbols?: ReadonlyArray<string>;
  /** 为成员类型展示对应的公开值集合，开放字符串同时保留 string 提示 */
  memberValueSets?: Readonly<Record<string, Readonly<Record<string, ApiReferenceMemberValueSet>>>>;
  /** 以已核对等价的简短公开类型替代冗长的推断类型或索引引用 */
  memberTypeLabels?: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** 为指定公开类型按职责分组，字段说明仍从 TypeDoc 读取 */
  memberGroups?: Readonly<Record<string, ReadonlyArray<ApiReferenceMemberGroup>>>;
  title: Record<ApiReferenceLanguage, string>;
};

/** API 字段的阅读分组，不复制字段类型或描述 */
export type ApiReferenceMemberGroup = {
  members: ReadonlyArray<string>;
} & (
  | { name: keyof typeof apiReferenceGroupLabels; title?: never }
  | { title: Record<ApiReferenceLanguage, string>; name?: never }
);

/** 字段表中的公开枚举值集合展示 */
export type ApiReferenceMemberValueSet = {
  name: string;
  open?: boolean;
};

export type ApiReferencePackageConfig = {
  packageName: string;
  packageDirectory: string;
  tsconfigPath: string;
  entries: ReadonlyArray<ApiReferenceEntry>;
  translate: (source: string) => string;
  /** schema 符号只保留摘要并链接到字段真源 */
  schemaReferences?: Readonly<Record<string, string>>;
  /** Schema 推导字段的中文翻译；英文说明直接读取 .describe() */
  schemaLocalizations?: Readonly<Partial<Record<string, { descriptions: Readonly<Partial<Record<string, string>>> }>>>;
  /** 跨包继承的 Schema 从其公开入口读取 */
  schemaPackageName?: string;
};

type ApiReferenceMember = {
  name: string;
  label?: string;
  optional: boolean;
  readonly?: boolean;
  type: string;
  valueSet?: ApiReferenceMemberValueSet;
  description: string;
  schemaDescription?: Record<ApiReferenceLanguage, string>;
  schemaName?: string;
  /** 字段的较长约束，放在表格后避免撑宽单元格 */
  details?: string;
  defaultValue: string;
  parameters?: Array<ApiReferenceParameter>;
  returns?: string;
  throws?: Array<string>;
  callSignatures?: Array<{
    type: string;
    description: string;
    details: string;
    parameters: Array<ApiReferenceParameter>;
    returns: string;
    throws: Array<string>;
  }>;
};

type ApiReferenceParameter = {
  name: string;
  type: string;
  description: string;
};

type ApiReferenceTypeParameter = {
  name: string;
  type: string;
  description: string;
};

type ApiReferenceSource = {
  path: string;
  startLine: number;
};

type ApiReferenceSymbol = {
  name: string;
  kind: ReflectionKind;
  callable: boolean;
  description: string;
  details: string;
  remarks: string;
  examples: Array<string>;
  parameters: Array<ApiReferenceParameter>;
  typeParameters: Array<ApiReferenceTypeParameter>;
  returns: string;
  returnType: string;
  throws: Array<string>;
  deprecated: string;
  since: string;
  signature: string;
  expandedSignature?: string;
  branches?: Array<{ value: string; label: Record<ApiReferenceLanguage, string>; members: Array<ApiReferenceMember> }>;
  overloads?: Array<ApiReferenceSymbol>;
  members: Array<ApiReferenceMember>;
  source?: ApiReferenceSource;
};

type ApiReferenceComposition = {
  baseTypes: Array<string>;
  omittedMembers: Array<string>;
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

const MAX_EXPANDED_UNION_BRANCHES = 8;
const MAX_EXPANDED_UNION_LINES = 40;
const MAX_EXPANDED_UNION_CHARACTERS = 500;
const MAX_MEMBER_TYPE_CHARACTERS = 300;
const MAX_WRAPPED_OBJECT_MEMBERS = 12;
const MAX_WRAPPED_OBJECT_CHARACTERS = 500;

/** TypeScript 没有公开的 isKeywordTypeNode 时，识别可独立阅读的基础关键字类型 */
const isKeywordTypeNode = (node: ts.TypeNode): boolean =>
  [
    ts.SyntaxKind.AnyKeyword,
    ts.SyntaxKind.BigIntKeyword,
    ts.SyntaxKind.BooleanKeyword,
    ts.SyntaxKind.NeverKeyword,
    ts.SyntaxKind.NumberKeyword,
    ts.SyntaxKind.ObjectKeyword,
    ts.SyntaxKind.StringKeyword,
    ts.SyntaxKind.SymbolKeyword,
    ts.SyntaxKind.UndefinedKeyword,
    ts.SyntaxKind.UnknownKeyword,
    ts.SyntaxKind.VoidKeyword,
  ].includes(node.kind);

/** 原声明已经完整表达包装语义的联合分支不再生成结构化重复视图 */
const isDirectlyReadableUnionBranch = (node: ts.TypeNode): boolean => {
  if (ts.isArrayTypeNode(node) || ts.isTupleTypeNode(node) || ts.isTypeOperatorNode(node)) return true;
  if (!ts.isTypeReferenceNode(node)) return false;
  const referenceName = node.typeName.getText();
  return ['Array', 'Readonly', 'ReadonlyArray'].includes(referenceName);
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
  const typeParameters = signature.typeParameters
    ?.map(
      parameter =>
        `${parameter.name}${parameter.type ? ` extends ${renderType(parameter.type)}` : ''}${parameter.default ? ` = ${renderType(parameter.default)}` : ''}`,
    )
    .join(', ');
  const prefix = typeParameters ? `<${typeParameters}>` : '';
  return `${prefix}(${parameters
    .map(
      parameter =>
        `${parameter.flags.isRest ? '...' : ''}${parameter.name}${parameter.flags.isOptional || parameter.defaultValue !== undefined ? '?' : ''}: ${renderType(parameter.type)}`,
    )
    .join(', ')}) => ${renderType(signature.type)}`;
};

/** 从函数签名与 TypeDoc 已投影到参数节点的 JSDoc 生成参数表 */
const toParameters = (signature: JSONOutput.SignatureReflection | undefined): Array<ApiReferenceParameter> =>
  (signature?.parameters ?? []).map(parameter => ({
    name: `${parameter.flags.isRest ? '...' : ''}${parameter.name}${parameter.flags.isOptional || parameter.defaultValue !== undefined ? '?' : ''}`,
    type: renderType(parameter.type),
    description: renderComment(parameter.comment),
  }));

/** 从标准 JSDoc `@template` 或兼容的 `@typeParam` 中取得指定泛型的说明 */
const typeParameterDescriptionFromTags = (comments: Array<JSONOutput.Comment | undefined>, name: string): string => {
  const tagContents = ['@template', '@typeParam'].flatMap(tag => renderBlockTags(comments, tag));
  const match = tagContents.find(content => new RegExp(`^${name}(?:\\s*-?\\s*|$)`).test(content));
  return match?.replace(new RegExp(`^${name}(?:\\s*-?\\s*)?`), '').trim() ?? '';
};

/** 从函数或类型声明提取泛型参数及其 JSDoc 说明 */
const toTypeParameters = (
  reflection: JSONOutput.DeclarationReflection,
  signature: JSONOutput.SignatureReflection | undefined,
): Array<ApiReferenceTypeParameter> =>
  (signature?.typeParameters ?? reflection.typeParameters ?? []).map(parameter => ({
    name: parameter.name,
    type: [
      parameter.type ? `extends ${renderType(parameter.type)}` : '',
      parameter.default ? `= ${renderType(parameter.default)}` : '',
    ]
      .filter(Boolean)
      .join(' '),
    description:
      renderComment(parameter.comment) ||
      typeParameterDescriptionFromTags([signature?.comment, reflection.comment], parameter.name),
  }));

/** 从 declaration 提取可查询的对象成员 */
const toMembers = (reflection: JSONOutput.DeclarationReflection): Array<ApiReferenceMember> =>
  (
    reflection.children ??
    (reflection.type?.type === 'reflection' &&
    (reflection.type.declaration.signatures?.length ||
      reflection.type.declaration.children?.some(
        member =>
          member.signatures?.length ||
          (member.type?.type === 'reflection' && member.type.declaration.signatures?.length),
      ))
      ? reflection.type.declaration.children
      : []) ??
    []
  )
    .filter(member => member.flags.isInherited !== true)
    .map(member => ({
      ...member,
      signatures:
        member.signatures ?? (member.type?.type === 'reflection' ? member.type.declaration.signatures : undefined),
    }))
    .map(member => ({
      name: member.name,
      optional: member.flags.isOptional === true,
      readonly: member.flags.isReadonly === true,
      type: member.signatures?.length ? member.signatures.map(renderSignature).join('; ') : renderType(member.type),
      callSignatures: member.signatures?.map(signature => ({
        type:
          member.kind === ReflectionKind.Constructor
            ? `(${(signature.parameters ?? []).map(parameter => `${parameter.flags.isRest ? '...' : ''}${parameter.name}${parameter.flags.isOptional || parameter.defaultValue !== undefined ? '?' : ''}: ${renderType(parameter.type)}`).join(', ')})`
            : renderSignature(signature),
        description: renderComment(signature.comment) || renderComment(member.comment),
        details: renderTagContent([signature.comment, member.comment], ['@description']),
        parameters: toParameters(signature),
        returns: renderTagContent([signature.comment], ['@returns', '@return']),
        throws: renderBlockTags([signature.comment], '@throws'),
      })),
      details: renderTagContent(
        [member.comment, ...(member.signatures ?? []).map(signature => signature.comment)],
        ['@description'],
      ),
      description:
        renderComment(member.comment) ||
        (member.signatures ?? [])
          .map(signature => renderComment(signature.comment))
          .filter(Boolean)
          .join('\n\n'),
      defaultValue:
        unwrapCodeFence(renderTagContent([member.comment], ['@default', '@defaultValue'])) ||
        member.defaultValue ||
        '—',
    }));

/** 用类型检查器解析映射类型，保留实例化后的字段类型与声明处注释 */
const resolveObjectMembers = (
  program: ts.Program,
  sourceFile: ts.SourceFile,
  name: string,
):
  | {
      members?: Array<ApiReferenceMember>;
      branches?: Array<Array<ApiReferenceMember>>;
      directMembers?: Array<ApiReferenceMember>;
      composition?: ApiReferenceComposition;
      signature: string;
      expandedSignature?: string;
      indexSignatures?: Array<string>;
      schemaName?: string;
    }
  | undefined => {
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  let symbol = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find(item => item.name === name);
  if (!symbol) throw new Error(`Missing public object type ${name} in ${sourceFile.fileName}`);
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const declaration = symbol.declarations?.[0];
  if (!declaration) throw new Error(`Missing declaration for ${name}`);
  if (!ts.isTypeAliasDeclaration(declaration) && !ts.isInterfaceDeclaration(declaration)) return undefined;
  const schemaName =
    ts.isTypeAliasDeclaration(declaration) &&
    ts.isTypeReferenceNode(declaration.type) &&
    /^(?:ZodInfer|ZodInput|infer|input|output|z\.(?:infer|input|output))$/.test(declaration.type.typeName.getText()) &&
    declaration.type.typeArguments?.length === 1 &&
    ts.isTypeQueryNode(declaration.type.typeArguments[0]) &&
    ts.isIdentifier(declaration.type.typeArguments[0].exprName)
      ? declaration.type.typeArguments[0].exprName.text
      : undefined;
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  /** 沿原始类型组合追踪继承字段；直接重声明的字段不借用 Schema 语义 */
  const inheritedSchemaName = (
    node: ts.TypeNode,
    memberName: string,
    seen = new Set<ts.Node>(),
  ): string | undefined => {
    if (seen.has(node)) return undefined;
    seen.add(node);
    if (!ts.isIndexedAccessTypeNode(node) && !checker.getPropertyOfType(checker.getTypeFromTypeNode(node), memberName))
      return undefined;
    if (ts.isParenthesizedTypeNode(node)) return inheritedSchemaName(node.type, memberName, seen);
    if (ts.isIntersectionTypeNode(node)) {
      if (
        node.types.some(
          part => ts.isTypeLiteralNode(part) && part.members.some(member => member.name?.getText() === memberName),
        )
      )
        return undefined;
      for (const part of node.types) {
        const result = inheritedSchemaName(part, memberName, seen);
        if (result) return result;
      }
    }
    if (
      ts.isIndexedAccessTypeNode(node) &&
      ts.isLiteralTypeNode(node.indexType) &&
      ts.isStringLiteral(node.indexType.literal)
    ) {
      const field = node.indexType.literal.text;
      const owner = inheritedSchemaName(node.objectType, field, seen);
      return owner ? `${owner}.${field}` : undefined;
    }
    if (!ts.isTypeReferenceNode(node)) return undefined;
    const referenceName = node.typeName.getText();
    const argument = node.typeArguments?.[0];
    if (
      /^(?:ZodInfer|ZodInput|infer|input|output|z\.(?:infer|input|output))$/.test(referenceName) &&
      argument &&
      ts.isTypeQueryNode(argument)
    )
      return argument.exprName.getText();
    if (
      ['Omit', 'Pick', 'Readonly', 'Partial', 'Required', 'Extract', 'NonNullable'].includes(referenceName) &&
      argument
    )
      return inheritedSchemaName(argument, memberName, seen);
    let referenced = checker.getSymbolAtLocation(node.typeName);
    if (referenced && referenced.flags & ts.SymbolFlags.Alias) referenced = checker.getAliasedSymbol(referenced);
    const alias = referenced?.declarations?.find(ts.isTypeAliasDeclaration);
    return alias ? inheritedSchemaName(alias.type, memberName, seen) : undefined;
  };
  const isObject = (candidate: ts.Type): boolean =>
    candidate.isIntersection()
      ? candidate.types.every(isObject)
      : (candidate.flags & ts.TypeFlags.Object) !== 0 &&
        !checker.isArrayType(candidate) &&
        !checker.isTupleType(candidate) &&
        !candidate.isClass() &&
        checker.getSignaturesOfType(candidate, ts.SignatureKind.Call).length === 0 &&
        checker.getSignaturesOfType(candidate, ts.SignatureKind.Construct).length === 0;
  const printer = ts.createPrinter({ removeComments: true });
  const print = (node: ts.Node): string =>
    printer.printNode(ts.EmitHint.Unspecified, node, declaration.getSourceFile());
  const signature = print(declaration);
  const composition = (() => {
    if (!ts.isTypeAliasDeclaration(declaration)) return undefined;
    const directMemberNames = new Set<string>();
    const baseTypes = new Set<string>();
    const omittedMembers = new Set<string>();
    const collectOmittedMembers = (node: ts.TypeNode): void => {
      if (ts.isLiteralTypeNode(node)) {
        omittedMembers.add(node.getText());
        return;
      }
      if (ts.isUnionTypeNode(node)) node.types.forEach(collectOmittedMembers);
    };
    const visit = (node: ts.TypeNode): void => {
      if (ts.isParenthesizedTypeNode(node)) return visit(node.type);
      if (ts.isIntersectionTypeNode(node)) return node.types.forEach(visit);
      if (ts.isTypeLiteralNode(node)) {
        node.members.forEach(member => {
          if (
            ts.isPropertySignature(member) &&
            (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name) || ts.isNumericLiteral(member.name))
          )
            directMemberNames.add(member.name.text);
        });
        return;
      }
      if (!ts.isTypeReferenceNode(node)) return;
      const referenceName = node.typeName.getText();
      const typeArguments = node.typeArguments;
      if (typeArguments === undefined) return;
      const [baseType] = typeArguments;
      if (referenceName === 'Readonly') return visit(baseType);
      if (!['Omit', 'Pick'].includes(referenceName)) return;
      baseTypes.add(print(baseType));
      if (referenceName === 'Omit') typeArguments.slice(1).forEach(collectOmittedMembers);
    };
    visit(declaration.type);
    return { directMemberNames, baseTypes, omittedMembers };
  })();
  /** 为超长继承字段寻找最近的命名类型入口，避免把实现细节铺进字段表 */
  const memberTypeReference = (memberName: string): string | undefined => {
    if (!ts.isTypeAliasDeclaration(declaration)) return undefined;
    const hasMember = (node: ts.TypeNode): boolean =>
      checker.getPropertyOfType(checker.getTypeFromTypeNode(node), memberName) !== undefined;
    const visit = (node: ts.TypeNode): string | undefined => {
      if (ts.isParenthesizedTypeNode(node)) return visit(node.type);
      if (ts.isIntersectionTypeNode(node) || ts.isUnionTypeNode(node)) {
        for (const part of node.types) {
          const result = visit(part);
          if (result !== undefined) return result;
        }
        return undefined;
      }
      if (!ts.isTypeReferenceNode(node)) return undefined;
      const referenceName = node.typeName.getText();
      const baseType = node.typeArguments?.[0];
      if (referenceName === 'Record') return undefined;
      if (baseType && ['Readonly', 'Partial', 'Required', 'Pick', 'Omit'].includes(referenceName)) {
        if (!hasMember(node)) return undefined;
        if (ts.isTypeLiteralNode(baseType)) return undefined;
        if (hasMember(baseType)) return visit(baseType);
        return visit(baseType);
      }
      if (node.typeArguments?.length) return undefined;
      let referenced = checker.getSymbolAtLocation(node.typeName);
      if (referenced && referenced.flags & ts.SymbolFlags.Alias) referenced = checker.getAliasedSymbol(referenced);
      if (
        !referenced?.declarations?.some(
          item =>
            ts.canHaveModifiers(item) &&
            ts.getModifiers(item)?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword),
        )
      )
        return undefined;
      return hasMember(node) ? `${print(node)}['${memberName}']` : undefined;
    };
    return visit(declaration.type);
  };
  /** 从别名依赖中保留已实例化的字段入口，避免展开嵌套 Schema */
  const unionMemberReference = (memberName: string, memberType: ts.Type, optional: boolean): string | undefined => {
    const visited = new Set<ts.Declaration>();
    const comparable = (candidate: ts.Type): Array<ts.Type> =>
      (candidate.isUnion() ? candidate.types : [candidate]).filter(
        item => !optional || !(item.flags & ts.TypeFlags.Undefined),
      );
    const matches = (candidate: ts.Type): boolean => {
      const left = comparable(candidate);
      const right = comparable(memberType);
      return left.length === right.length && left.every(item => right.includes(item));
    };
    const visit = (node: ts.TypeNode): string | undefined => {
      if (ts.isParenthesizedTypeNode(node)) return visit(node.type);
      if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        for (const part of node.types) {
          const result = visit(part);
          if (result) return result;
        }
      }
      if (ts.isIndexedAccessTypeNode(node)) {
        if (matches(checker.getTypeFromTypeNode(node))) return node.getText();
        return visit(node.objectType);
      }
      if (!ts.isTypeReferenceNode(node)) return undefined;
      for (const argument of node.typeArguments ?? []) {
        const result = visit(argument);
        if (result) return result;
      }
      let referenced = checker.getSymbolAtLocation(node.typeName);
      if (referenced && referenced.flags & ts.SymbolFlags.Alias) referenced = checker.getAliasedSymbol(referenced);
      const target = referenced?.declarations?.[0];
      if (!target || visited.has(target)) return undefined;
      visited.add(target);
      if (!ts.isTypeAliasDeclaration(target) && !ts.isInterfaceDeclaration(target)) return undefined;
      const candidate = checker.getTypeFromTypeNode(node);
      if (
        !target.typeParameters?.length &&
        target.modifiers?.some(item => item.kind === ts.SyntaxKind.ExportKeyword) &&
        isObject(candidate)
      ) {
        const member = checker.getPropertyOfType(candidate, memberName);
        if (member && matches(checker.getTypeOfSymbolAtLocation(member, target)))
          return `${node.getText()}[${JSON.stringify(member.name)}]`;
        return undefined;
      }
      return ts.isTypeAliasDeclaration(target) ? visit(target.type) : undefined;
    };
    return ts.isTypeAliasDeclaration(declaration) ? visit(declaration.type) : undefined;
  };
  const expandUnion = (): string | undefined => {
    if (!ts.isTypeAliasDeclaration(declaration) || declaration.typeParameters?.length || !type.isUnion())
      return undefined;
    if (ts.isUnionTypeNode(declaration.type)) {
      if (declaration.type.types.some(isDirectlyReadableUnionBranch)) return undefined;
      const hasHiddenBranch = declaration.type.types.some(
        node => !ts.isTypeLiteralNode(node) && !ts.isLiteralTypeNode(node) && !isKeywordTypeNode(node),
      );
      if (!hasHiddenBranch) return undefined;
    }
    if (type.types.length > MAX_EXPANDED_UNION_BRANCHES) return undefined;
    const expandedParts = type.types.map(part => {
      const node = checker.typeToTypeNode(
        part,
        declaration,
        ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.UseStructuralFallback | ts.NodeBuilderFlags.InTypeAlias,
      );
      if (node === undefined) return undefined;
      if (isObject(part) && !ts.isTypeLiteralNode(node)) {
        if (hasUnresolvedMapping(part) || checker.getIndexInfosOfType(part).length > 0) return undefined;
        const members = checker.getPropertiesOfType(part).map(member => {
          const resolved = resolveMember(part, member);
          const memberType = checker.getTypeOfSymbolAtLocation(member, declaration);
          const reference = (memberType.isUnion() ? memberType.types : [memberType]).some(
            candidate => (candidate.flags & ts.TypeFlags.Object) !== 0,
          )
            ? unionMemberReference(member.name, memberType, resolved.optional)
            : undefined;
          const fieldType = reference ?? resolved.type;
          if (fieldType === '…') return undefined;
          const fieldName = /^[A-Za-z_$][\w$]*$/.test(member.name) ? member.name : JSON.stringify(member.name);
          return `  ${resolved.readonly ? 'readonly ' : ''}${fieldName}${resolved.optional ? '?' : ''}: ${fieldType};`;
        });
        if (members.some(member => member === undefined)) return undefined;
        return ['{', ...members, '}'].join('\n');
      }
      if (!ts.isTypeLiteralNode(node) && !ts.isLiteralTypeNode(node) && !isKeywordTypeNode(node)) return undefined;
      if (!ts.isTypeLiteralNode(node)) return print(node);
      return ['{', ...node.members.map(member => `  ${print(member)}`), '}'].join('\n');
    });
    if (expandedParts.some(part => part === undefined)) return undefined;
    const expandedType = expandedParts.join(' | ');
    const sourceType = print(declaration.type);
    if (expandedType === sourceType) return undefined;
    const output =
      [
        `export type ${declaration.name.text} =`,
        ...expandedParts.map(part => `  | ${(part ?? '').replaceAll('\n', '\n  ')}`),
      ].join('\n') + ';';
    if (
      output.split('\n').length > MAX_EXPANDED_UNION_LINES ||
      output.length > MAX_EXPANDED_UNION_CHARACTERS ||
      /\b(?:NoInfer|Omit|Partial|Pick|Required)<|import\(|\$Zod/.test(output)
    )
      return undefined;
    return output;
  };
  const branchTypes =
    type.isUnion() &&
    type.types.length <= MAX_EXPANDED_UNION_BRANCHES &&
    type.types.every(isObject) &&
    type.types.reduce((count, branch) => count + checker.getPropertiesOfType(branch).length, 0) <=
      MAX_EXPANDED_UNION_LINES
      ? type.types
      : undefined;
  const expandedNodes = new Map<ts.Type, ts.TypeNode | undefined>();
  const expandedNode = (candidate: ts.Type): ts.TypeNode | undefined => {
    if (!expandedNodes.has(candidate)) {
      expandedNodes.set(
        candidate,
        checker.typeToTypeNode(
          candidate,
          declaration,
          ts.NodeBuilderFlags.InTypeAlias | ts.NodeBuilderFlags.NoTruncation,
        ),
      );
    }
    return expandedNodes.get(candidate);
  };
  // 未实例化的映射仍是 mapped node，不能把已知字段误当成完整契约
  const hasUnresolvedMapping = (candidate: ts.Type): boolean => {
    if (candidate.isIntersection()) return candidate.types.some(hasUnresolvedMapping);
    const node = expandedNode(candidate);
    return node !== undefined && ts.isMappedTypeNode(node);
  };
  const isReadonly = (candidate: ts.Type, member: ts.Symbol): boolean => {
    if (candidate.isIntersection()) {
      return candidate.types
        .filter(part => checker.getPropertyOfType(part, member.name))
        .every(part => isReadonly(part, member));
    }
    const node = expandedNode(candidate);
    const property =
      node && ts.isTypeLiteralNode(node)
        ? node.members.find(
            item =>
              item.name &&
              (ts.isIdentifier(item.name) || ts.isStringLiteral(item.name) || ts.isNumericLiteral(item.name)) &&
              item.name.text === member.name,
          )
        : undefined;
    const original = checker.getPropertyOfType(candidate, member.name)?.declarations?.[0];
    const target = property ?? original;
    return (
      target !== undefined &&
      ts.canHaveModifiers(target) &&
      (ts.getModifiers(target)?.some(modifier => modifier.kind === ts.SyntaxKind.ReadonlyKeyword) ?? false)
    );
  };
  const resolveMember = (owner: ts.Type, member: ts.Symbol): ApiReferenceMember & { details: string } => {
    const tags = member.getJsDocTags(checker);
    const tagText = (tagName: string): string =>
      tags
        .filter(tag => tag.name === tagName)
        .map(tag => ts.displayPartsToString(tag.text))
        .join('\n\n');
    const description = ts.displayPartsToString(member.getDocumentationComment(checker));
    const memberDeclaration = member.valueDeclaration ?? member.declarations?.[0] ?? declaration;
    const memberType = checker.getTypeOfSymbolAtLocation(member, declaration);
    const optional = (member.flags & ts.SymbolFlags.Optional) !== 0;
    const parts = memberType.isUnion() ? memberType.types : [memberType];
    const types = optional ? parts.filter(item => !(item.flags & ts.TypeFlags.Undefined)) : parts;
    const displayTypes = types.length === parts.length ? [memberType] : types;
    const declaredType = ts.isPropertySignature(memberDeclaration) ? memberDeclaration.type : undefined;
    const originalType = declaredType && checker.getTypeFromTypeNode(declaredType);
    const originalParts = originalType?.isUnion() ? originalType.types : originalType ? [originalType] : [];
    const comparableParts = optional
      ? originalParts.filter(item => !(item.flags & ts.TypeFlags.Undefined))
      : originalParts;
    const preservedType =
      declaredType && comparableParts.length === types.length && comparableParts.every(item => types.includes(item))
        ? ts
            .createPrinter({ removeComments: true })
            .printNode(ts.EmitHint.Unspecified, declaredType, declaredType.getSourceFile())
        : undefined;
    const fullType =
      (preservedType ??
        displayTypes
          .map(item =>
            checker.typeToString(
              item,
              memberDeclaration,
              ts.TypeFormatFlags.NoTruncation |
                ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
                ts.TypeFormatFlags.WriteArrayAsGenericType,
            ),
          )
          .join(' | ')) ||
      'never';
    return {
      name: member.name,
      schemaName: ts.isTypeAliasDeclaration(declaration)
        ? inheritedSchemaName(declaration.type, member.name)
        : undefined,
      optional,
      readonly: isReadonly(owner, member),
      type:
        fullType.length > MAX_MEMBER_TYPE_CHARACTERS || /\$Zod|import\(/.test(fullType)
          ? memberTypeReference(member.name) ||
            (schemaName
              ? `${ts.isTypeAliasDeclaration(declaration) && /(?:ZodInput|z\.input|input)</.test(declaration.type.getText()) ? 'ZodInput' : 'ZodInfer'}<typeof ${schemaName}.shape[${JSON.stringify(member.name)}]>`
              : `${name}[${JSON.stringify(member.name)}]`)
          : fullType,
      description,
      details: tagText('description'),
      defaultValue: tagText('default') || tagText('defaultValue') || '—',
    };
  };
  const resolveMembers = (objectType: ts.Type): Array<ApiReferenceMember> =>
    checker
      .getPropertiesOfType(objectType)
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .map(member => resolveMember(objectType, member));
  if (branchTypes) return { signature, branches: branchTypes.map(resolveMembers) };
  const expandedSignature = expandUnion();
  if (!isObject(type)) return { signature, expandedSignature };
  if (hasUnresolvedMapping(type)) return { signature };
  const resolvedMembers = resolveMembers(type);
  const membersTextLength = resolvedMembers.reduce(
    (length, member) =>
      length + member.name.length + member.type.length + member.description.length + (member.details?.length ?? 0),
    0,
  );
  const directMembers = (() => {
    const candidateComposition = composition;
    if (
      candidateComposition === undefined ||
      candidateComposition.baseTypes.size === 0 ||
      candidateComposition.directMemberNames.size > 3 ||
      (resolvedMembers.length <= MAX_WRAPPED_OBJECT_MEMBERS && membersTextLength <= MAX_WRAPPED_OBJECT_CHARACTERS)
    )
      return undefined;
    return resolvedMembers.filter(member => candidateComposition.directMemberNames.has(member.name));
  })();
  const renderedComposition =
    directMembers === undefined || composition === undefined
      ? undefined
      : { baseTypes: [...composition.baseTypes], omittedMembers: [...composition.omittedMembers] };
  const indexSignatures = checker
    .getIndexInfosOfType(type)
    .map(
      info =>
        `${info.isReadonly ? 'readonly ' : ''}[key: ${checker.typeToString(info.keyType)}]: ${checker.typeToString(info.type, declaration, ts.TypeFormatFlags.NoTruncation)}`,
    );
  return {
    members: resolvedMembers,
    directMembers,
    composition: renderedComposition,
    signature,
    expandedSignature,
    indexSignatures,
    schemaName,
  };
};

/** 判断对象初始化表达式是否包含需要从 API 参考中移除的函数实现 */
const containsFunctionImplementation = (node: ts.Node): boolean => {
  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) return true;
  return node.getChildren().some(containsFunctionImplementation);
};

/** 公开声明保留 `export`、名称与赋值结构；实现体仍由源码链接承载 */
const resolveSourceSignature = (
  program: ts.Program,
  sourceFile: ts.SourceFile,
  name: string,
  fallbackSignature: string,
): string | undefined => {
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  let symbol = moduleSymbol && checker.getExportsOfModule(moduleSymbol).find(item => item.name === name);
  if (!symbol) throw new Error(`Missing public declaration ${name} in ${sourceFile.fileName}`);
  if (symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
  const declaration = symbol.declarations?.[0];
  if (!declaration) return undefined;
  const printer = ts.createPrinter({ removeComments: true });
  const print = (node: ts.Node): string =>
    printer.printNode(ts.EmitHint.Unspecified, node, declaration.getSourceFile());
  if (ts.isVariableDeclaration(declaration)) {
    const statement = declaration.parent.parent;
    if (!ts.isVariableStatement(statement)) return undefined;
    if (!declaration.initializer) return print(statement);
    const declarationKind = (declaration.parent.flags & ts.NodeFlags.Const) !== 0 ? 'const' : 'let';
    if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) {
      const initializer = declaration.initializer;
      const annotatedType =
        declaration.type ??
        (initializer.type === undefined
          ? undefined
          : ts.factory.createFunctionTypeNode(
              initializer.typeParameters,
              initializer.parameters.map(parameter =>
                ts.factory.updateParameterDeclaration(
                  parameter,
                  parameter.modifiers,
                  parameter.dotDotDotToken,
                  parameter.name,
                  parameter.initializer ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : parameter.questionToken,
                  parameter.type ??
                    checker.typeToTypeNode(
                      checker.getTypeAtLocation(parameter),
                      parameter,
                      ts.NodeBuilderFlags.NoTruncation,
                    ),
                  undefined,
                ),
              ),
              initializer.type,
            ));
      return `export declare ${declarationKind} ${declaration.name.getText()}: ${annotatedType ? print(annotatedType) : fallbackSignature};`;
    }
    if (
      ts.isObjectLiteralExpression(declaration.initializer) &&
      containsFunctionImplementation(declaration.initializer)
    )
      return `export declare ${declarationKind} ${declaration.name.getText()}: ${fallbackSignature};`;
    const callSignatures = checker.getSignaturesOfType(
      checker.getTypeOfSymbolAtLocation(symbol, declaration),
      ts.SignatureKind.Call,
    );
    if (callSignatures.length > 0) {
      const explicitType =
        declaration.type ??
        (ts.isAsExpression(declaration.initializer) || ts.isTypeAssertionExpression(declaration.initializer)
          ? declaration.initializer.type
          : undefined);
      if (
        explicitType &&
        ts.isTypeReferenceNode(explicitType) &&
        explicitType.typeArguments?.length &&
        checker.getPropertiesOfType(checker.getTypeOfSymbolAtLocation(symbol, declaration)).length === 0
      )
        return `export declare ${declarationKind} ${declaration.name.getText()}: ${print(explicitType)};`;
      const overloads = callSignatures.map(signature => {
        // 读取实例化后的签名，避免泛型调用接口泄漏未绑定的类型参数
        return checker.signatureToString(
          signature,
          declaration,
          ts.TypeFormatFlags.NoTruncation |
            ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope |
            ts.TypeFormatFlags.WriteArrayAsGenericType,
        );
      });
      return `export declare ${declarationKind} ${declaration.name.getText()}: {\n${overloads.map(signature => `  ${signature};`).join('\n')}\n};`;
    }
    return print(statement);
  }
  if (ts.isFunctionDeclaration(declaration))
    return print(
      ts.factory.updateFunctionDeclaration(
        declaration,
        declaration.modifiers,
        declaration.asteriskToken,
        declaration.name,
        declaration.typeParameters,
        declaration.parameters,
        declaration.type,
        undefined,
      ),
    );
  if (ts.isClassDeclaration(declaration))
    return print(
      ts.factory.updateClassDeclaration(
        declaration,
        declaration.modifiers,
        declaration.name,
        declaration.typeParameters,
        declaration.heritageClauses,
        declaration.members
          .filter(
            member =>
              !(
                ts.canHaveModifiers(member) &&
                ts.getModifiers(member)?.some(modifier => modifier.kind === ts.SyntaxKind.PrivateKeyword)
              ) && !(member.name && ts.isPrivateIdentifier(member.name)),
          )
          .filter(
            member =>
              !ts.isConstructorDeclaration(member) ||
              !member.body ||
              !declaration.members.some(other => ts.isConstructorDeclaration(other) && !other.body),
          )
          .filter(
            member =>
              !ts.isMethodDeclaration(member) ||
              !member.body ||
              !declaration.members.some(
                other => ts.isMethodDeclaration(other) && !other.body && other.name.getText() === member.name.getText(),
              ),
          )
          .filter(member => !ts.isClassStaticBlockDeclaration(member))
          .map(member => {
            if (ts.isConstructorDeclaration(member))
              return ts.factory.updateConstructorDeclaration(member, member.modifiers, member.parameters, undefined);
            if (ts.isPropertyDeclaration(member))
              return ts.factory.updatePropertyDeclaration(
                member,
                member.modifiers,
                member.name,
                member.questionToken,
                member.type ??
                  checker.typeToTypeNode(checker.getTypeAtLocation(member), member, ts.NodeBuilderFlags.NoTruncation),
                undefined,
              );
            if (ts.isMethodDeclaration(member))
              return ts.factory.updateMethodDeclaration(
                member,
                member.modifiers,
                member.asteriskToken,
                member.name,
                member.questionToken,
                member.typeParameters,
                member.parameters,
                member.type,
                undefined,
              );
            if (ts.isGetAccessorDeclaration(member))
              return ts.factory.updateGetAccessorDeclaration(
                member,
                member.modifiers,
                member.name,
                member.parameters,
                member.type,
                undefined,
              );
            if (ts.isSetAccessorDeclaration(member))
              return ts.factory.updateSetAccessorDeclaration(
                member,
                member.modifiers,
                member.name,
                member.parameters,
                undefined,
              );
            return member;
          }),
      ),
    );
  if (
    ts.isTypeAliasDeclaration(declaration) ||
    ts.isInterfaceDeclaration(declaration) ||
    ts.isEnumDeclaration(declaration)
  )
    return print(declaration);
  return undefined;
};

/** 将 TypeDoc declaration 转为页面需要的公开 API 投影 */
const toSymbol = (reflection: JSONOutput.DeclarationReflection, packageDirectory: string): ApiReferenceSymbol => {
  const signatures =
    reflection.signatures ??
    (reflection.type?.type === 'reflection' ? reflection.type.declaration.signatures : undefined);
  const signature = signatures?.[0];
  const comments = [signature?.comment, reflection.comment];
  const primaryComment = signature?.comment ?? reflection.comment;
  const sourceFileName = reflection.sources?.[0] ? toPosixPath(reflection.sources[0].fileName) : undefined;
  const sourceBasePath = `${packageDirectory}/src/`;
  return {
    name: reflection.name,
    kind: reflection.kind,
    callable: (signatures?.length ?? 0) > 0,
    overloads:
      signatures && signatures.length > 1
        ? signatures.map(item => toSymbol({ ...reflection, signatures: [item] }, packageDirectory))
        : undefined,
    description: renderComment(primaryComment),
    details: renderTagContent(comments, ['@description']),
    remarks: renderTagContent(comments, ['@remarks']),
    examples: renderBlockTags(comments, '@example').map(example => example.trim()),
    parameters: toParameters(signature),
    typeParameters: toTypeParameters(reflection, signature),
    returns: renderTagContent(comments, ['@returns', '@return']),
    returnType: signature?.type ? renderType(signature.type) : '',
    throws: [...renderBlockTags(comments, '@throws'), ...renderBlockTags(comments, '@exception')],
    deprecated: renderTagContent(comments, ['@deprecated']),
    since: renderTagContent(comments, ['@since']),
    signature: signature
      ? renderSignature(signature)
      : reflection.type
        ? renderType(reflection.type)
        : renderReflectionType(reflection),
    members: toMembers(reflection),
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

/** 每行独立保留代码语义，换行标签放在代码片段之外 */
const renderTableCode = (value: string): string =>
  value
    .split(/\r?\n/)
    .map(line => `\`${escapeTableCell(line.trim())}\``)
    .join('<br />');

/** 转义正文中的 MDX 语法字符，保留 Markdown 代码片段 */
const escapeMdxText = (value: string): string =>
  value.replace(/(`+)[\s\S]*?\1|[<{}]/g, part =>
    part.startsWith('`') ? part : part === '<' ? '&lt;' : part === '{' ? '&#123;' : '&#125;',
  );

/** 中文是 JSDoc 真源；英文只采用受审查的翻译产物 */
const localizeText = (value: string, lang: ApiReferenceLanguage, translate: (source: string) => string): string =>
  escapeMdxText(lang === 'en' ? translate(value.replaceAll('\r', '')) : value.replaceAll('\r', ''));

/** 只展示字段 Schema 在解析 undefined 时实际物化的默认值 */
const schemaDefaultValue = (schema: z.ZodType): string => {
  const hasDefault = (value: z.core.$ZodType): boolean => {
    if (value instanceof z.ZodDefault) return true;
    if (value instanceof z.ZodOptional || value instanceof z.ZodNullable || value instanceof z.ZodReadonly)
      return hasDefault(value.unwrap());
    if (value instanceof z.ZodPipe) return hasDefault(value.in) || hasDefault(value.out);
    return false;
  };
  if (!hasDefault(schema)) return '—';
  const parsed = schema.safeParse(undefined);
  return parsed.success && parsed.data !== undefined ? JSON.stringify(parsed.data) : '—';
};

/** 沿字段路径定位嵌套对象，只有唯一匹配分支时才借用其 Schema 元数据 */
const nestedObjectSchema = (
  schema: z.core.$ZodType,
  fields: Array<string>,
  members: Array<string>,
): z.ZodObject | undefined => {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodDefault
  )
    return nestedObjectSchema(schema.unwrap(), fields, members);
  if (schema instanceof z.ZodUnion) {
    const matches = schema.options
      .map(option => nestedObjectSchema(option, fields, members))
      .filter(item => item !== undefined);
    return matches.length === 1 ? matches[0] : undefined;
  }
  if (!(schema instanceof z.ZodObject)) return undefined;
  if (fields.length === 0) return members.every(name => name in schema.shape) ? schema : undefined;
  const child = schema.shape[fields[0]] as z.core.$ZodType | undefined;
  return child ? nestedObjectSchema(child, fields.slice(1), members) : undefined;
};

/** 将 Schema 的字段描述和真实默认值投影到已由 TypeScript 解析的类型字段 */
const projectSchemaMembers = (
  members: Array<ApiReferenceMember>,
  schema: z.ZodObject,
  schemaName: string,
  localizations: { descriptions: Readonly<Partial<Record<string, string>>> },
): Array<ApiReferenceMember> => {
  const fields = schema.shape as Partial<Record<string, z.ZodType>>;
  const expected = new Set(members.map(member => member.name));
  const missing = [...expected].filter(
    name => fields[name] === undefined || localizations.descriptions[name] === undefined,
  );
  const unknown = Object.keys(localizations.descriptions).filter(name => fields[name.split('.')[0]] === undefined);
  if (missing.length > 0 || unknown.length > 0)
    throw new Error(
      `${schemaName} Schema descriptions differ: missing ${missing.join(', ') || '—'}; unknown ${unknown.join(', ') || '—'}`,
    );
  return members.map(member => {
    const field = fields[member.name];
    const chinese = localizations.descriptions[member.name];
    if (!field || !chinese) throw new Error(`Missing ${schemaName}.${member.name} Schema field or translation`);
    const english = z.globalRegistry.get(field)?.description;
    if (!english) throw new Error(`Missing ${schemaName}.${member.name} .describe()`);
    return {
      ...member,
      description: '',
      details: '',
      schemaDescription: { zh: chinese, en: english },
      defaultValue: schemaDefaultValue(field),
    };
  });
};

/** 在默认值列保留字面量的代码语义；无默认值时保持占位符 */
const renderDefaultValue = (value: string): string => (value === '—' ? value : renderTableCode(value));

/** 渲染一个公开 API 的成员表 */
const renderMembers = (
  members: Array<ApiReferenceMember>,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  groupLabels?: Array<string>,
  extraMembers: Array<ApiReferenceMember> = [],
): string => {
  if (extraMembers.length) {
    const generics = extraMembers.filter(member => member.label === (lang === 'zh' ? '泛型' : 'Type parameter'));
    const rest = extraMembers.filter(member => !generics.includes(member));
    if (groupLabels) groupLabels = [...generics.map(() => ''), ...groupLabels, ...rest.map(() => '')];
    members = [...generics, ...members, ...rest];
  }
  if (members.length === 0) return '';
  const callsOnly =
    members.some(member => Boolean(member.callSignatures?.length)) &&
    members.every(member => member.label || Boolean(member.callSignatures?.length));
  const labels = callsOnly
    ? lang === 'zh'
      ? ['成员', '签名', '说明']
      : ['Member', 'Signature', 'Description']
    : lang === 'zh'
      ? ['成员', '类型', '默认值', '说明']
      : ['Member', 'Type', 'Default', 'Description'];
  if (groupLabels) labels.unshift(lang === 'zh' ? '分组' : 'Group');
  const rows = members.flatMap((original, index) =>
    (original.callSignatures?.length
      ? original.callSignatures.map(signature => ({ ...original, ...signature }))
      : [original]
    ).map((member, overloadIndex) => {
      const description = member.schemaDescription
        ? escapeMdxText(member.schemaDescription[lang])
        : [member.description, member.details]
            .filter((value): value is string => Boolean(value))
            .map(value => localizeText(value, lang, translate))
            .concat(
              (member.parameters ?? [])
                .filter(parameter => parameter.description)
                .map(
                  parameter =>
                    `${renderTableCode(parameter.name)}: ${localizeText(parameter.description, lang, translate)}`,
                ),
              member.returns
                ? [`${lang === 'zh' ? '返回值' : 'Returns'}: ${localizeText(member.returns, lang, translate)}`]
                : [],
              (member.throws ?? []).map(
                value => `${lang === 'zh' ? '错误' : 'Throws'}: ${localizeText(value, lang, translate)}`,
              ),
            )
            .join('\n');
      const type = member.valueSet
        ? `<ApiValues name=${JSON.stringify(member.valueSet.name)} />${member.valueSet.open ? ' \\| `string`' : ''}`
        : renderTableCode(member.type);
      const name =
        overloadIndex === 0
          ? `${member.name ? `\`${member.readonly ? 'readonly ' : ''}${member.name}${member.optional ? '?' : ''}\`` : ''}${member.label ? (member.name ? ` (${member.label})` : member.label) : ''}`
          : '';
      return `| ${groupLabels ? `${overloadIndex === 0 ? groupLabels[index] : ''} | ` : ''}${name} | ${type} | ${callsOnly ? '' : `${renderDefaultValue(member.defaultValue)} | `}${escapeTableCell(description || '—')} |`;
    }),
  );
  const table = [`| ${labels.join(' | ')} |`, `| ${labels.map(() => '---').join(' | ')} |`, ...rows].join('\n');
  return [
    `<ApiTable${callsOnly ? ' variant="methods"' : ''}${groupLabels ? ' grouped' : ''}>`,
    table,
    '</ApiTable>',
  ].join('\n\n');
};

/** 渲染由公共 JSDoc 提供的实际调用片段 */
const renderExamples = (examples: Array<string>, lang: ApiReferenceLanguage): string => {
  if (examples.length === 0) return '';
  return [
    `**${lang === 'zh' ? '用法' : 'Usage'}**`,
    ...examples.map(example =>
      /^```[\w-]*\n[\s\S]*\n```$/.test(example.trim()) ? example.trim() : `\`\`\`ts\n${example}\n\`\`\``,
    ),
  ].join('\n\n');
};

/** 将函数调用契约合并为单表，同组只在首行显示类别 */
const renderFunctionContract = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
): string => {
  const labels =
    lang === 'zh' ? ['类别', '名称', '类型 / 签名', '说明'] : ['Category', 'Name', 'Type / signature', 'Description'];
  if (symbol.overloads) labels.unshift(lang === 'zh' ? '重载' : 'Overload');
  const rows = (symbol.overloads ?? [symbol]).flatMap((overload, overloadIndex) => {
    const groups = [
      { label: lang === 'zh' ? '泛型' : 'Type parameters', rows: overload.typeParameters },
      { label: lang === 'zh' ? '参数' : 'Parameters', rows: overload.parameters },
      {
        label: lang === 'zh' ? '返回值' : 'Returns',
        rows:
          overload.returnType || overload.returns
            ? [{ name: '', type: overload.returnType, description: overload.returns }]
            : [],
      },
      {
        label: lang === 'zh' ? '错误' : 'Throws',
        rows: overload.throws.map(description => ({ name: '', type: '', description })),
      },
    ];
    let firstRow = true;
    return groups.flatMap(group =>
      group.rows.map((row, index) => {
        const description = [
          symbol.overloads && firstRow ? overload.description : '',
          symbol.overloads && firstRow ? overload.details : '',
          row.description,
        ]
          .filter(Boolean)
          .map(value => localizeText(value, lang, translate))
          .join('\n');
        const overloadLabel = symbol.overloads ? `${firstRow ? overloadIndex + 1 : ''} | ` : '';
        firstRow = false;
        return `| ${overloadLabel}${index === 0 ? group.label : ''} | ${row.name ? renderTableCode(row.name) : '—'} | ${row.type ? renderTableCode(row.type) : '—'} | ${description ? escapeTableCell(description) : '—'} |`;
      }),
    );
  });
  if (rows.length === 0) return '';
  return [
    '<ApiTable variant="parameters">',
    [`| ${labels.join(' | ')} |`, `| ${labels.map(() => '---').join(' | ')} |`, ...rows].join('\n'),
    '</ApiTable>',
  ].join('\n\n');
};

/** 渲染 JSDoc 的非主路径补充说明 */
const renderRemarks = (remarks: string, lang: ApiReferenceLanguage, translate: (source: string) => string): string =>
  remarks
    ? `> **${lang === 'zh' ? '备注' : 'Notes'}${lang === 'zh' ? '：' : ':'}** ${localizeText(remarks, lang, translate)}`
    : '';

/** 渲染版本与弃用等不改变签名的 JSDoc 元数据 */
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
  ];
  return parts.filter(Boolean).join('\n\n');
};

/** 摘要缺失时仍保留公开声明的源码入口 */
const renderSummary = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  asListItem = false,
): string => {
  const summary = localizeText(symbol.description, lang, translate);
  if (!summary && !symbol.source) return '';
  const label = summary || (lang === 'zh' ? '查看源码' : 'View source');
  const content = symbol.source
    ? `<ApiSourceLink label={${JSON.stringify(symbol.name)}} path={${JSON.stringify(symbol.source.path)}} startLine={${symbol.source.startLine}}>${label}</ApiSourceLink>`
    : summary;
  if (asListItem) return `- \`${symbol.name}\`${lang === 'zh' ? '：' : ': '}${content}`;
  return symbol.source ? `<p>${content}</p>` : content;
};

/** 超长推断签名按需展开，参数说明仍保留在主阅读流中 */
const renderSignatureBlock = (signature: string, lang: ApiReferenceLanguage): string => {
  const code = `\`\`\`ts\n${signature}\n\`\`\``;
  if (signature.length <= 2000) return code;
  return `<details>\n<summary>${lang === 'zh' ? '查看完整推断签名' : 'View full inferred signature'}</summary>\n\n${code}\n\n</details>`;
};

/** 将泛型与调用说明投影为同一成员表中的补充行 */
const contractMembers = (
  subjects: Array<ApiReferenceSymbol>,
  lang: ApiReferenceLanguage,
): Array<ApiReferenceMember> => {
  const row = (name: string, type: string, description: string, label: string): ApiReferenceMember => ({
    name,
    type: type || '—',
    description,
    label,
    optional: false,
    defaultValue: '—',
  });
  return subjects.flatMap(subject => [
    ...subject.typeParameters.map(parameter =>
      row(parameter.name, parameter.type, parameter.description, lang === 'zh' ? '泛型' : 'Type parameter'),
    ),
    ...subject.parameters.map(parameter =>
      row(parameter.name, parameter.type, parameter.description, lang === 'zh' ? '参数' : 'Parameter'),
    ),
    ...(subject.returnType || subject.returns
      ? [row('', subject.returnType, subject.returns, lang === 'zh' ? '返回值' : 'Returns')]
      : []),
    ...subject.throws.map(description => row('', '', description, lang === 'zh' ? '错误' : 'Throws')),
  ]);
};

/** 渲染一个公开 API 的常规 MDX 片段 */
const renderSymbol = (
  symbol: ApiReferenceSymbol,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  memberGroups?: ReadonlyArray<ApiReferenceMemberGroup>,
  expandedObject = false,
  indexSignatures: Array<string> = [],
  composition?: ApiReferenceComposition,
  memberGroupDisplay: 'steps' | 'column' = 'steps',
  companion?: ApiReferenceSymbol,
  omitPairedCallDetails = false,
  overloadTabs?: ReadonlyArray<{ value: string; label: Record<ApiReferenceLanguage, string> }>,
): string => {
  const hasMemberViews =
    expandedObject && symbol.members.length > 0 && !symbol.callable && symbol.kind !== ReflectionKind.Class;
  const subjects = companion ? [companion, symbol] : [symbol];
  const mergeMembers = !symbol.callable || symbol.members.length > 0 || Boolean(companion);
  const extraMembers = mergeMembers
    ? contractMembers(
        subjects.map(subject => {
          if (subject === companion && omitPairedCallDetails)
            return { ...subject, parameters: [], returnType: '', returns: '', throws: [] };
          if (
            subject === companion &&
            subject.parameters.length === 1 &&
            subject.parameters[0].type === symbol.name &&
            !subject.parameters[0].description.trim()
          )
            return { ...subject, parameters: [], returnType: subject.returns ? subject.returnType : '' };
          return subject === companion && !subject.returns ? { ...subject, returnType: '' } : subject;
        }),
        lang,
      )
    : [];
  extraMembers.push(
    ...indexSignatures.map(type => ({
      name: '',
      label: lang === 'zh' ? '索引签名' : 'Index signature',
      type,
      description: '',
      optional: false,
      defaultValue: '—',
    })),
  );
  const combined = {
    ...symbol,
    signature: subjects
      .map(subject => subject.overloads?.map(overload => overload.signature).join('\n') || subject.signature)
      .join('\n\n'),
  };
  const hasDetailViews =
    !hasMemberViews &&
    !symbol.branches &&
    !symbol.expandedSignature &&
    (symbol.callable || symbol.kind === ReflectionKind.Class || symbol.members.length > 0 || extraMembers.length > 0);
  const heading = [
    `### ${subjects.map(subject => subject.name).join(' / ')}`,
    companion
      ? subjects
          .map(subject => renderSummary(subject, lang, translate, true))
          .filter(Boolean)
          .join('\n')
      : renderSummary(symbol, lang, translate),
    ...subjects.map(subject => localizeText(subject.details, lang, translate)),
  ];
  if (overloadTabs) {
    const overloads = symbol.overloads ?? [];
    if (
      overloadTabs.length === 0 ||
      overloadTabs.length !== overloads.length ||
      new Set(overloadTabs.map(tab => tab.value)).size !== overloadTabs.length ||
      overloadTabs.some(tab => !tab.value || tab.value === 'definition' || !tab.label.zh || !tab.label.en)
    )
      throw new Error(`Invalid API overload tabs for ${symbol.name}`);
    return [
      ...heading,
      `<DocTabs defaultValue=${JSON.stringify(overloadTabs[0].value)}>`,
      ...overloads.map((overload, index) =>
        [
          `<DocTab value=${JSON.stringify(overloadTabs[index].value)} label=${JSON.stringify(`${lang === 'zh' ? '属性' : 'Members'} · ${overloadTabs[index].label[lang]}`)}>`,
          localizeText(overload.description, lang, translate),
          localizeText(overload.details, lang, translate),
          renderFunctionContract(
            {
              ...overload,
              returns: overload.returns || symbol.returns,
              throws: [...new Set([...symbol.throws, ...overload.throws])],
            },
            lang,
            translate,
          ),
          renderRemarks(overload.remarks || symbol.remarks, lang, translate),
          renderMetadata(symbol, lang, translate),
          renderMetadata(overload, lang, translate),
          renderExamples([...symbol.examples, ...overload.examples], lang),
          '</DocTab>',
        ]
          .filter(Boolean)
          .join('\n\n'),
      ),
      `<DocTab value="definition" label="${lang === 'zh' ? '类型定义' : 'Type definition'}">`,
      renderSignatureBlock(combined.signature, lang),
      '</DocTab>',
      '</DocTabs>',
    ]
      .filter(Boolean)
      .join('\n\n');
  }
  const content = [
    hasDetailViews
      ? ''
      : symbol.branches
        ? [
            `<DocTabs defaultValue=${JSON.stringify(symbol.branches[0].value)}>`,
            ...symbol.branches.map(
              branch =>
                `<DocTab value=${JSON.stringify(branch.value)} label=${JSON.stringify(`${lang === 'zh' ? '属性' : 'Members'} · ${branch.label[lang]}`)}>\n\n${renderMembers(branch.members, lang, translate, undefined, extraMembers)}\n\n</DocTab>`,
            ),
            `<DocTab value="definition" label="${lang === 'zh' ? '类型定义' : 'Type definition'}">`,
            `\`\`\`ts\n${combined.signature}\n\`\`\``,
            '</DocTab>',
            '</DocTabs>',
          ].join('\n\n')
        : hasMemberViews
          ? renderObjectMemberViews(
              combined,
              memberGroups,
              lang,
              translate,
              composition,
              memberGroupDisplay,
              extraMembers,
            )
          : symbol.expandedSignature
            ? renderExpandedSignature(combined, lang)
            : expandedObject ||
                symbol.members.length === 0 ||
                symbol.signature.includes(' & ') ||
                symbol.signature.startsWith('export ')
              ? renderSignatureBlock(combined.signature, lang)
              : '',
    hasMemberViews || symbol.branches
      ? ''
      : renderGroupedMembers(symbol, memberGroups, lang, translate, memberGroupDisplay, extraMembers),
    ...(symbol.overloads ?? []).map(overload =>
      [
        renderRemarks(overload.remarks, lang, translate),
        renderMetadata(overload, lang, translate),
        renderExamples(overload.examples, lang),
      ]
        .filter(Boolean)
        .join('\n\n'),
    ),
    ...subjects.map(subject => (mergeMembers ? '' : renderFunctionContract(subject, lang, translate))),
    ...subjects.map(subject => renderRemarks(subject.remarks, lang, translate)),
    ...subjects.map(subject => renderMetadata(subject, lang, translate)),
    ...subjects.map(subject => renderExamples(subject.examples, lang)),
  ]
    .filter(Boolean)
    .join('\n\n');
  return [
    ...heading,
    hasDetailViews
      ? [
          '<DocTabs defaultValue="members">',
          `<DocTab value="members" label="${lang === 'zh' ? '属性' : 'Members'}">`,
          content || (lang === 'zh' ? '无参数或公开成员' : 'No parameters or public members'),
          '</DocTab>',
          `<DocTab value="definition" label="${lang === 'zh' ? '类型定义' : 'Type definition'}">`,
          renderSignatureBlock(combined.signature, lang),
          '</DocTab>',
          '</DocTabs>',
        ].join('\n\n')
      : content,
  ]
    .filter(Boolean)
    .join('\n\n');
};

/** 将人工审阅的归属映射到源码字段，并拒绝过期或不完整的分类 */
const resolveMemberGroupPlan = (
  symbol: ApiReferenceSymbol,
  key: string,
  plan: ApiReferenceGroupPlan,
): ReadonlyArray<ApiReferenceMemberGroup> => {
  if (new Set(plan.order).size !== plan.order.length) throw new Error(`Repeated API group in ${key}`);
  const fields = new Set(symbol.members.map(member => member.name));
  const assigned = new Set(Object.keys(plan.members));
  const missing = [...fields].filter(name => !assigned.has(name));
  const unknown = [...assigned].filter(name => !fields.has(name));
  if (missing.length > 0 || unknown.length > 0)
    throw new Error(
      `API group fields changed in ${key}: missing ${missing.join(', ') || '—'}; unknown ${unknown.join(', ') || '—'}`,
    );
  const groups = plan.order.map(name => ({
    name,
    members: symbol.members.filter(member => plan.members[member.name] === name).map(member => member.name),
  }));
  if (groups.some(group => group.members.length === 0)) throw new Error(`Empty API group in ${key}`);
  const unordered = symbol.members
    .filter(member => !plan.order.includes(plan.members[member.name]))
    .map(member => member.name);
  if (unordered.length > 0) throw new Error(`API group order omits ${key}: ${unordered.join(', ')}`);
  return groups;
};

/** 按职责展示字段，并拒绝遗漏、重复或失效的分组配置 */
const renderGroupedMembers = (
  symbol: ApiReferenceSymbol,
  groups: ReadonlyArray<ApiReferenceMemberGroup> | undefined,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  display: 'headings' | 'steps' | 'column' = 'headings',
  extraMembers: Array<ApiReferenceMember> = [],
): string => {
  if (groups === undefined) return renderMembers(symbol.members, lang, translate, undefined, extraMembers);
  const remaining = new Map(symbol.members.map(member => [member.name, member]));
  const sections = groups.map(group => {
    const members = group.members.map(name => {
      const member = remaining.get(name);
      if (member === undefined) throw new Error(`Unknown or repeated API member ${symbol.name}.${name}`);
      remaining.delete(name);
      return member;
    });
    const title = group.name === undefined ? group.title[lang] : apiReferenceGroupLabels[group.name][lang];
    return { title, members };
  });
  if (remaining.size > 0)
    throw new Error(`Ungrouped API members of ${symbol.name}: ${[...remaining.keys()].join(', ')}`);
  if (display === 'column' || extraMembers.length > 0) {
    if (symbol.members.length <= 12) return renderMembers(symbol.members, lang, translate, undefined, extraMembers);
    const members = sections.flatMap(section => section.members);
    const labels = sections.flatMap(section => section.members.map((_, index) => (index === 0 ? section.title : '')));
    return renderMembers(members, lang, translate, labels, extraMembers);
  }
  const content = sections.map(section => {
    const table = renderMembers(section.members, lang, translate);
    return display === 'steps' && groups.length > 1
      ? [`<DocStep title=${JSON.stringify(section.title)}>`, table, '</DocStep>'].join('\n\n')
      : display === 'steps'
        ? table
        : [`#### ${section.title}`, table].join('\n\n');
  });
  if (display === 'steps' && groups.length > 1) return ['<DocSteps>', ...content, '</DocSteps>'].join('\n\n');
  return content.join('\n\n');
};

/** 对象参考默认展示字段列表，类型定义按需切换 */
const renderObjectMemberViews = (
  symbol: ApiReferenceSymbol,
  groups: ReadonlyArray<ApiReferenceMemberGroup> | undefined,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  composition?: ApiReferenceComposition,
  memberGroupDisplay: 'steps' | 'column' = 'steps',
  extraMembers: Array<ApiReferenceMember> = [],
): string => {
  const labels =
    lang === 'zh'
      ? { members: composition ? '直接属性' : '属性', definition: '类型定义' }
      : { members: composition ? 'Direct members' : 'Members', definition: 'Type definition' };
  const compositionNote = composition
    ? lang === 'zh'
      ? `其余属性继承自 ${composition.baseTypes.map(value => `\`${value}\``).join('、')}，${composition.omittedMembers.length > 0 ? `并移除 ${composition.omittedMembers.map(value => `\`${value}\``).join('、')}。` : ''}完整组合关系见“类型定义”`
      : `The remaining members are inherited from ${composition.baseTypes.map(value => `\`${value}\``).join(', ')}${composition.omittedMembers.length > 0 ? `, with ${composition.omittedMembers.map(value => `\`${value}\``).join(', ')} removed` : ''}. See “Type definition” for the complete composition.`
    : '';
  return [
    '<DocTabs defaultValue="members">',
    `<DocTab value="members" label=${JSON.stringify(labels.members)}>`,
    compositionNote,
    renderGroupedMembers(symbol, composition ? undefined : groups, lang, translate, memberGroupDisplay, extraMembers),
    '</DocTab>',
    `<DocTab value="definition" label=${JSON.stringify(labels.definition)}>`,
    `\`\`\`ts\n${symbol.signature}\n\`\`\``,
    '</DocTab>',
    '</DocTabs>',
  ].join('\n\n');
};

/** 为无法列出字段的联合别名补充 TypeScript checker 展开的分支 */
const renderExpandedSignature = (symbol: ApiReferenceSymbol, lang: ApiReferenceLanguage): string =>
  symbol.expandedSignature
    ? [
        '<DocTabs defaultValue="expanded">',
        `<DocTab value="expanded" label="${lang === 'zh' ? '展开类型' : 'Expanded type'}">`,
        `\`\`\`ts\n${symbol.expandedSignature}\n\`\`\``,
        '</DocTab>',
        `<DocTab value="definition" label="${lang === 'zh' ? '类型定义' : 'Type definition'}">`,
        renderSignatureBlock(symbol.signature, lang),
        '</DocTab>',
        '</DocTabs>',
      ].join('\n\n')
    : '';

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
      '@template',
      '@typeParam',
      '@deprecated',
      '@since',
    ],
  });
  let programs: ReadonlyArray<ts.Program> = [];
  app.converter.on(Converter.EVENT_BEGIN, context => {
    programs = context.programs;
  });
  const project = await app.convert();
  if (!project) throw new Error(`TypeDoc 未能解析 ${config.packageName} 公开入口`);
  const output = app.serializer.projectToObject(project, normalizePath(repositoryRoot));
  const children = output.children ?? [];
  const entrySymbols =
    config.entries.length === 1 ? [children] : config.entries.map((_, index) => children[index]?.children ?? []);

  const sections = await Promise.all(
    config.entries.map(async (entry, index) => {
      const exported = entrySymbols[index] ?? [];
      const program = programs.find(item => item.getSourceFile(entry.source) !== undefined);
      const sourceFile = program?.getSourceFile(entry.source);
      if (!program || !sourceFile) throw new Error(`Missing TypeScript entry point ${entry.source}`);
      for (const name of entry.symbols ?? []) {
        if (!exported.some(symbol => symbol.name === name)) {
          throw new Error(`Missing public API ${name} in ${entry.source}`);
        }
      }
      const symbols = await Promise.all(
        exported
          .filter(symbol => entry.symbols === undefined || entry.symbols.includes(symbol.name))
          .filter(
            symbol =>
              !(
                symbol.kind === ReflectionKind.Namespace &&
                exported.some(other => other.name === symbol.name && other.kind === ReflectionKind.Variable)
              ),
          )
          .map(async reflection => {
            const symbol = toSymbol(reflection, config.packageDirectory);
            const showFullMembers = entry.fullMemberSymbols?.includes(symbol.name) === true;
            const declarationOnly = entry.declarationOnlySymbols?.includes(symbol.name) === true;
            const schemaUrl = config.schemaReferences?.[symbol.name];
            if (!schemaUrl) {
              const resolved =
                reflection.kind === ReflectionKind.TypeAlias || reflection.kind === ReflectionKind.Interface
                  ? resolveObjectMembers(program, sourceFile, symbol.name)
                  : undefined;
              const sourceSignature = resolveSourceSignature(program, sourceFile, symbol.name, symbol.signature);
              if (resolved) {
                let members =
                  (showFullMembers ? resolved.members : (resolved.directMembers ?? resolved.members)) ??
                  (symbol.callable ? symbol.members : []);
                const schemaNames = new Set(
                  members.map(member => member.schemaName).filter(name => name !== undefined),
                );
                for (const schemaName of config.schemaLocalizations ? schemaNames : []) {
                  const exports = (await import(config.schemaPackageName ?? config.packageName)) as Record<
                    string,
                    unknown
                  >;
                  const [rootName, ...fieldPath] = schemaName.split('.');
                  const rootSchema = exports[rootName];
                  const schemaMembers = members.filter(member => member.schemaName === schemaName);
                  const schema =
                    rootSchema instanceof z.ZodType
                      ? nestedObjectSchema(
                          rootSchema,
                          fieldPath,
                          schemaMembers.map(member => member.name),
                        )
                      : undefined;
                  if (!schema) throw new Error(`Missing unambiguous object Schema ${schemaName}`);
                  const publicName =
                    fieldPath.length === 0
                      ? rootName
                      : Object.keys(exports).find(
                          name => exports[name] === schema && config.schemaLocalizations?.[name],
                        );
                  const localization = publicName ? config.schemaLocalizations?.[publicName] : undefined;
                  if (!localization)
                    throw new Error(
                      `Missing ${schemaName} Schema localization for ${config.packageName}#${symbol.name}`,
                    );
                  const projected = new Map(
                    projectSchemaMembers(
                      members.filter(member => member.schemaName === schemaName),
                      schema,
                      schemaName,
                      localization,
                    ).map(member => [member.name, member]),
                  );
                  members = members.map(member => projected.get(member.name) ?? member);
                }
                symbol.members = (declarationOnly ? [] : members).map(member => ({
                  ...member,
                  defaultValue: localizeText(member.defaultValue, lang, config.translate),
                }));
                symbol.signature = resolved.signature;
                symbol.expandedSignature = resolved.expandedSignature;
                if (resolved.branches) {
                  const key = `${config.packageName}#${symbol.name}`;
                  const labels = apiReferenceBranchLabels[key];
                  if (!labels || labels.length !== resolved.branches.length)
                    throw new Error(`Missing or stale API branch labels for ${key}`);
                  const used = new Set<string>();
                  symbol.branches = resolved.branches.map(branchMembers => {
                    const matches = labels.filter(label =>
                      branchMembers.some(member => member.name === label.field && member.type === label.type),
                    );
                    const label = matches[0];
                    if (matches.length !== 1 || used.has(label.value))
                      throw new Error(`Ambiguous or duplicate API branch label for ${key}`);
                    used.add(label.value);
                    return { value: label.value, label: label.label, members: branchMembers };
                  });
                }
              }
              const valueSets = entry.memberValueSets?.[symbol.name];
              if (valueSets) {
                for (const name of Object.keys(valueSets)) {
                  if (!symbol.members.some(member => member.name === name))
                    throw new Error(`Unknown API value set member ${symbol.name}.${name}`);
                }
                symbol.members = symbol.members.map(member => ({ ...member, valueSet: valueSets[member.name] }));
              }
              const typeLabels = entry.memberTypeLabels?.[symbol.name];
              if (typeLabels) {
                for (const name of Object.keys(typeLabels)) {
                  if (!symbol.members.some(member => member.name === name))
                    throw new Error(`Unknown API type label member ${symbol.name}.${name}`);
                }
                symbol.members = symbol.members.map(member => ({
                  ...member,
                  type: typeLabels[member.name] ?? member.type,
                }));
              }
              if (!symbol.overloads) {
                const checker = program.getTypeChecker();
                const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
                let exportedSymbol =
                  moduleSymbol && checker.getExportsOfModule(moduleSymbol).find(item => item.name === symbol.name);
                if (exportedSymbol && exportedSymbol.flags & ts.SymbolFlags.Alias)
                  exportedSymbol = checker.getAliasedSymbol(exportedSymbol);
                const declaration = exportedSymbol?.declarations?.[0];
                const signatures =
                  exportedSymbol && declaration
                    ? checker.getSignaturesOfType(
                        checker.getTypeOfSymbolAtLocation(exportedSymbol, declaration),
                        ts.SignatureKind.Call,
                      )
                    : [];
                if (
                  declaration &&
                  (ts.isTypeAliasDeclaration(declaration) ||
                    ts.isInterfaceDeclaration(declaration) ||
                    ts.isClassDeclaration(declaration))
                ) {
                  symbol.typeParameters = symbol.typeParameters.map(parameter => {
                    const source = declaration.typeParameters?.find(item => item.name.text === parameter.name);
                    return source
                      ? {
                          ...parameter,
                          type: [
                            source.constraint ? `extends ${source.constraint.getText()}` : '',
                            source.default ? `= ${source.default.getText()}` : '',
                          ]
                            .filter(Boolean)
                            .join(' '),
                        }
                      : parameter;
                  });
                }
                symbol.callable ||= signatures.length > 0;
                const primarySignature = signatures[0];
                if (signatures.length > 0) {
                  const signatureDeclaration = primarySignature.getDeclaration();
                  if (
                    ts.isArrowFunction(signatureDeclaration) ||
                    ts.isFunctionDeclaration(signatureDeclaration) ||
                    ts.isFunctionExpression(signatureDeclaration)
                  ) {
                    symbol.parameters = symbol.parameters.map((parameter, parameterIndex) => {
                      const source = signatureDeclaration.parameters.at(parameterIndex);
                      return source
                        ? {
                            ...parameter,
                            name: `${source.dotDotDotToken ? '...' : ''}${source.name.getText()}${source.questionToken || source.initializer ? '?' : ''}`,
                            type: source.type?.getText() ?? parameter.type,
                          }
                        : parameter;
                    });
                  }

                  symbol.typeParameters = symbol.typeParameters.map(parameter => {
                    const source = signatureDeclaration.typeParameters?.find(item => item.name.text === parameter.name);
                    return source
                      ? {
                          ...parameter,
                          type: [
                            source.constraint ? `extends ${source.constraint.getText()}` : '',
                            source.default ? `= ${source.default.getText()}` : '',
                          ]
                            .filter(Boolean)
                            .join(' '),
                        }
                      : parameter;
                  });
                  symbol.returnType =
                    signatureDeclaration.type?.getText() ||
                    symbol.returnType ||
                    checker.typeToString(
                      primarySignature.getReturnType(),
                      signatureDeclaration,
                      ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrayAsGenericType,
                    );
                }
                if (signatures.length > 1 && declaration)
                  symbol.overloads = signatures.map(signature => {
                    const overloadDeclaration = signature.getDeclaration();
                    const tags = signature.getJsDocTags();
                    const tag = (name: string): string =>
                      tags
                        .filter(item => item.name === name)
                        .map(item => ts.displayPartsToString(item.text))
                        .join('\n\n');
                    return {
                      ...symbol,
                      overloads: undefined,
                      signature: ts
                        .createPrinter({ removeComments: true })
                        .printNode(
                          ts.EmitHint.Unspecified,
                          signature.getDeclaration(),
                          signature.getDeclaration().getSourceFile(),
                        ),
                      description: ts.displayPartsToString(signature.getDocumentationComment(checker)),
                      details: tag('description'),
                      remarks: tag('remarks'),
                      returns: tag('returns') || tag('return'),
                      returnType:
                        overloadDeclaration.type?.getText() ??
                        checker.typeToString(
                          signature.getReturnType(),
                          declaration,
                          ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.WriteArrayAsGenericType,
                        ),
                      throws: tags
                        .filter(item => item.name === 'throws' || item.name === 'exception')
                        .map(item => ts.displayPartsToString(item.text)),
                      deprecated: tag('deprecated'),
                      since: tag('since'),
                      examples: tags
                        .filter(item => item.name === 'example')
                        .map(item => ts.displayPartsToString(item.text).trim()),
                      parameters: signature.parameters.map((parameter, parameterIndex) => {
                        const source = overloadDeclaration.parameters.at(parameterIndex);
                        return {
                          name: source
                            ? `${source.dotDotDotToken ? '...' : ''}${source.name.getText()}${source.questionToken || source.initializer ? '?' : ''}`
                            : parameter.name,
                          type:
                            source?.type?.getText() ??
                            checker.typeToString(
                              checker.getTypeOfSymbolAtLocation(parameter, declaration),
                              declaration,
                              ts.TypeFormatFlags.NoTruncation,
                            ),
                          description: ts.displayPartsToString(parameter.getDocumentationComment(checker)),
                        };
                      }),
                      typeParameters: (signature.typeParameters ?? []).map((parameter, parameterIndex) => {
                        const source = overloadDeclaration.typeParameters?.at(parameterIndex);
                        const constraint =
                          source?.constraint?.getText() ??
                          (parameter.getConstraint()
                            ? checker.typeToString(
                                parameter.getConstraint()!,
                                declaration,
                                ts.TypeFormatFlags.NoTruncation,
                              )
                            : '');
                        const defaultType =
                          source?.default?.getText() ??
                          (parameter.getDefault()
                            ? checker.typeToString(
                                parameter.getDefault()!,
                                declaration,
                                ts.TypeFormatFlags.NoTruncation,
                              )
                            : '');
                        return {
                          name: parameter.symbol.name,
                          type: [constraint ? `extends ${constraint}` : '', defaultType ? `= ${defaultType}` : '']
                            .filter(Boolean)
                            .join(' '),
                          description: ts.displayPartsToString(parameter.symbol.getDocumentationComment(checker)),
                        };
                      }),
                    };
                  });
              }
              if (sourceSignature) symbol.signature = sourceSignature;
              const groupKey = `${config.packageName}#${symbol.name}`;
              const groupPlan = apiReferenceMemberGroups[groupKey];
              if (groupPlan && entry.memberGroups?.[symbol.name])
                throw new Error(`Conflicting API member groups for ${groupKey}`);
              const memberGroups = groupPlan
                ? resolveMemberGroupPlan(symbol, groupKey, groupPlan)
                : entry.memberGroups?.[symbol.name];
              return {
                symbol,
                render: (companion?: ApiReferenceSymbol) =>
                  renderSymbol(
                    symbol,
                    lang,
                    config.translate,
                    memberGroups,
                    resolved?.members !== undefined,
                    resolved?.indexSignatures,
                    showFullMembers ? undefined : resolved?.composition,
                    groupPlan ? 'column' : 'steps',
                    companion,
                    entry.omitPairedCallDetails,
                    entry.overloadTabs?.[symbol.name],
                  ),
              };
            }
            return {
              symbol,
              render: () =>
                [
                  `### ${symbol.name}`,
                  renderSummary(symbol, lang, config.translate),
                  `[${lang === 'zh' ? 'Schema 参考' : 'Schema reference'}](${schemaUrl})`,
                ]
                  .filter(Boolean)
                  .join('\n\n'),
            };
          }),
      );
      const remaining = new Map(symbols.map(item => [item.symbol.name, item]));
      const paired = (entry.symbolPairs ?? []).map(([entryName, inputName]) => {
        const entrySymbol = remaining.get(entryName);
        const inputSymbol = remaining.get(inputName);
        if (!entrySymbol || !inputSymbol || entryName === inputName || config.schemaReferences?.[inputName])
          throw new Error(`Unknown, repeated or unsupported API pair ${entryName} / ${inputName}`);
        remaining.delete(entryName);
        remaining.delete(inputName);
        return inputSymbol.render(entrySymbol.symbol);
      });
      return [`## ${entry.title[lang]}`, ...paired, ...[...remaining.values()].map(item => item.render())].join('\n\n');
    }),
  );
  return sections.join('\n\n');
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
