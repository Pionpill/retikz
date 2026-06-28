const specifierText = (sourceCode, specifier) => sourceCode.getText(specifier).replace(/^type\s+/, '');

const importSuffixText = (sourceCode, node) => {
  const sourceText = sourceCode.getText(node.source);
  const assertions = node.assertions ?? node.attributes ?? [];
  if (assertions.length === 0) return ` from ${sourceText};`;
  const lastAssertion = assertions[assertions.length - 1];
  return ` from ${sourceText} ${sourceCode.text.slice(assertions[0].range[0], lastAssertion.range[1])};`;
};

const namedImportText = specifiers => `{ ${specifiers.join(', ')} }`;

const valueImportText = (sourceCode, node, specifiers) => {
  const suffix = importSuffixText(sourceCode, node);
  const defaultSpecifier = specifiers.find(specifier => specifier.type === 'ImportDefaultSpecifier');
  const namespaceSpecifier = specifiers.find(specifier => specifier.type === 'ImportNamespaceSpecifier');
  const namedSpecifiers = specifiers.filter(specifier => specifier.type === 'ImportSpecifier');
  const parts = [];

  if (defaultSpecifier) parts.push(sourceCode.getText(defaultSpecifier));
  if (namespaceSpecifier) parts.push(sourceCode.getText(namespaceSpecifier));
  if (namedSpecifiers.length > 0)
    parts.push(namedImportText(namedSpecifiers.map(specifier => specifierText(sourceCode, specifier))));

  return `import ${parts.join(', ')}${suffix}`;
};

export const importTypeRules = {
  'separate-type-specifiers': {
    meta: {
      type: 'layout',
      fixable: 'code',
      messages: {
        separateTypeSpecifiers: 'Separate type import specifiers from value imports.',
      },
      schema: [],
    },
    create: context => {
      const sourceCode = context.sourceCode;

      return {
        ImportDeclaration: node => {
          if (node.importKind === 'type') return;

          const typeSpecifiers = node.specifiers.filter(
            specifier => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type',
          );
          const valueSpecifiers = node.specifiers.filter(specifier => !typeSpecifiers.includes(specifier));

          if (typeSpecifiers.length === 0 || valueSpecifiers.length === 0) return;

          context.report({
            node,
            messageId: 'separateTypeSpecifiers',
            fix: fixer => {
              const suffix = importSuffixText(sourceCode, node);
              const typeImport = `import type ${namedImportText(
                typeSpecifiers.map(specifier => specifierText(sourceCode, specifier)),
              )}${suffix}`;
              const valueImport = valueImportText(sourceCode, node, valueSpecifiers);
              return fixer.replaceText(node, `${typeImport}\n${valueImport}`);
            },
          });
        },
      };
    },
  },
};
