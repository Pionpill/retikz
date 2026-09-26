import { readFileSync } from 'node:fs';
import path from 'node:path';

import ts from 'typescript';

/** 从 Schema 页现有的字面量翻译读取字段说明，不在 API 配置中复制中文真源 */
const readListSchemaDescriptions = (): Readonly<Record<string, string>> => {
  const source = readFileSync(
    path.resolve(import.meta.dirname, '../../src/modules/docs/contents/library/standard/container/list/index.zh.mdx'),
    'utf8',
  );
  for (const tag of source.matchAll(/<ZodSchema\b[\s\S]*?\/>/g)) {
    const file = ts.createSourceFile(
      'schema.tsx',
      `const schema = (${tag[0]});`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const statement = file.statements[0];
    if (!ts.isVariableStatement(statement)) continue;
    const initializer = statement.declarationList.declarations[0].initializer;
    if (
      !initializer ||
      !ts.isParenthesizedExpression(initializer) ||
      !ts.isJsxSelfClosingElement(initializer.expression)
    )
      continue;
    const attributes = initializer.expression.attributes.properties.filter(ts.isJsxAttribute);
    const name = attributes.find(attribute => attribute.name.getText(file) === 'name')?.initializer;
    if (!name || !ts.isStringLiteral(name) || name.text !== 'ListSchema') continue;
    const descriptions = attributes.find(attribute => attribute.name.getText(file) === 'descriptions')?.initializer;
    if (
      !descriptions ||
      !ts.isJsxExpression(descriptions) ||
      !descriptions.expression ||
      !ts.isObjectLiteralExpression(descriptions.expression)
    )
      throw new Error('ListSchema descriptions must be an object literal');
    return Object.fromEntries(
      descriptions.expression.properties.map(property => {
        if (
          !ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ||
          !ts.isStringLiteral(property.initializer)
        )
          throw new Error('ListSchema descriptions must contain string fields');
        return [property.name.text, property.initializer.text];
      }),
    );
  }
  throw new Error('Missing ListSchema descriptions in Schema reference');
};

/** List API 与 Schema 参考共用的中文字段说明 */
export const listSchemaDescriptions = readListSchemaDescriptions();
