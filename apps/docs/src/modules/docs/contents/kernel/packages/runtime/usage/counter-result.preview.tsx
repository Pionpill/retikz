import { Layout, Node } from '@retikz/react';
import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  defineRuntimeSource,
  defineRuntimeComputation,
} from '@retikz/runtime';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { counterResultI18n } from './counter-result.i18n';

const counter = defineRuntimeSource<number, number, number, never>({
  key: 'example/counter',
  value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
});

const doubled = defineRuntimeComputation({
  id: { owner: 'example/counter', key: 'doubled' },
  sources: [counter],
  run: view => ({ kind: 'full', artifact: view.snapshot(counter).value * 2 }),
});

const sources = createRuntimeSourceRegistry({ custom: [counter] });

const computations = createRuntimeComputationRegistry({ sources, custom: [doubled] });

/** 一次完整更新的输入值与显示语言 */
export type CounterResultPreviewProps = { initial: number; next: number; lang: Lang };

/** 每次渲染独立运行并释放 Runtime，结果直接来自公开读取接口 */
export const CounterResultPreview: FC<CounterResultPreviewProps> = props => {
  const { initial, next, lang } = props;
  const i18n = counterResultI18n[lang];
  const runtime = createRuntime({
    sources,
    computations,
    initialSnapshots: [createRuntimeSourceInput(counter, initial)],
  });

  try {
    const before = runtime.snapshot(counter);
    const beforeArtifact = runtime.artifact(doubled);
    const update = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(counter, next)],
    });
    const after = runtime.snapshot(counter);
    const afterArtifact = runtime.artifact(doubled);

    return (
      <Layout viewBox={{ x: -145, y: -40, width: 290, height: 190 }}>
        <Node
          position={[0, 0]}
          text={`${i18n.initial} · revision ${before.revision}\n${i18n.count}: ${before.value}   ${i18n.result}: ${beforeArtifact.value}`}
        />
        <Node
          position={[0, 75]}
          text={`${i18n.updated} · revision ${after.revision}\n${i18n.count}: ${after.value}   ${i18n.result}: ${afterArtifact.value}`}
        />
        <Node
          position={[0, 125]}
          text={`${i18n.outcome}: ${update.outcome}`}
          style={{ stroke: 'none', font: { size: 13 } }}
        />
      </Layout>
    );
  } finally {
    runtime.dispose();
  }
};
