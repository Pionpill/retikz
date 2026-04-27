import type { CSSProperties } from 'react';
import { Draw, Node, Path, Step, Tikz } from '@retikz/react';

const tikzStyle: CSSProperties = {
  border: '1px solid #ddd',
  display: 'block',
};

const sectionStyle: CSSProperties = { marginBottom: 32 };

/**
 * 调试入口：直接消费 packages/react / packages/core 源码。
 * 改动 Kernel / Sugar / Render / compile 任意一处，Vite HMR 立即生效。
 */
export const App = () => (
  <div style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
    <h1>retikz playground</h1>
    <p style={{ color: '#666' }}>直接消费 packages 源码，无需 build。</p>

    <section style={sectionStyle}>
      <h2>Kernel: Node + Path + Step</h2>
      <Tikz width={400} height={180} style={tikzStyle}>
        <Node id="A" position={[60, 80]}>Hello</Node>
        <Node id="B" position={[300, 120]}>World</Node>
        <Path stroke="steelblue" strokeWidth={2}>
          <Step kind="move" to="A" />
          <Step to="B" />
        </Path>
      </Tikz>
    </section>

    <section style={sectionStyle}>
      <h2>Sugar: Draw way 数组</h2>
      <Tikz width={400} height={180} style={tikzStyle}>
        <Node id="A" position={[60, 80]}>Hello</Node>
        <Node id="B" position={[300, 120]}>World</Node>
        <Draw way={['A', 'B']} stroke="crimson" strokeWidth={2} />
      </Tikz>
    </section>
  </div>
);
