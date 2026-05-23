import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { TikZ } from '../../src/kernel/Layout';

/**
 * TikZ 容器：spec → marker id hash 行为
 * @description 用 renderToStaticMarkup 拿最终 SVG 字符串，定位 `<marker id="...">` 数量 + 是否合并/分离
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

describe('TikZ arrow marker dedup：同 detail 复用、不同 detail 分离', () => {
  it("同 spec 用两次 → 1 个 marker defs", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path arrow="<->" arrowDetail={{ shape: 'stealth' }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    const ids = extractMarkerIds(svg);
    expect(ids).toHaveLength(1);
  });

  it("起末异形（normal / stealth）→ 2 个 marker defs（不同 hash）", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path
          arrow="<->"
          arrowDetail={{ start: { shape: 'normal' }, end: { shape: 'stealth' } }}
        >
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    const ids = extractMarkerIds(svg);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
  });

  it("起末异色（同 shape 不同 color）→ 2 个 marker defs（hash 区分 color 字段）", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path
          arrow="<->"
          arrowDetail={{
            shape: 'stealth',
            start: { color: 'red' },
            end: { color: 'blue' },
          }}
        >
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    const ids = extractMarkerIds(svg);
    expect(ids).toHaveLength(2);
  });

  it("两条 Path 共享同 spec → 总共 1 个 marker defs（跨 Path dedup）", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={200} height={100}>
        <Path arrow="->" arrowDetail={{ shape: 'stealth', color: 'red' }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
        <Path arrow="->" arrowDetail={{ shape: 'stealth', color: 'red' }}>
          <Step kind="move" to={[0, 30]} />
          <Step kind="line" to={[80, 30]} />
        </Path>
      </TikZ>,
    );
    const ids = extractMarkerIds(svg);
    expect(ids).toHaveLength(1);
  });

  it("字段顺序不影响 hash（stable key 按字段名字典序排）", () => {
    // 同样的 spec 字段，用 different literal ordering → 同一 hash 同一 marker
    // 由于 React 调用方 spec 字段顺序由 IR builder 决定，这条测试通过两个 Path 验证 dedup
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path
          arrow="->"
          arrowDetail={{ shape: 'stealth', color: 'red', scale: 1.5 }}
        >
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
        <Path
          arrow="->"
          // 改字段写顺序
          arrowDetail={{ scale: 1.5, shape: 'stealth', color: 'red' }}
        >
          <Step kind="move" to={[0, 30]} />
          <Step kind="line" to={[80, 30]} />
        </Path>
      </TikZ>,
    );
    const ids = extractMarkerIds(svg);
    expect(ids).toHaveLength(1);
  });
});

describe('TikZ arrow marker：marker 元素属性按 spec 写到 SVG', () => {
  it("color='red' → SVG `<marker>` 子 `<path>` fill='red'（实心 normal）", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path arrow="->" arrowDetail={{ shape: 'normal', color: 'red' }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    // marker 块内出现 fill="red"
    expect(svg).toMatch(/<marker[^>]*>[^<]*<path[^>]*fill="red"/);
  });

  it("空心 open + fill='red' silent ignore → 最终 SVG 中不含 marker 内的 red 填充", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path arrow="->" arrowDetail={{ shape: 'open', fill: 'red' }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    // marker 块内 path 是 fill="none"（不是 "red"）
    expect(svg).toMatch(/<marker[^>]*>[^<]*<path[^>]*fill="none"/);
    // 加强：marker 块内不出现 fill="red"
    const markerSection = svg.match(/<marker[\s\S]*?<\/marker>/);
    expect(markerSection).toBeTruthy();
    expect(markerSection![0]).not.toContain('fill="red"');
  });

  it("scale=2 → marker 元素 markerWidth=12 markerHeight=12（6×2）", () => {
    const svg = renderToStaticMarkup(
      <TikZ width={100} height={100}>
        <Path arrow="->" arrowDetail={{ shape: 'normal', scale: 2 }}>
          <Step kind="move" to={[0, 0]} />
          <Step kind="line" to={[80, 0]} />
        </Path>
      </TikZ>,
    );
    expect(svg).toMatch(/<marker[^>]*markerWidth="12"/);
    expect(svg).toMatch(/<marker[^>]*markerHeight="12"/);
  });
});
