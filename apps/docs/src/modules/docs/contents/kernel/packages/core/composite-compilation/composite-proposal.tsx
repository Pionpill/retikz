import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositeProposalI18n } from './composite-proposal.i18n';

/** 尺寸提案图的语言 */
export type CompositeProposalProps = { lang?: Lang };
/** 固定路径的真实宽度与分配槽宽共享比例对照 */
const CompositeProposal: FC<CompositeProposalProps> = props => {
  const { lang = 'zh' } = props;
  const text = compositeProposalI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[i * 320, 0]}>
          <Node position={[120, -30]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
            <Step kind="move" to={[0, 20]} />
            <Step kind="line" to={[240, 20]} />
          </Path>
          <Node position={[120, 0]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
            {text.geometry} · 100
          </Node>
          <Path style={{ stroke: 'darkorange', strokeWidth: 2 }}>
            <Step kind="move" to={[0, 54]} />
            <Step kind="line" to={[0, 66]} />
            <Step kind="move" to={[0, 60]} />
            <Step kind="line" to={[i === 0 ? 240 : 144, 60]} />
            <Step kind="move" to={[i === 0 ? 240 : 144, 54]} />
            <Step kind="line" to={[i === 0 ? 240 : 144, 66]} />
          </Path>
          <Node position={[120, 86]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
            {text.slot} · {i === 0 ? 100 : 60}
          </Node>
          <Node position={[120, 116]} style={{ stroke: 'none', fill: 'none', font: { size: 12 } }}>
            allocationBounds.width = 100
          </Node>
        </Scope>
      ))}
      <Node position={[280, 154]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {text.note}
      </Node>
    </Layout>
  );
};
export default CompositeProposal;
