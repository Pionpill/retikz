import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { JSONOutput } from 'typedoc';
import { Application, Converter, normalizePath, OptionDefaults, ReflectionKind } from 'typedoc';
import ts from 'typescript';

import { translateTexApiReference } from './tex.en';

const docsRoot = path.resolve(import.meta.dirname, '../..');
const repositoryRoot = path.resolve(docsRoot, '../..');
export type ApiReferenceLanguage = 'zh' | 'en';

export type ApiReferenceEntry = {
  source: string;
  /** 组件参考按公开标识符筛选；省略时收录入口全部导出 */
  symbols?: ReadonlyArray<string>;
  /** 为指定公开类型按职责分组，字段说明仍从 TypeDoc 读取 */
  memberGroups?: Readonly<Record<string, ReadonlyArray<ApiReferenceMemberGroup>>>;
  title: Record<ApiReferenceLanguage, string>;
};

/** API 字段的阅读分组，不复制字段类型或描述 */
export type ApiReferenceMemberGroup = {
  title: Record<ApiReferenceLanguage, string>;
  members: ReadonlyArray<string>;
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
  readonly?: boolean;
  type: string;
  description: string;
  /** 字段的较长约束，放在表格后避免撑宽单元格 */
  details?: string;
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
  signature: string;
  expandedSignature?: string;
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
    description:
      renderComment(parameter.comment) ||
      typeParameterDescriptionFromTags([signature?.comment, reflection.comment], parameter.name),
  }));

/** 从 declaration 提取可查询的对象成员 */
const toMembers = (reflection: JSONOutput.DeclarationReflection): Array<ApiReferenceMember> =>
  (reflection.children ?? [])
    .filter(member => member.flags.isInherited !== true)
    .map(member => ({
      name: member.name,
      optional: member.flags.isOptional === true,
      readonly: member.flags.isReadonly === true,
      type: member.signatures?.length ? member.signatures.map(renderSignature).join('; ') : renderType(member.type),
      description: renderComment(member.comment),
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
      directMembers?: Array<ApiReferenceMember>;
      composition?: ApiReferenceComposition;
      signature: string;
      expandedSignature?: string;
      indexSignatures?: Array<string>;
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
  const type = checker.getDeclaredTypeOfSymbol(symbol);
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
      return hasMember(node) ? `${print(node)}['${memberName}']` : undefined;
    };
    return visit(declaration.type);
  };
  const expandedSignature = (() => {
    if (!ts.isTypeAliasDeclaration(declaration) || !type.isUnion()) return undefined;
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
  })();
  if (!isObject(type)) return { signature, expandedSignature };
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
  if (hasUnresolvedMapping(type)) return { signature };
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
  const members = checker.getPropertiesOfType(type).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const resolvedMembers = members.map(member => {
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
        ? declaredType.getText()
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
      optional,
      readonly: isReadonly(type, member),
      type: fullType.length > MAX_MEMBER_TYPE_CHARACTERS ? memberTypeReference(member.name) || '…' : fullType,
      description,
      details: tagText('description'),
      defaultValue: tagText('default') || tagText('defaultValue') || '—',
    };
  });
  const membersTextLength = resolvedMembers.reduce(
    (length, member) =>
      length + member.name.length + member.type.length + member.description.length + member.details.length,
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
    if (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
      return `export declare ${declarationKind} ${declaration.name.getText()}: ${declaration.type ? print(declaration.type) : fallbackSignature};`;
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
      const overloads = callSignatures.map(signature => {
        const signatureDeclaration = signature.getDeclaration();
        if (ts.isCallSignatureDeclaration(signatureDeclaration))
          return printer
            .printNode(ts.EmitHint.Unspecified, signatureDeclaration, signatureDeclaration.getSourceFile())
            .replace(/;$/, '');
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
        [],
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

/** 转义正文中的 MDX 语法字符，保留 Markdown 代码片段 */
const escapeMdxText = (value: string): string =>
  value.replace(/(`+)[\s\S]*?\1|[<{}]/g, part =>
    part.startsWith('`') ? part : part === '<' ? '&lt;' : part === '{' ? '&#123;' : '&#125;',
  );

/** 中文是 JSDoc 真源；英文只采用受审查的翻译产物 */
const localizeText = (value: string, lang: ApiReferenceLanguage, translate: (source: string) => string): string =>
  escapeMdxText(lang === 'en' ? translate(value) : value);

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
    const description = [member.description, member.details]
      .filter((value): value is string => Boolean(value))
      .map(value => localizeText(value, lang, translate))
      .join('\n');
    return `| \`${member.readonly ? 'readonly ' : ''}${member.name}${member.optional ? '?' : ''}\` | \`${escapeTableCell(member.type)}\` | ${renderDefaultValue(member.defaultValue)} | ${escapeTableCell(description || '—')} |`;
  });
  const table = [`| ${labels.join(' | ')} |`, '| --- | --- | --- | --- |', ...rows].join('\n');
  return table;
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
  memberGroups?: ReadonlyArray<ApiReferenceMemberGroup>,
  expandedObject = false,
  indexSignatures: Array<string> = [],
  composition?: ApiReferenceComposition,
): string => {
  const hasMemberViews = expandedObject && symbol.members.length > 0;
  return [
    `### ${symbol.name}`,
    renderSummary(symbol, lang, translate),
    localizeText(symbol.details, lang, translate),
    hasMemberViews
      ? renderObjectMemberViews(symbol, memberGroups, lang, translate, composition)
      : expandedObject ||
          symbol.members.length === 0 ||
          symbol.signature.includes(' & ') ||
          symbol.signature.startsWith('export ')
        ? `\`\`\`ts\n${symbol.signature}\n\`\`\``
        : '',
    renderExpandedSignature(symbol, lang),
    hasMemberViews ? '' : renderGroupedMembers(symbol, memberGroups, lang, translate),
    indexSignatures.length > 0
      ? `#### ${lang === 'zh' ? '索引签名' : 'Index signatures'}\n\n\`\`\`ts\n${indexSignatures.join(';\n')}\n\`\`\``
      : '',
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
};

/** 按职责展示字段，并拒绝遗漏、重复或失效的分组配置 */
const renderGroupedMembers = (
  symbol: ApiReferenceSymbol,
  groups: ReadonlyArray<ApiReferenceMemberGroup> | undefined,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  asSteps = false,
): string => {
  if (groups === undefined) return renderMembers(symbol.members, lang, translate);
  const remaining = new Map(symbol.members.map(member => [member.name, member]));
  const sections = groups.map(group => {
    const members = group.members.map(name => {
      const member = remaining.get(name);
      if (member === undefined) throw new Error(`Unknown or repeated API member ${symbol.name}.${name}`);
      remaining.delete(name);
      return member;
    });
    const content = renderMembers(members, lang, translate);
    return asSteps && groups.length > 1
      ? [`<DocStep title=${JSON.stringify(group.title[lang])}>`, content, '</DocStep>'].join('\n\n')
      : asSteps
        ? content
        : [`#### ${group.title[lang]}`, content].join('\n\n');
  });
  if (remaining.size > 0)
    throw new Error(`Ungrouped API members of ${symbol.name}: ${[...remaining.keys()].join(', ')}`);
  if (asSteps && groups.length > 1) return ['<DocSteps>', ...sections, '</DocSteps>'].join('\n\n');
  return sections.join('\n\n');
};

/** 对象参考默认展示字段列表，类型定义按需切换 */
const renderObjectMemberViews = (
  symbol: ApiReferenceSymbol,
  groups: ReadonlyArray<ApiReferenceMemberGroup> | undefined,
  lang: ApiReferenceLanguage,
  translate: (source: string) => string,
  composition?: ApiReferenceComposition,
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
    renderGroupedMembers(symbol, composition ? undefined : groups, lang, translate, true),
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
    ? `#### ${lang === 'zh' ? '展开类型' : 'Expanded type'}\n\n\`\`\`ts\n${symbol.expandedSignature}\n\`\`\``
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

  return config.entries
    .map((entry, index) => {
      const exported = entrySymbols[index] ?? [];
      const program = programs.find(item => item.getSourceFile(entry.source) !== undefined);
      const sourceFile = program?.getSourceFile(entry.source);
      if (!program || !sourceFile) throw new Error(`Missing TypeScript entry point ${entry.source}`);
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
        .map(reflection => {
          const symbol = toSymbol(reflection, config.packageDirectory);
          const schemaUrl = config.schemaReferences?.[symbol.name];
          if (!schemaUrl) {
            const resolved =
              reflection.kind === ReflectionKind.TypeAlias || reflection.kind === ReflectionKind.Interface
                ? resolveObjectMembers(program, sourceFile, symbol.name)
                : undefined;
            const sourceSignature = resolveSourceSignature(program, sourceFile, symbol.name, symbol.signature);
            if (resolved) {
              symbol.members = (resolved.members ?? []).map(member => ({
                ...member,
                defaultValue: localizeText(member.defaultValue, lang, config.translate),
              }));
              if (resolved.directMembers) {
                symbol.members = resolved.directMembers.map(member => ({
                  ...member,
                  defaultValue: localizeText(member.defaultValue, lang, config.translate),
                }));
              }
              symbol.signature = resolved.signature;
              symbol.expandedSignature = resolved.expandedSignature;
            }
            if (sourceSignature) symbol.signature = sourceSignature;
            return renderSymbol(
              symbol,
              lang,
              config.translate,
              entry.memberGroups?.[symbol.name],
              resolved?.members !== undefined,
              resolved?.indexSignatures,
              resolved?.composition,
            );
          }
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
