import { describe, expect, it } from 'vitest';

import { resolveBenchPort, resolveDocsPort } from '../../dev-port';

describe('dev port', () => {
  it('未配置时使用 next 槽位的服务默认端口', () => {
    expect(resolveDocsPort()).toBe(7101);
    expect(resolveBenchPort()).toBe(7201);
  });

  it('按同一工作区槽位解析不同服务端口', () => {
    expect(resolveDocsPort(undefined, '02')).toBe(7102);
    expect(resolveBenchPort(undefined, '02')).toBe(7202);
  });

  it('应用专属端口覆盖工作区槽位', () => {
    expect(resolveDocsPort('7152', '02')).toBe(7152);
    expect(resolveBenchPort('7252', '02')).toBe(7252);
  });

  it.each(['0', '65536', '1.5', 'not-a-port'])('拒绝非法显式端口 %s 并报告原始值', value => {
    expect(() => resolveDocsPort(value)).toThrow(`received "${value}"`);
    expect(() => resolveBenchPort(value)).toThrow(`received "${value}"`);
  });

  it.each(['-1', '100', '1.5', 'not-a-slot'])('拒绝非法工作区槽位 %s 并报告原始值', value => {
    expect(() => resolveDocsPort(undefined, value)).toThrow(`received "${value}"`);
    expect(() => resolveBenchPort(undefined, value)).toThrow(`received "${value}"`);
  });
});
