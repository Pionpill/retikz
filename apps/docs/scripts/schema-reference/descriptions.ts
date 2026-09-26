import { readFileSync } from 'node:fs';

import ts from 'typescript';

/** 从 Schema 页读取已有的字面量翻译，供 API 参考复用同一说明真源 */
export const readSchemaDescriptions = (sourcePath: string, schemaName: string): Readonly<Record<string, string>> => {
  const source = readFileSync(sourcePath, 'utf8');
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
    if (!name || !ts.isStringLiteral(name) || name.text !== schemaName) continue;
    const descriptions = attributes.find(attribute => attribute.name.getText(file) === 'descriptions')?.initializer;
    if (
      !descriptions ||
      !ts.isJsxExpression(descriptions) ||
      !descriptions.expression ||
      !ts.isObjectLiteralExpression(descriptions.expression)
    )
      throw new Error(`${schemaName} descriptions must be an object literal`);
    return Object.fromEntries(
      descriptions.expression.properties.map(property => {
        if (
          !ts.isPropertyAssignment(property) ||
          !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) ||
          !ts.isStringLiteral(property.initializer)
        )
          throw new Error(`${schemaName} descriptions must contain string fields`);
        return [property.name.text, property.initializer.text];
      }),
    );
  }
  throw new Error(`Missing ${schemaName} descriptions in Schema reference`);
};
