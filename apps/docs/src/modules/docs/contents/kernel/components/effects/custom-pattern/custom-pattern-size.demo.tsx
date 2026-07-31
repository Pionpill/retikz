import type { FC } from 'react';

import { definePattern } from '@retikz/core';
import { Layout, Node } from '@retikz/react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { customPatternSizeControls, previewControlContract } from './custom-pattern-size.controls';

export const previewControls = customPatternSizeControls;

/**
 * 同一个 motif、不同 tile 周期：`pattern.size` 覆盖 def 的 defaultSize，控制图案疏密。
 * dedup 按 spec 结构——size 不同 → 两个独立资源 / tile。
 */
const dotsGrid = definePattern({
  name: 'dotsGrid',
  defaultSize: 10,
  emit: ({ size, color }) => [{ type: 'ellipse', cx: size / 2, cy: size / 2, rx: 1.5, ry: 1.5, fill: color }],
});

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const background = values.background === 'transparent' ? undefined : values.background;

  return (
    <Layout width={260} height={110} patterns={[dotsGrid]}>
      <Node
        id="a"
        position={[0, 0]}
        minimumSize={{ width: 90, height: 80 }}
        fill={{ kind: 'pattern', shape: 'dotsGrid', size: 6, color: 'green' }}
        stroke="green"
      />
      <Node
        id="b"
        position={[120, 0]}
        minimumSize={{ width: 90, height: 80 }}
        fill={{
          kind: 'pattern',
          shape: 'dotsGrid',
          size: values.size,
          rotation: values.rotation,
          color: values.color,
          ...(background === undefined ? {} : { background }),
        }}
        stroke={values.color}
      />
    </Layout>
  );
});

export const previewSource = controlledPreview.source;
const Demo: FC = controlledPreview.Component;

export default Demo;
