import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import {
  referenceDeclaration,
  referenceSourceTitle,
  schemaReferenceName,
  schemaReferenceTypes,
} from './merged-reference';

/** 已经合并的专题参考保留与 demo 就地相邻的组织 */
export const contextualReferencePages = [
  'library/extension/shape',
  'library/extension/clip',
  'viz/data/operators/selector',
  'viz/data/operators/reducer',
  'viz/data/operators/regression',
  'viz/data/transforms/row-organization',
  'viz/data/transforms/aggregation-annotation',
  'viz/data/transforms/numeric-derivation',
  'viz/data/transforms/relation-generation',
  'viz/data/transforms/bin-density',
  'viz/data/transforms/trend-sampling',
] as const;

/** registry 的分支视图直接链接实际声明，不虚构独立 Schema */
const schemaTitle = (name: string, hints: ReadonlyArray<string>): string => {
  if (name.startsWith('BuiltinRegression.')) {
    const branch = name.split('.')[1];
    const label = `BuiltinRegressionMethodSchemas.${branch[0].toUpperCase()}${branch.slice(1)}`;
    const declaration = referenceDeclaration('BuiltinRegressionMethodSchemas', hints);
    return `<ApiSourceLink label={${JSON.stringify(label)}} path={${JSON.stringify(declaration.path)}} startLine={${declaration.startLine}}>${label}</ApiSourceLink>`;
  }
  const [base, branch] = name.split('.');
  const title = referenceSourceTitle(base, hints);
  return branch
    ? title.replace(
        `>${schemaReferenceName(base)}</ApiSourceLink>`,
        `>${schemaReferenceName(base)}.${branch}</ApiSourceLink>`,
      )
    : title;
};

/** 只重投影参考块，专题正文和 demo 保留手写真源 */
export const createContextualReferenceMdx = (
  source: string,
  owner: (typeof contextualReferencePages)[number],
  language: 'zh' | 'en',
): string => {
  const hints = owner.startsWith('library/') ? ['packages/library/extension/src/'] : ['packages/viz/data/src/'];
  return source.replace(
    /(?:^#### <ApiSourceLink[^\n]+\n\n)?<DocTabs defaultValue="(?:api|members)">([\s\S]*?)<\/DocTabs>/gmu,
    (_all, body: string) => {
      const api = body.match(/<DocTab value="(?:api|members)"[^>]*>([\s\S]*?)<\/DocTab>/u)?.[1];
      const schema = body.match(/<DocTab value="schema"[^>]*>([\s\S]*?)<\/DocTab>/u)?.[1];
      if (api === undefined || schema === undefined) throw new Error(`Incomplete contextual reference: ${owner}`);
      const schemaNames = [...schema.matchAll(/<ZodSchema\b[\s\S]*?name="([^"]+)"/gu)].map(match => match[1]);
      const schemaTitles = schemaNames.map(name => schemaTitle(name, hints));
      const schemaLabels = new Set(schemaTitles.map(title => title.match(/>([^<]+)<\/ApiSourceLink>/u)![1]));
      const apiNames = [
        ...new Set([
          ...[...api.matchAll(/^#### (\w+)\s*$/gmu)].map(match => match[1]),
          ...[..._all.split('\n')[0].matchAll(/>([^<]+)<\/ApiSourceLink>/gu)]
            .map(match => match[1])
            .filter(name => !schemaLabels.has(name)),
        ]),
      ];
      const types = schemaNames.flatMap(name => schemaReferenceTypes(name.split('.')[0], hints));
      const declarations = [
        ...new Map(
          [...types, ...apiNames.map(name => referenceDeclaration(name, hints))].map(item => [item.name, item]),
        ).values(),
      ];
      const names = [...new Set([...apiNames, ...declarations.map(item => item.name)])];
      const titles = [...names.map(name => referenceSourceTitle(name, hints)), ...schemaTitles];
      const clean = (text: string) => text.replace(/^#### \w+\s*\n/gmu, '').trim();
      const definitions = declarations.filter(item => /^(?:export )?(?:type|interface) /u.test(item.text));
      const definition = definitions.length
        ? `<DocTab value="definition" label="${language === 'zh' ? '类型定义' : 'Type definition'}">\n\n\`\`\`ts\n${definitions.map(item => item.text).join('\n\n')}\n\`\`\`\n\n</DocTab>\n\n`
        : '';
      return `#### ${titles.join(' / ')}\n\n<DocTabs defaultValue="members">\n\n<DocTab value="members" label="${language === 'zh' ? '属性' : 'Members'}">\n\n${clean(api)}\n\n</DocTab>\n\n${definition}<DocTab value="schema" label="Schema">\n\n${clean(schema)}\n\n</DocTab>\n\n</DocTabs>`;
    },
  );
};

/** 刷新已有专题参考的源码入口和类型声明 */
export const writeContextualReferences = (contents: string): void => {
  for (const owner of contextualReferencePages) {
    for (const language of ['zh', 'en'] as const) {
      const file = path.join(contents, owner, `index.${language}.mdx`);
      writeFileSync(file, createContextualReferenceMdx(readFileSync(file, 'utf8'), owner, language), 'utf8');
    }
  }
};
