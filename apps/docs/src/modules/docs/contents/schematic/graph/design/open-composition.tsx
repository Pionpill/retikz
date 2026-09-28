import { Block, BlockHeader, BlockRow, Entity, Graph, Group, Relation } from '@retikz/graph-react';
import { Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { createGraphPreviewSource } from '@/modules/docs/preview';

import { openCompositionI18n } from './open-composition.i18n';

/** 开放组合示例的语言 */
export type OpenCompositionProps = { lang?: Lang };
/** 普通 Node 与 Graph 成员共用引用空间，Block 仅排布内部内容 */
const OpenComposition: FC<OpenCompositionProps> = props => {
  const { lang = 'zh' } = props;
  const t = openCompositionI18n[lang];
  return (
    <Graph>
      <Group id="business" caption={{ title: { text: t.group } }}>
        <Node id="input" position={[0, 55]} shape="circle" layout={{ padding: 12 }}>
          {t.node}
        </Node>
        <Entity id="activity" role="activity" position={[170, 55]}>
          {t.entity}
        </Entity>
        <Relation role="flow" source={{ id: 'input' }} target={{ id: 'activity' }} />
      </Group>
      <Block id="order" width={170} transforms={[{ kind: 'translate', x: 350, y: 40 }]}>
        <BlockHeader title={t.block} />
        <BlockRow content={t.row} />
      </Block>
      <Relation role="dependency" source={{ id: 'activity' }} target={{ id: 'order' }} />
    </Graph>
  );
};
export const previewSource = createGraphPreviewSource(() => OpenComposition({}));
export default OpenComposition;
