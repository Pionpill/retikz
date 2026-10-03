import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { GeometryLabelSchema } from '@retikz/core';
import * as flowSchemas from '@retikz/diagram/flow';

import { readSchemaDescriptions } from '../schema-reference/descriptions';
import { geometryLabelSchemaDescriptions } from '../schema-reference/path';
import { assertFlowApiReferenceTranslated, translateFlowApiReference } from './flow.en';
import { createSchemaLocalizationResolver, resolveStandardSchemaLocalization } from './standard-schema';
import type { ApiReferenceLanguage, ApiReferencePackageConfig } from './tex';
import { createApiReferenceMdx } from './tex';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');

const schemaReference = path.resolve(
  repositoryRoot,
  'apps/docs/src/modules/docs/contents/schematic/diagram/flow/schema-reference/index.zh.mdx',
);
const groupDescriptions = readSchemaDescriptions(
  path.resolve(repositoryRoot, 'apps/docs/src/modules/docs/contents/schematic/graph/group/index.zh.mdx'),
  'GroupSchema',
);
/** 复用 Schema 页的说明，固定排列的各分支保留独立词典 */
const resolveFlowSchemaLocalization = createSchemaLocalizationResolver([
  { schema: GeometryLabelSchema, localizations: { zh: { descriptions: geometryLabelSchemaDescriptions } } },
  ...(
    [
      'FlowDiagramSchema',
      'FlowEntitySchema',
      'FlowGroupSchema',
      'FlowLayoutSchema',
      'FlowRelationSchema',
      'FlowScopeRoutingSchema',
      'FlowRoutingSchema',
      'FlowDefaultsSchema',
    ] as const
  ).map(name => ({
    schema: flowSchemas[name],
    localizations: {
      zh: {
        descriptions: {
          ...(name === 'FlowGroupSchema' ? groupDescriptions : {}),
          ...readSchemaDescriptions(schemaReference, name === 'FlowScopeRoutingSchema' ? 'FlowRoutingSchema' : name),
        },
      },
    },
  })),
  {
    schema: flowSchemas.FlowDiagramArtifactSchema,
    localizations: {
      zh: {
        descriptions: {
          layout: '本次编译使用的布局 Definition',
          frame: '最终图示外框的分配边界与可见边界',
          regions: '本次编译包含的标题、说明、绘图区和图例区域',
          elements: '按作者包含关系组织的递归元素几何树',
          relations: '按 Source 顺序保存的根级关系几何',
        },
      },
    },
  },
]);

/** 按 React、Vanilla 与 Flow 公共契约组织参考入口 */
export const flowApiConfigs: ReadonlyArray<ApiReferencePackageConfig> = [
  {
    owner: 'diagram-react',
    symbols: [
      'FlowDiagram',
      'FlowDiagramProps',
      'FlowEntity',
      'FlowEntityProps',
      'FlowEntities',
      'FlowEntitiesProps',
      'FlowGroup',
      'FlowGroupProps',
      'FlowLayout',
      'FlowLayoutProps',
      'FlowRelation',
      'FlowRelationProps',
      'FlowRelations',
      'FlowRelationsProps',
    ],
    pairs: [
      ['FlowDiagram', 'FlowDiagramProps'],
      ['FlowEntity', 'FlowEntityProps'],
      ['FlowEntities', 'FlowEntitiesProps'],
      ['FlowGroup', 'FlowGroupProps'],
      ['FlowLayout', 'FlowLayoutProps'],
      ['FlowRelation', 'FlowRelationProps'],
      ['FlowRelations', 'FlowRelationsProps'],
    ] as const,
  },
  {
    owner: 'diagram-vanilla',
    symbols: [
      'flowDiagram',
      'FlowDiagramInputEmbedProps',
      'normalizeFlowDiagram',
      'InputFlowDiagram',
      'FlowDiagramInputEmbedAdapter',
    ],
    pairs: [
      ['flowDiagram', 'FlowDiagramInputEmbedProps'],
      ['normalizeFlowDiagram', 'InputFlowDiagram'],
    ] as const,
  },
  {
    owner: 'diagram',
    symbols: [
      'defineFlowLayout',
      'FlowLayoutDefinition',
      'FlowLayoutRouting',
      'FlowLayoutRoute',
      'FlowBendRoute',
      'FlowBezierRoute',
      'FlowBezierRouting',
      'FlowRoutingCapability',
      'FlowLayoutLabelPlacement',
      'FlowLayoutRelationInput',
      'FlowLayoutRelationOutput',
      'FlowDiagramDefinitionOptions',
      'createFlowDiagramProviderContribution',
      'getFlowLayoutCatalog',
      'FlowDiagramArtifact',
      'IRFlowDiagram',
    ],
    pairs: [] as const,
  },
].map(({ owner, symbols, pairs }): ApiReferencePackageConfig => ({
  packageName: `@retikz/${owner}`,
  packageDirectory: `packages/schematic/${owner}`,
  tsconfigPath: path.resolve(repositoryRoot, `packages/schematic/${owner}/tsconfig.json`),
  entries: [
    {
      source: path.resolve(repositoryRoot, `packages/schematic/${owner}/src/flow/index.ts`),
      title: { zh: `\`@retikz/${owner}/flow\``, en: `\`@retikz/${owner}/flow\`` },
      symbols,
      symbolPairs: pairs,
    },
  ],
  translate: translateFlowApiReference,
  resolveSchemaLocalization: schema =>
    resolveFlowSchemaLocalization(schema) ?? resolveStandardSchemaLocalization(schema),
}));

/** 生成 Flow 双语公共 API include */
export const writeFlowApiReferenceMdx = async (outputDirectory: string): Promise<void> => {
  mkdirSync(outputDirectory, { recursive: true });
  for (const lang of ['zh', 'en'] as const satisfies ReadonlyArray<ApiReferenceLanguage>) {
    const sections: Array<string> = [];
    for (const config of flowApiConfigs) sections.push(await createApiReferenceMdx(config, lang));
    if (lang === 'en') assertFlowApiReferenceTranslated();
    writeFileSync(
      path.resolve(outputDirectory, `generated.${lang}.mdx`),
      `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${sections.join('\n\n')}\n`,
      'utf8',
    );
  }
};
