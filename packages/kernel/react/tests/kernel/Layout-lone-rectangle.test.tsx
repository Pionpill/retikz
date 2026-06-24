import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Layout } from '../../src/kernel/Layout';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';

/**
 * 回归：自包含 rectangle step 单独成 <Path>（无前置 move）应正常渲染
 * @description 复现 step-rectangle.demo 崩溃——旧版 readPathChildren 对单 step path 抛
 *   "<Path> requires at least 2 <Step> children"，整页崩。rectangle 自带 from/to 两对角、
 *   不依赖游标，单独成 path 合法。
 */
describe('<Layout> 单个自包含 rectangle step', () => {
  it('lone rounded rectangle（demo 形态）→ 渲染出 <path>，不抛错', () => {
    const svg = renderToStaticMarkup(
      <Layout width={260} height={140}>
        <Path fill="lightgray" stroke="currentColor">
          <Step kind="rectangle" from={[-80, -40]} to={[80, 40]} cornerRadius={10} />
        </Path>
      </Layout>,
    );
    expect(svg).toContain('<path');
    expect(svg).toContain('<svg');
  });
});
