import type { CompileArtifact, CompileArtifactOptions, IRScene } from '@retikz/core';
import type { FC } from 'react';

import { isNodeLayoutCompileArtifact } from '@retikz/core';
import { Layout } from '@retikz/react';
import { useCallback, useState } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

const artifactOptions = {
  nodeLayouts: true,
} satisfies CompileArtifactOptions;

const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'message', position: [0, 0], text: '可测量的节点' },
    { type: 'node', id: 'target', position: [130, 0], text: '目标' },
  ],
};

/** 展示 React commit 后收到的 Node 布局产物 */
const Demo: FC = () => {
  const [artifacts, setArtifacts] = useState<ReadonlyArray<CompileArtifact>>([]);
  const handleArtifacts = useCallback((nextArtifacts: ReadonlyArray<CompileArtifact>) => {
    setArtifacts(nextArtifacts);
  }, []);
  const nodeLayouts = artifacts.filter(isNodeLayoutCompileArtifact);
  const measuredNode = nodeLayouts.find(artifact => artifact.value.id === 'message');

  return (
    <div className="grid gap-3">
      <Layout ir={scene} width={300} height={120} artifacts={artifactOptions} onArtifacts={handleArtifacts} />
      <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
        Node 产物：{nodeLayouts.length} 个；正文宽度：
        {measuredNode === undefined ? '等待编译' : `${measuredNode.value.content.size.width.toFixed(1)} units`}
      </div>
    </div>
  );
};

export default Demo;
