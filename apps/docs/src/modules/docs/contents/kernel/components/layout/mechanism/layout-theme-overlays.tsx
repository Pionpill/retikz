import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { layoutThemeOverlaysI18n } from './layout-theme-overlays.i18n';

export type LayoutThemeOverlaysProps = Readonly<{ lang?: Lang }>;

const LayoutThemeOverlays: FC<LayoutThemeOverlaysProps> = props => {
  const { lang } = props;
  const i18n = layoutThemeOverlaysI18n[lang ?? 'zh'];
  const rows = [
    [i18n.provider, 'clean', 'dark'],
    [i18n.input, '—', '—'],
    ['Layout', '—', 'light'],
    [i18n.result, 'clean', 'light'],
  ];
  return (
    <Layout viewBox={{ x: 0, y: 0, width: 420, height: 266 }} style={{ maxWidth: '100%', height: 'auto' }}>
      {[i18n.source, 'theme.style', 'theme.mode'].map((title, index) => (
        <Node
          key={title}
          position={[80 + index * 130, 20]}
          style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 14 } }}
        >
          {title}
        </Node>
      ))}
      {rows.map((row, index) =>
        row.map((text, column) => (
          <Node
            key={index + '-' + column}
            position={[80 + column * 130, 56 + index * 40]}
            style={{
              stroke: 'none',
              fill: 'none',
              font: { size: 14, weight: index === 3 ? 'bold' : 'normal' },
            }}
          >
            {text}
          </Node>
        )),
      )}
      <Draw
        way={[
          [18, 151],
          [402, 151],
        ]}
        style={{ stroke: 'gray' }}
      />
      <Draw
        way={[
          [170, 193],
          [250, 193],
        ]}
        style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
      />
      <Draw
        way={[
          [300, 193],
          [380, 193],
        ]}
        style={{ stroke: 'darkorange', strokeWidth: 2 }}
      />
      <Node position={[210, 213]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.inherited}
      </Node>
      <Node position={[340, 213]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 12 } }}>
        {i18n.overridden}
      </Node>
      <Node position={[210, 250]} style={{ stroke: 'none', fill: 'none', textColor: 'gray', font: { size: 13 } }}>
        {i18n.omitted}
      </Node>
    </Layout>
  );
};

export default LayoutThemeOverlays;
