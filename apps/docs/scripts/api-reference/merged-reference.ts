import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

import { referenceGroups } from './reference-groups';
import type { ApiReferenceLanguage } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');
const contents = path.join(root, 'apps/docs/src/modules/docs/contents');

/** 源码声明位置及原始类型表达式，不复制生产契约 */
type Declaration = { name: string; path: string; startLine: number; text: string };
let declarations: Map<string, Array<Declaration>> | undefined;
let schemaNames: Map<string, string> | undefined;

/** 文档注册名可能加 owner 前缀；源码标题仍使用真实公开名称 */
export const schemaReferenceName = (name: string): string => {
  if (!schemaNames) {
    schemaNames = new Map();
    const source = ts.createSourceFile(
      'registry.ts',
      readFileSync(path.join(contents, '../components/mdx-content/zod-schema/schema-registry.ts'), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const namespaces = new Set(
      source.statements.filter(ts.isImportDeclaration).flatMap(statement => {
        const bindings = statement.importClause?.namedBindings;
        return bindings && ts.isNamespaceImport(bindings) ? [bindings.name.text] : [];
      }),
    );
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
        const schema = node.initializer.properties
          .filter(ts.isPropertyAssignment)
          .find(item => item.name.getText(source) === 'schema')?.initializer;
        if (
          schema &&
          ts.isPropertyAccessExpression(schema) &&
          ts.isIdentifier(schema.expression) &&
          namespaces.has(schema.expression.text)
        )
          schemaNames!.set(node.name.getText(source).replace(/['"]/gu, ''), schema.name.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return schemaNames.get(name) ?? name;
};

/** 从真实声明索引源码位置；只遍历 packages 源码清单 */
const sourceDeclarations = (): Map<string, Array<Declaration>> => {
  if (declarations) return declarations;
  declarations = new Map();
  const files = execFileSync('rg', ['--files', 'packages'], { cwd: root, encoding: 'utf8' })
    .trim()
    .split(/\r?\n/u)
    .map(file => file.replaceAll('\\', '/'))
    .filter(file => /\/src\/.*\.tsx?$/u.test(file))
    .sort();
  for (const filePath of files) {
    const file = ts.createSourceFile(
      filePath,
      readFileSync(path.join(root, filePath), 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of file.statements) {
      const nodes = ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [statement];
      for (const node of nodes) {
        if (
          !(
            ts.isVariableDeclaration(node) ||
            ts.isFunctionDeclaration(node) ||
            ts.isTypeAliasDeclaration(node) ||
            ts.isInterfaceDeclaration(node) ||
            ts.isEnumDeclaration(node) ||
            ts.isClassDeclaration(node)
          )
        )
          continue;
        if (!node.name || !ts.isIdentifier(node.name)) continue;
        const name = node.name.text;
        const item = {
          name,
          path: filePath,
          startLine: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          text: ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, node, file).trim(),
        };
        const items = declarations.get(name) ?? [];
        items.push(item);
        declarations.set(name, items);
      }
    }
  }
  return declarations;
};

/** 查询实际声明；同名符号按已有源码入口的包边界定位 */
export const referenceDeclaration = (name: string, hints: ReadonlyArray<string> = []): Declaration => {
  const candidates = sourceDeclarations().get(name) ?? [];
  const hinted = candidates.filter(item => hints.some(hint => item.path.startsWith(hint)));
  const selected = hinted.length ? hinted : candidates;
  if (new Set(selected.map(item => item.path)).size !== 1)
    throw new Error(
      `Ambiguous or missing reference declaration: ${name}: ${selected.map(item => item.path).join(', ')}`,
    );
  return selected[0];
};

/** 名称直接打开自己的源码声明 */
export const referenceSourceTitle = (name: string, hints: ReadonlyArray<string> = []): string => {
  const actualName = name.endsWith('Schema') ? schemaReferenceName(name) : name;
  const item = referenceDeclaration(actualName, hints);
  return `<ApiSourceLink label={${JSON.stringify(actualName)}} path={${JSON.stringify(item.path)}} startLine={${item.startLine}}>${actualName}</ApiSourceLink>`;
};

/** 只关联声明中明确引用该 Schema 的公开派生类型，保留各自原始定义 */
export const schemaReferenceTypes = (schemaName: string, hints: ReadonlyArray<string>): Array<Declaration> => {
  const actualName = schemaReferenceName(schemaName);
  return [...sourceDeclarations().values()]
    .flat()
    .filter(
      item =>
        hints.some(hint => item.path.startsWith(hint)) &&
        /^export type /u.test(item.text) &&
        item.text.includes(`typeof ${actualName}>`) &&
        new Set([...item.text.matchAll(/typeof (\w+Schema)\b/gu)].map(match => match[1])).size === 1,
    );
};

/** 代码围栏内的标题不作为参考单元 */
export const splitReferenceSections = (source: string, levels = '2,4'): Array<{ name: string; body: string }> => {
  const sections: Array<{ name: string; body: string }> = [];
  let name = '';
  let lines: Array<string> = [];
  let fence: string | undefined;
  const finish = () => {
    if (name || lines.some(line => line.trim())) sections.push({ name, body: lines.join('\n').trim() });
  };
  const pattern = new RegExp(`^#{${levels}} (.+)$`, 'u');
  for (const line of source.split(/\r?\n/u)) {
    const marker = line.match(/^(`{3,}|~{3,})/u)?.[1];
    if (marker) {
      if (fence === undefined) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
    }
    const heading = fence === undefined ? line.match(pattern) : null;
    if (heading) {
      finish();
      name = heading[1];
      lines = [];
    } else lines.push(line);
  }
  finish();
  return sections;
};

/** Schema 页签与既有属性、分支、定义保持同层 */
export const appendSchemaTab = (body: string, schema: string, lang: ApiReferenceLanguage): string => {
  const tab = `<DocTab value="schema" label="Schema">\n\n${schema}\n\n</DocTab>`;
  const closing = body.lastIndexOf('</DocTabs>');
  if (closing >= 0) return `${body.slice(0, closing)}${tab}\n\n${body.slice(closing)}`;
  const declaration = body.match(/```(?:ts|tsx)\n[\s\S]*?\n```/u)?.[0];
  const label = lang === 'zh' ? '类型定义' : 'Type definition';
  if (declaration)
    return body.replace(
      declaration,
      `<DocTabs defaultValue="definition">\n\n<DocTab value="definition" label="${label}">\n\n${declaration}\n\n</DocTab>\n\n${tab}\n\n</DocTabs>`,
    );
  return `<DocTabs defaultValue="members">\n\n<DocTab value="members" label="${lang === 'zh' ? '属性' : 'Members'}">\n\n${body}\n\n</DocTab>\n\n${tab}\n\n</DocTabs>`;
};

/** 合并源码生成的 API 与既有 Schema 说明，收录边界不扩张 */
export const createMergedReferenceMdx = (
  source: string,
  schemaSource: string,
  owner: string,
  lang: ApiReferenceLanguage,
  embedded = false,
): string => {
  const apiSections = splitReferenceSections(source, /^### /mu.test(source) ? '3' : '4').filter(
    section => section.name,
  );
  const sourceHints = [...source.matchAll(/path=\{?(['"])(.*?)\1/gu)].map(
    match => match[2].split('/src/')[0] + '/src/',
  );
  const schemas = new Map<string, string>();
  const supplements: Array<string> = [];
  for (const section of splitReferenceSections(schemaSource.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/u, ''))) {
    const name = section.name.replaceAll('`', '');
    if (/^[A-Za-z]\w*Schema$/u.test(name)) {
      if (schemas.has(name)) throw new Error(`Repeated Schema: ${owner}#${name}`);
      schemas.set(name, section.body);
    } else if (section.body) supplements.push(section.name ? `**${section.name}**\n\n${section.body}` : section.body);
  }
  const units = new Map<string, { title: string; body: string }>();
  for (const section of apiSections) {
    // 后一个包标签属于下一个单元，包信息在页面入口中说明
    let body = section.body.replace(/\n(?:## |\*\*`@retikz\/)[\s\S]*$/u, '').trim();
    const names = section.name.split(' / ');
    const links = [...body.matchAll(/<ApiSourceLink\b[\s\S]*?<\/ApiSourceLink>/gu)];
    const paths = links
      .map(link => link[0].match(/path=\{?(['"])(.*?)\1/u)?.[2])
      .filter((item): item is string => Boolean(item));
    const hints = paths.map(item => item.split('/src/')[0] + '/src/');
    const titleParts = names.map(name => {
      const link = links.find(item => item[0].match(/label=\{?(['"])(.*?)\1/u)?.[2] === name);
      if (link) return `${link[0].slice(0, link[0].indexOf('>') + 1).replace(/\s+/gu, ' ')}${name}</ApiSourceLink>`;
      return referenceSourceTitle(name, hints);
    });
    body = body
      .replace(/^<p>\s*<ApiSourceLink\b[\s\S]*?<\/ApiSourceLink>\s*<\/p>\s*/u, '')
      .replace(/^- `[^`]+`[：:]\s*<ApiSourceLink\b[\s\S]*?<\/ApiSourceLink>\s*\n?/gmu, '')
      .replace(/^\[(?:Schema 参考|Schema reference)\]\([^\n]+\)\s*$/gmu, '')
      .trim();
    const matching = new Set<string>();
    for (const name of names) {
      const symbolPath = paths.find(item =>
        (sourceDeclarations().get(name) ?? []).some(declaration => declaration.path === item),
      );
      const declaration = referenceDeclaration(name, symbolPath ? [symbolPath] : hints);
      const derived = declaration.text.match(
        /^(?:export\s+)?type\s+\w+\s*=\s*(?:z\.)?(?:input|output|infer|ZodInfer|ZodInput|ZodOutput)<typeof\s+(\w+)>\s*;?$/u,
      )?.[1];
      if (derived && schemas.has(derived)) matching.add(derived);
      if (schemas.has(name)) matching.add(name);
    }
    if (matching.size > 1) throw new Error(`Multiple Schema pairings: ${owner}#${section.name}`);
    for (const schemaName of matching) {
      const schema = schemas.get(schemaName)!;
      schemas.delete(schemaName);
      if (!names.includes(schemaName)) titleParts.push(referenceSourceTitle(schemaName, hints));
      body = names.includes(schemaName) ? schema : appendSchemaTab(body, schema, lang);
    }
    if (units.has(section.name)) throw new Error(`Repeated API: ${owner}#${section.name}`);
    units.set(section.name, { title: titleParts.join(' / '), body });
  }
  const groups = referenceGroups[owner];
  if (!groups) throw new Error(`Missing capability groups: ${owner}`);
  const sections = groups
    .map(group => {
      const members = group.members.map(name => {
        const unit = units.get(name);
        if (!unit) throw new Error(`Missing or repeated reference member: ${owner}#${name}`);
        units.delete(name);
        return `#### ${unit.title}\n\n${unit.body}`;
      });
      for (const name of group.schemas ?? []) {
        const schema = schemas.get(name);
        if (schema === undefined) continue; // 已配对类型的 Schema 不重复建立单元
        schemas.delete(name);
        members.push(`#### ${referenceSourceTitle(name, sourceHints)}\n\n${schema}`);
      }
      return members.length
        ? `${embedded ? `**${group.title[lang]}**` : `## ${group.title[lang]}`}\n\n${members.join('\n\n')}`
        : '';
    })
    .filter(Boolean);
  if (units.size || schemas.size)
    throw new Error(`Ungrouped references: ${owner}: ${[...units.keys(), ...schemas.keys()].join(', ')}`);
  return [...supplements, ...sections].join('\n\n');
};

/** 所有生成命令共用同一最终投影，不依赖二次手工整理 */
export const writeReferenceFile = (file: string, source: string, _encoding: 'utf8', referenceOwner?: string): void => {
  void _encoding;
  const directory = path.dirname(file);
  const owner =
    referenceOwner ??
    path
      .relative(contents, path.dirname(directory))
      .replaceAll('\\', '/')
      .replace(/\/reference$/u, '');
  const embedded = referenceOwner === undefined && !path.dirname(directory).endsWith(`${path.sep}reference`);
  const lang = file.endsWith('.zh.mdx') ? 'zh' : 'en';
  const schemaPath = path.join(
    referenceOwner ? path.join(contents, owner, 'reference/_includes') : directory,
    `schemas.${lang}.mdx`,
  );
  const schema = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : '';
  const comment = source.match(/^\{\/\*[^\n]+\*\/\}/u)?.[0] ?? '{/* Generated reference. Do not edit manually. */}';
  writeFileSync(file, `${comment}\n\n${createMergedReferenceMdx(source, schema, owner, lang, embedded)}\n`, 'utf8');
};
