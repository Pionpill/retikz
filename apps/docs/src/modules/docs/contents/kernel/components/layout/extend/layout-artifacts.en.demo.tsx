import type { CompositeArtifact, IRScene } from '@retikz/core';
import { createFlexLayout, flexLayoutDefinition } from '@retikz/layout';
import { Layout } from '@retikz/react';
import type { FC } from 'react';
import { useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = { deriveIR: false } satisfies PreviewSourceConfig;
const extensions = { composites: [flexLayoutDefinition] };
const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    createFlexLayout({
      gap: 24,
      children: [
        { kind: 'flex', child: { type: 'node', text: 'Message' } },
        { kind: 'flex', child: { type: 'node', text: 'Target' } },
      ],
    }),
  ],
};
/** 展示 React commit 后收到的 Composite 领域产物 */
const Demo: FC = () => {
  const [artifacts, setArtifacts] = useState<ReadonlyArray<CompositeArtifact>>([]);
  const layout = artifacts.find(artifact => artifact.namespace === 'layout' && artifact.type === 'flexLayout');
  return (
    <div className="grid gap-3">
      <Layout ir={scene} extensions={extensions} onArtifacts={setArtifacts} />
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">Composite artifacts: {artifacts.length}</div>
      <pre className="max-h-40 overflow-auto rounded-md border p-3 text-xs">
        {JSON.stringify(layout?.value, null, 2)}
      </pre>
    </div>
  );
};
export default Demo;
