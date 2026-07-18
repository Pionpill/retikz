import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Local flow from Arc / Sector sugar to Path + Step */
const Demo: FC = () => (
  <Layout width={580} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="props"
      position={[-215, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Arc / Sector props
    </Node>
    <Node
      id="select"
      position={[-65, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      {'Resolve angles\nselect topology'}
    </Node>
    <Node
      id="open"
      position={[150, -75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'Open Arc\nmove → arc'}
    </Node>
    <Node
      id="closed"
      position={[150, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'Closed Arc / solid Sector\nmove → circlePath | ellipsePath'}
    </Node>
    <Node
      id="hollow"
      position={[150, 75]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      {'Hollow Sector\nouter arc → line → reverse inner arc → line'}
    </Node>

    <Draw
      way={[
        'props',
        { label: { text: 'resolve', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'select',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: 'open', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'open',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: 'closed / solid', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'closed',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'select',
        { label: { text: 'innerRadius', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'hollow',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
