import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { nodeWidthComparisonI18n } from './node-width-comparison.i18n';

/** 宽度对照的文档语言 */
export type NodeWidthComparisonProps = { lang?: Lang };

/** 同时比较固定宽度、最小宽度与正文折行阈值 */
const NodeWidthComparison: FC<NodeWidthComparisonProps> = props => {
  const { lang = 'zh' } = props;
  const text = nodeWidthComparisonI18n[lang];
  return (
    <Layout>
      <Scope
        defaults={{
          node: { style: { font: { size: 12 } }, layout: { padding: 8 } },
          label: { font: { size: 12 }, textColor: 'gray' },
        }}
      >
        <Node position={[-230, 0]} layout={{ width: 120 }} label={{ text: 'width: 120' }} text={text.short} />
        <Node
          position={[0, 0]}
          layout={{ minimumSize: { width: 120 } }}
          label={{ text: 'minimumSize.width: 120' }}
          text={text.short}
        />
        <Node
          position={[230, 0]}
          layout={{ maxTextWidth: 120 }}
          label={{ text: 'maxTextWidth: 120' }}
          text={text.short}
        />
        <Node position={[-230, 90]} layout={{ width: 120 }} text={text.long} />
        <Node position={[0, 90]} layout={{ minimumSize: { width: 120 } }} text={text.long} />
        <Node position={[230, 90]} layout={{ maxTextWidth: 120 }} text={text.long} />
      </Scope>
    </Layout>
  );
};

export default NodeWidthComparison;
