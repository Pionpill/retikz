import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { sceneDataI18n } from './scene-data.i18n';

/** Scene 数据结构图的语言 */
export type SceneDataProps = { lang?: Lang };

/** 对照图元的资源引用、Scene 的资源表和独立的根动画轨道 */
const SceneData: FC<SceneDataProps> = props => {
  const { lang = 'zh' } = props;
  const t = sceneDataI18n[lang];
  const cell = {
    layout: { height: 32 },
    style: { font: { size: 13 } },
    key: { layout: { width: 124 } },
    value: { layout: { width: 145 } },
  };
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Map
        position={[0, 0]}
        label={{ text: t.refs }}
        defaultCell={cell}
        entries={[
          { key: { content: 'rect.fill.id' }, value: { id: 'paint-ref', content: 'p1' } },
          { key: { content: 'group.clipRef' }, value: { id: 'clip-ref', content: 'c1' } },
        ]}
      />
      <Map
        position={[355, 0]}
        label={{ text: 'scene.resources' }}
        defaultCell={cell}
        entries={[
          { key: { id: 'paint', content: 'paints[0]' }, value: { content: 'id: p1 · ' + t.gradient } },
          { key: { id: 'clip', content: 'clips[0]' }, value: { content: 'id: c1 · ' + t.clip } },
        ]}
      />
      <Draw way={['paint-ref.right', 'paint.left']} arrow="->" />
      <Draw way={['clip-ref.right', 'clip.left']} arrow="->" />
      <Map
        position={[355, 136]}
        label={{ text: 'scene.animations[0]' }}
        defaultCell={cell}
        entries={[
          { key: { content: 'property' }, value: { content: 'viewBox' } },
          { key: { content: 'keyframes' }, value: { content: t.frames } },
        ]}
      />
    </Layout>
  );
};
export default SceneData;
