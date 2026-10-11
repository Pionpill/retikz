import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import * as schemas from '@retikz/data';

import { readSchemaDescriptions } from '../schema-reference/descriptions';
import { assertDataTransformApiReferenceTranslated, translateDataTransformApiReference } from './data-transform.en';
import { createSchemaLocalizationResolver } from './standard-schema';
import { createApiReferenceMdx } from './tex';
import type { ApiReferencePackageConfig } from './tex';

const root = path.resolve(import.meta.dirname, '../../../..');
const schemaPage = path.join(
  root,
  'apps/docs/src/modules/docs/contents/viz/data/transform/schema-reference/index.zh.mdx',
);
const schemaNames = [
  'DataExecutionSchema',
  'DataTransformDeclarationSchema',
  'DataTransformSchema',
  'ExternalTransformSchema',
  'ReducerOperationSchema',
  'ReducerMetricsSchema',
  'SelectorOperationSchema',
  'RegressionMethodSchema',
] as const;
const localize = createSchemaLocalizationResolver(
  schemaNames.map(name => ({
    schema: schemas[name === 'DataTransformSchema' ? 'TransformSchema' : name],
    localizations: { zh: { descriptions: readSchemaDescriptions(schemaPage, name) } },
  })),
);

/** 数据变换公开参考生成 */
export const dataTransformApiReferenceConfig: ApiReferencePackageConfig = {
  packageName: '@retikz/data',
  packageDirectory: 'packages/viz/data',
  tsconfigPath: path.join(root, 'packages/viz/data/tsconfig.json'),
  entries: [
    {
      source: path.join(root, 'packages/viz/data/src/index.ts'),
      title: { zh: '`@retikz/data`', en: '`@retikz/data`' },
      symbols: [
        'IRDataSelectorOperation',
        'IRDataReducerOperation',
        'IRDataReducerMetrics',
        'IRDataTransform',

        'IRDataExecution',
        'IRDataTransformDeclaration',
        'IRRegressionMethod',

        'DataTransformPhase',
        'DataTransformBindingClass',
        'DataTransformFieldEffect',
        'DataTransformSchedule',
        'DataTransformOutputDescriptor',
        'DataTransformOutputModel',
        'TransformContext',
        'TransformSemanticContext',
        'TransformDefinition',
        'TransformDefinitionInput',
        'defineTransform',
        'AnyTransformDefinition',
        'TransformImplementation',
        'defineTransformImplementation',
        'AnyTransformImplementation',
        'AnySynchronousTransformImplementation',
        'extractTransformKind',
        'RowSelection',
        'RowSelectorDefinition',
        'defineRowSelector',
        'AnyRowSelectorDefinition',
        'StatisticsReducerDefinition',
        'defineStatisticsReducer',
        'AnyStatisticsReducerDefinition',
        'RowSelectorImplementation',
        'defineRowSelectorImplementation',
        'AnyRowSelectorImplementation',
        'AnySynchronousRowSelectorImplementation',
        'StatisticsReducerImplementation',
        'defineStatisticsReducerImplementation',
        'AnyStatisticsReducerImplementation',
        'AnySynchronousStatisticsReducerImplementation',
        'extractStatisticOperation',
        'RegressionPair',
        'RegressionModel',
        'RegressionDefinition',
        'defineRegression',
        'AnyRegressionDefinition',
        'RegressionImplementation',
        'defineRegressionImplementation',
        'AnyRegressionImplementation',
        'AnySynchronousRegressionImplementation',
        'extractRegressionKind',
        'RegressionResolution',
        'DataTransformModel',
        'DataTransformDependency',
        'DataTransformStage',
        'DataTransformResolution',
        'DataTransformResult',
        'DataTransformDiagnostic',
        'DataTransformStageInput',
        'DataTransformInputDescriptor',
        'DataTransformExecutionRequirements',
        'DataTransformRequestOptions',
        'DataTransformStageImplementation',
        'DataTransformStageSupport',
        'DataTransformImplementationProvider',
        'DataTransformProviderRegistration',
        'DataTransformExecutionOptions',
        'DataTransformExecution',
        'DataTransformPreparation',
        'DataTransformExecutor',
        'DataInputBinding',
        'DataInputBindings',
        'resolveTransformRegistry',
        'resolveTransformImplementationRegistry',
        'resolveRowSelectorRegistry',
        'resolveRowSelectorImplementationRegistry',
        'resolveStatisticsReducerRegistry',
        'resolveStatisticsReducerImplementationRegistry',
        'resolveRegressionRegistry',
        'resolveRegressionImplementationRegistry',
        'resolveRegression',
        'DataTransformResolveOptions',
        'resolveDataTransforms',
        'resolveDataTransformOutputModel',
        'resolveDataExecution',
        'ingestDataTransformResult',
        'describeDataTransformInput',
        'createDataTransformExecutor',
        'executeDataTransforms',
        'DEFAULT_TRANSFORM_CONTEXT',
        'ApplyTransformsOptions',
        'applyTransformsToDataView',
        'applyTransforms',
        'collectTransformFields',
        'ApplyTransformsWithLineageOptions',
        'ApplyTransformsWithLineageResult',
        'ApplyTransformsToDataViewWithLineageResult',
        'applyTransformsToDataViewWithLineage',
        'applyTransformsWithLineage',
      ],
    },
  ],
  translate: translateDataTransformApiReference,
  resolveSchemaLocalization: localize,
};

/** 数据变换公开参考生成 */
export const writeDataTransformApiReferenceMdx = async (outputDirectory: string): Promise<void> => {
  mkdirSync(outputDirectory, { recursive: true });
  for (const lang of ['zh', 'en'] as const) {
    const content = await createApiReferenceMdx(dataTransformApiReferenceConfig, lang);
    if (lang === 'en') assertDataTransformApiReferenceTranslated();
    writeFileSync(
      path.join(outputDirectory, `generated.${lang}.mdx`),
      `{/* Generated by pnpm generate:data-transform-api-reference. Do not edit manually. */}\n\n${content}\n`,
      'utf8',
    );
  }
};
