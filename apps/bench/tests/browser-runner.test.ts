import { afterEach, describe, expect, it } from 'vitest';

import { getBrowserRunnerPath, readBenchPort } from '../src/benchmark/browser-runner';

const originalPort = process.env.RETIKZ_BENCH_PORT;
const originalSlot = process.env.RETIKZ_DEV_SLOT;

afterEach(() => {
  if (originalPort === undefined) delete process.env.RETIKZ_BENCH_PORT;
  else process.env.RETIKZ_BENCH_PORT = originalPort;
  if (originalSlot === undefined) delete process.env.RETIKZ_DEV_SLOT;
  else process.env.RETIKZ_DEV_SLOT = originalSlot;
});

describe('browser runner port', () => {
  it('进程中的应用专属端口优先于工作区槽位', () => {
    process.env.RETIKZ_BENCH_PORT = '7255';
    process.env.RETIKZ_DEV_SLOT = '02';
    expect(readBenchPort()).toBe(7255);
  });

  it('未配置应用专属端口时按进程工作区槽位解析', () => {
    delete process.env.RETIKZ_BENCH_PORT;
    process.env.RETIKZ_DEV_SLOT = '08';
    expect(readBenchPort()).toBe(7208);
  });

  it.each(['0', '65536', '1.5', 'not-a-port'])('拒绝非法端口 %s', value => {
    process.env.RETIKZ_BENCH_PORT = value;
    expect(() => readBenchPort()).toThrow(/1 and 65535/i);
  });
});

describe('browser runner page', () => {
  it('使用与 Performance Lab 隔离的 runner 页面', () => {
    expect(getBrowserRunnerPath()).toBe('/runner.html');
  });
});
