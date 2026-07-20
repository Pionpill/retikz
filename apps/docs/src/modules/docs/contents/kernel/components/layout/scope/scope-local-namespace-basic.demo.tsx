import type { FC } from 'react';

import { Draw, Layout, Node, Scope } from '@retikz/react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview/author';

import { usePreviewControls } from '@/modules/docs/components/component-preview/author';

import { scopeLocalNamespaceBasicControls } from './scope-local-namespace-basic.controls';

/** controls registry 未刷新时供 ComponentPreview 从 demo 模块直接解析的兜底定义 */
export const previewControls = scopeLocalNamespaceBasicControls;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/**
 * localNamespace 基础隔离 playground
 * @description 外层 Node 固定使用 id="A"；面板调整内部 Node id 与 localNamespace，观察外层引用是否被同名内部节点覆盖
 */
const Demo: FC = () => {
  const values = usePreviewControls(scopeLocalNamespaceBasicControls);
  const innerNodeId = values.nodeId;

  return (
    <Layout width={400} height={117} viewBox={{ x: -100, y: -70, width: 480, height: 140 }}>
      <Node id="A" position={[0, 0]}>
        outer A
      </Node>
      <Scope localNamespace={values.localNamespace} transforms={[{ kind: 'translate', x: 280, y: 0 }]}>
        <Node id={innerNodeId} position={[0, 0]}>
          inner {innerNodeId}
        </Node>
        <Draw way={[[0, 50], innerNodeId]} arrow="->" />
      </Scope>
      <Draw way={[[0, -50], 'A']} arrow="->" />
    </Layout>
  );
};

export default Demo;
