import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { blendPathI18n } from './blend-path.i18n';

/** Path 示例的语言参数 */
export type BlendPathProps = { lang?: Lang };
/** Compare the path and its arrow over the same backdrop */
const BlendPath: FC<BlendPathProps> = props => {
  const { lang = 'zh' } = props;
  const text = blendPathI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {(['normal', 'multiply'] as const).map((mode, index) => (
        <Scope key={mode}>
          <Node position={[index * 240, -86]} style={{ stroke: 'none', fill: 'none', font: { size: 14 } }}>
            {mode}
          </Node>
          <Node
            position={[index * 240, 0]}
            shape="rectangle"
            layout={{ minimumSize: { width: 120, height: 90 } }}
            style={{ fill: 'darkorange', stroke: 'none' }}
          />
          <Path
            arrow="->"
            label={{ text: text.label, position: 'midway', side: 'top', sloped: false }}
            style={{ stroke: 'dodgerblue', strokeWidth: 6, blendMode: mode }}
          >
            <Step kind="move" to={[index * 240 - 90, 24]} />
            <Step kind="line" to={[index * 240 + 35, -8]} />
          </Path>
        </Scope>
      ))}
    </Layout>
  );
};
export default BlendPath;
