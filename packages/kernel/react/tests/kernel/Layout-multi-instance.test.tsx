import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { Layout } from '../../src/kernel/Layout';

/**
 * 多 `<Layout>` 实例的 marker id 隔离
 * @description marker id 走 `useId()` 派生前缀，多实例同页应分配不同前缀，避免 SVG `<defs>` 冲突
 */
const extractMarkerIds = (svg: string): Array<string> => {
  const ids: Array<string> = [];
  const re = /<marker[^>]*\bid="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg)) !== null) {
    ids.push(m[1]);
  }
  return ids;
};

const extractPrefix = (id: string): string => {
  // marker id 格式：retikz-arrow-<useIdHash>-<specHash>
  const match = id.match(/^(retikz-arrow-[^-]+)-/);
  return match ? match[1] : '';
};

describe('多 Layout 实例 marker id 隔离', () => {
  it('两个 Layout 实例 + 同 spec → marker id 不同前缀（useId 派生）', () => {
    const svg = renderToStaticMarkup(
      <div>
        <Layout width={100} height={100}>
          <Path arrow="->" arrowDetail={{ shape: 'stealth' }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
        <Layout width={100} height={100}>
          <Path arrow="->" arrowDetail={{ shape: 'stealth' }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
      </div>,
    );

    const ids = extractMarkerIds(svg);
    expect(ids.length).toBeGreaterThanOrEqual(2);
    const prefixes = ids.map(extractPrefix);
    // 两实例前缀应不同
    const uniquePrefixes = new Set(prefixes);
    expect(uniquePrefixes.size).toBe(2);
  });

  it('两实例不同 spec → 各自独立 marker，不互相串话', () => {
    const svg = renderToStaticMarkup(
      <div>
        <Layout width={100} height={100}>
          <Path arrow="->" arrowDetail={{ shape: 'stealth', color: '#dc2626' }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
        <Layout width={100} height={100}>
          <Path arrow="->" arrowDetail={{ shape: 'open' }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[80, 0]} />
          </Path>
        </Layout>
      </div>,
    );

    const ids = extractMarkerIds(svg);
    // 每实例 1 个 marker，共 2 个
    expect(ids).toHaveLength(2);
    // 全部 id 互不相同（前缀 + spec hash 都可能不同）
    expect(new Set(ids).size).toBe(2);
  });
});
