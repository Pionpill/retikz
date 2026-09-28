import { Block, BlockHeader, BlockRow, BlockSection, Graph } from '@retikz/graph-react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { blockMinimalI18n } from './block-minimal.i18n';
/** 最小结构块示例的语言 */
export type BlockMinimalProps = { lang?: Lang };
/** 按标题、分区和行组织一个数据结构 */
const BlockMinimal: FC<BlockMinimalProps> = props => {
  const { lang = 'zh' } = props;
  const text = blockMinimalI18n[lang];
  return (
    <Graph>
      <Block id="user">
        <BlockHeader title="User" description={text.description} />
        <BlockSection title={text.fields}>
          <BlockRow content={['name', 'string']} />
        </BlockSection>
      </Block>
    </Graph>
  );
};
export default BlockMinimal;
