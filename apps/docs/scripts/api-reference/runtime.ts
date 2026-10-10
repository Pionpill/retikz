import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { translateRuntimeApiReference } from './runtime.en';
import { createApiReferenceMdx } from './tex';

const packageRoot = path.resolve(import.meta.dirname, '../../../../packages/kernel/runtime');

/** 按 Runtime 专题阅读顺序组织公开成员，其余公开导出归入其他 */
const groups = [
  {
    title: 'Source',
    symbols: [
      'defineRuntimeSource',
      'RuntimeSourceDefinitionInput',
      'RuntimeSourceValueDefinitionInput',
      'RuntimeSourceDefinition',
      'RuntimeSourceToken',
      'createRuntimeSourceRegistry',
      'RuntimeSourceRegistry',
      'createRuntimeSourceInput',
      'RuntimeSourceInput',
      'createRuntimeSourceUpdate',
      'RuntimeSourceUpdate',
      'createRuntimeChangeSet',
      'RuntimeChangeSet',
      'RuntimeSourcePhase',
      'RuntimeSourceExecutionResult',
      'RuntimeSourceLifecycleDiagnostic',
    ],
  },
  {
    title: 'Identity',
    symbols: [
      'createRuntimeIdentity',
      'RuntimeIdentity',
      'runtimeIdentityEquals',
      'createRuntimeIdentityLookup',
      'RuntimeIdentityLookup',
      'RuntimeComputationId',
    ],
  },
  {
    title: 'Computation',
    symbols: [
      'defineRuntimeComputation',
      'RuntimeComputationDefinitionInput',
      'RuntimeComputationResultDefinitionInput',
      'RuntimeComputationDefinition',
      'RuntimeComputationToken',
      'createRuntimeComputationRegistry',
      'RuntimeComputationRegistryInput',
      'RuntimeComputationRegistry',
      'RuntimeCandidateLookup',
      'RuntimeCandidateView',
      'RuntimeComputationContext',
      'RuntimeComputationPhase',
      'RuntimeComputationExecution',
      'RuntimeComputationKind',
      'RuntimeRunOutcome',
      'RuntimeUpdateOutcome',
      'RuntimeCommitEvent',
      'RuntimeComputationWarningInput',
      'RuntimeComputationTraceReporter',
    ],
  },
  {
    title: 'Runtime',
    symbols: [
      'createRuntime',
      'RuntimeOptions',
      'Runtime',
      'RuntimeUpdateStrategy',
      'createRuntimeRevision',
      'RuntimeRevision',
      'RuntimeSnapshot',
      'RuntimeUpdate',
      'RuntimeResult',
    ],
  },
  {
    title: 'Participant',
    symbols: [
      'defineRuntimeCommitParticipant',
      'RuntimeCommitParticipantDefinitionInput',
      'RuntimeCommitParticipant',
      'RuntimeCommitParticipantToken',
      'RuntimeParticipantCandidateLookup',
      'RuntimeParticipantCandidateView',
      'RuntimeParticipantContext',
      'RuntimePreparedCommit',
      'RuntimeParticipantTraceReporter',
      'RuntimeParticipantWarningInput',
    ],
  },
  {
    title: 'Trace',
    symbols: [
      'createRuntimeTraceReporter',
      'CreateRuntimeTraceReporterInput',
      'RuntimeTracePhaseDefinition',
      'RuntimeTraceReporter',
      'PerformanceTraceRecord',
      'PerformanceTraceSink',
      'PerformanceTraceOutcome',
      'PerformanceTraceDiagnostic',
    ],
  },
] as const;

/** 从唯一公开入口生成内容，再按已审阅的专题清单排序，不复制签名与注释 */
export const createRuntimeApiReferenceMdx = async (lang: 'zh' | 'en'): Promise<string> => {
  const source = await createApiReferenceMdx(
    {
      packageName: '@retikz/runtime',
      packageDirectory: 'packages/kernel/runtime',
      tsconfigPath: path.resolve(packageRoot, 'tsconfig.json'),
      entries: [
        {
          title: { zh: 'Runtime', en: 'Runtime' },
          source: path.resolve(packageRoot, 'src/index.ts'),
          symbolPairs: [
            ['createRuntimeComputationRegistry', 'RuntimeComputationRegistryInput'],
            ['createRuntime', 'RuntimeOptions'],
          ],
          memberTypeLabels: {
            RetikzRuntimeError: {
              constructor: '(input: ConstructorParameters<typeof RetikzRuntimeError>[0])',
              computation: 'RuntimeComputationId',
              diagnostics: 'ReadonlyArray<RuntimeDiagnostic>',
            },
          },
          declarationOnlySymbols: [
            'RuntimeRevision',
            'RuntimeSourceToken',
            'RuntimeSourceDefinition',
            'RuntimeSourceInput',
            'RuntimeSourceUpdate',
            'RuntimeComputationToken',
            'RuntimeComputationDefinition',
            'RuntimeCommitParticipantToken',
            'RuntimeCommitParticipant',
            'RuntimeChangeSet',
          ],
        },
      ],
      translate: translateRuntimeApiReference,
    },
    lang,
  );
  const blocks = new Map(
    source
      .split(/(?=^### )/mu)
      .slice(1)
      .map(block => [block.split('\n', 1)[0].slice(4), block.trim()]),
  );
  const names = new Map([...blocks.keys()].flatMap(title => title.split(' / ').map(name => [name, title] as const)));
  const visited = new Set<string>();
  const sections = groups.map(group => {
    const members = group.symbols.flatMap(name => {
      const title = names.get(name);
      if (!title || visited.has(name)) throw new Error(`Missing or repeated Runtime API: ${name}`);
      visited.add(name);
      const block = blocks.get(title);
      blocks.delete(title);
      return block ? [block] : [];
    });
    return [`## ${group.title}`, ...members].join('\n\n');
  });
  if (blocks.size) sections.push([`## ${lang === 'zh' ? '其他' : 'Other'}`, ...blocks.values()].join('\n\n'));
  return sections.join('\n\n');
};

/** 写出 Runtime 双语 API 参考，公开声明始终由 TypeScript 与 JSDoc 生成 */
export const writeRuntimeApiReferenceMdx = async (outputDirectory: string): Promise<void> => {
  mkdirSync(outputDirectory, { recursive: true });
  for (const lang of ['zh', 'en'] as const) {
    const content = await createRuntimeApiReferenceMdx(lang);
    writeFileSync(
      path.resolve(outputDirectory, `generated.${lang}.mdx`),
      `{/* Generated by pnpm generate:api-reference. Do not edit manually. */}\n\n${content}\n`,
      'utf8',
    );
  }
};
