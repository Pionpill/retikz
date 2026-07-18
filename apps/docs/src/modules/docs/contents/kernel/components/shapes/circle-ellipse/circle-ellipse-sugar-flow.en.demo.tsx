import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Circle / Ellipse Sugar 输入归一化到 Path Step 的局部流程图 */
const Demo: FC = () => (
  <Layout width={720} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="target-input"
      position={[-275, -72]}
      text={['Circle', 'center + radius / diameter']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="literal-input"
      position={[-275, 72]}
      text={['Literal geometry', 'from / corners / box / Ellipse']}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="pass-target"
      position={[-75, -72]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Preserve target
    </Node>
    <Node
      id="compute-geometry"
      position={[-75, 72]}
      text={['Compute center + radii', 'literal [x, y] only']}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13 }}
    />
    <Node
      id="path-step"
      position={[145, 0]}
      text={['Path + Step', 'circlePath / ellipsePath']}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    />
    <Node
      id="angles"
      position={[145, 100]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      angles + closed
    </Node>
    <Node
      id="path-output"
      position={[310, 0]}
      text={['Path geometry', 'outline / partial arc']}
      stroke="darkviolet"
      fill="darkviolet"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    />

    <Draw way={['target-input', 'pass-target']} arrow="->" stroke="gray" />
    <Draw way={['literal-input', 'compute-geometry']} arrow="->" stroke="gray" />
    <Draw
      way={[
        'pass-target',
        { label: { text: 'pass through', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'path-step',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw
      way={[
        'compute-geometry',
        { label: { text: 'normalize', side: 'bottom', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'path-step',
      ]}
      arrow="->"
      stroke="gray"
    />
    <Draw way={['angles', 'path-step']} arrow="->" stroke="gray" dashPattern={[4, 3]} />
    <Draw
      way={[
        'path-step',
        { label: { text: 'compile', side: 'top', sloped: true, textColor: 'gray', font: { size: 11 } } },
        'path-output',
      ]}
      arrow="->"
      stroke="gray"
    />
  </Layout>
);

export default Demo;
