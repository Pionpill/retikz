import { Coordinate, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { coordinateSpacesI18n } from './coordinate-spaces.i18n';

/** 局部与世界偏移示意图的语言 */
export type CoordinateSpacesProps = { lang?: Lang };

/** 用真实缩放与两种位置表达显示偏移空间的差异 */
const CoordinateSpaces: FC<CoordinateSpacesProps> = props => {
  const { lang = 'zh' } = props;
  const text = coordinateSpacesI18n[lang];
  return (
    <Layout
      rootScope={{ defaults: { node: { style: { stroke: 'none', fill: 'none' } } } }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Scope position={[100, 50]} transforms={[{ kind: 'scale', x: 2 }]}>
        <Coordinate id="base" position={[0, 0]} />
        <Node
          id="local"
          position={{ of: 'base', offset: [40, 0] }}
          shape="circle"
          layout={{ minimumSize: 4, padding: 0 }}
          style={{ fill: 'dodgerblue', stroke: 'none' }}
        />
      </Scope>
      <Node
        id="world"
        position={{ kind: 'anchor', target: { id: 'base', offset: [40, 0] } }}
        shape="circle"
        layout={{ minimumSize: 8, padding: 0 }}
        style={{ fill: 'darkorange', stroke: 'none' }}
      />
      <Node
        position={[100, 50]}
        shape="circle"
        layout={{ minimumSize: 8, padding: 0 }}
        style={{ fill: 'currentColor', stroke: 'none' }}
      />
      <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
        <Step kind="move" to={[80, 50]} />
        <Step kind="line" to={[220, 50]} />
      </Path>
      <Node position={[210, -12]} style={{ textColor: 'dodgerblue' }}>
        {text.local}
      </Node>
      <Node position={[190, 106]} style={{ textColor: 'darkorange' }}>
        {text.world}
      </Node>
      <Node position={[52, 150]}>{text.origin}</Node>
      <Node position={[150, 204]}>{text.scale}</Node>
      <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
        <Step kind="move" to={[180, 50]} />
        <Step kind="line" to={[180, 12]} />
        <Step kind="move" to={[140, 50]} />
        <Step kind="line" to={[140, 82]} />
        <Step kind="move" to={[100, 50]} />
        <Step kind="line" to={[100, 132]} />
      </Path>
    </Layout>
  );
};

export default CoordinateSpaces;
