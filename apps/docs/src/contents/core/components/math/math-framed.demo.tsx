import { type FC, useEffect, useState } from 'react';
import type { LowerMath } from '@retikz/core';
import { Layout, Node, Path, Step } from '@retikz/react';
import { createLowerMath, createMathJaxEngine } from '@retikz/tex';

/**
 * 带框公式（B）：配 shape 的节点公式（children 对象写法）——任意容器据公式 bbox 自动尺寸，框走常规 fill / stroke
 * @description rectangle / circle 等任意 shape 作容器；带框公式节点照样可连线
 */
const Demo: FC = () => {
  const [lowerMath, setLowerMath] = useState<LowerMath>();
  useEffect(() => {
    let alive = true;
    createMathJaxEngine()
      .then(engine => {
        if (alive) setLowerMath(() => createLowerMath(engine));
      })
      .catch(() => {
        // mathjax-full 未装 / 启动失败：保持 undefined，公式节点降级 + 警告
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Layout width={460} height={160} lowerMath={lowerMath}>
      <Node id="box" position={[-100, 0]} shape="rectangle" fill="#eef2ff" stroke="#4f46e5" padding={12}>
        {{ tex: 'E = mc^2' }}
      </Node>
      <Node id="circ" position={[100, 0]} shape="circle" fill="#fff" stroke="#0f766e" padding={12}>
        {{ tex: '\\oint_C \\vec{F}' }}
      </Node>
      <Path stroke="#94a3b8" arrow="->">
        <Step kind="move" to="box" />
        <Step kind="line" to="circ" />
      </Path>
    </Layout>
  );
};

export default Demo;
