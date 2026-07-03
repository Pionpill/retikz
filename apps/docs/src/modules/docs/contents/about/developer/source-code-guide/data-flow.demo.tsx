import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/**
 * Source-guide data-flow illustration.
 * @description Top row: JSX/DSL -> parsers -> IR -> compile -> Scene -> adapter renderer.
 * Bottom row shows schema / contract owners; shared/geometry is a compile helper dependency.
 */
const Demo: FC = () => (
  <Layout width={660} height={150} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node id="jsx" position={[-300, 0]} stroke="none">
      JSX / DSL
    </Node>
    <Node id="parsers" position={[-195, 0]} stroke="none">
      parsers
    </Node>
    <Node id="ir" position={[-110, 0]} stroke="none">
      IR
    </Node>
    <Node id="compile" position={[0, 0]} stroke="none">
      compile
    </Node>
    <Node id="scene" position={[110, 0]} stroke="none">
      Scene
    </Node>
    <Node id="adapter" position={[240, 0]} stroke="none">
      adapter renderer
    </Node>

    <Draw way={['jsx', 'parsers']} arrow="->" />
    <Draw way={['parsers', 'ir']} arrow="->" />
    <Draw way={['ir', 'compile']} arrow="->" />
    <Draw way={['compile', 'scene']} arrow="->" />
    <Draw way={['scene', 'adapter']} arrow="->" />

    <Node id="ir_schema" position={[-110, 90]} stroke="none">
      ir/* schema
    </Node>
    <Node id="shared_geometry" position={[0, 90]} stroke="none">
      shared/geometry
    </Node>
    <Node id="contract_scene" position={[110, 90]} stroke="none">
      contract/scene
    </Node>
    <Node id="react" position={[240, 90]} stroke="none">
      @retikz/react
    </Node>

    <Draw way={['ir_schema', 'ir']} arrow="->" />
    <Draw way={['shared_geometry', 'compile']} arrow="->" dashPattern={[4, 3]} />
    <Draw way={['contract_scene', 'scene']} arrow="->" />
    <Draw way={['react', 'adapter']} arrow="->" />
  </Layout>
);

export default Demo;
