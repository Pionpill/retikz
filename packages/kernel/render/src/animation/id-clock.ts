/**
 * 按 id 的虚拟时钟登记表：在单条 scene 级 rAF 共享时钟之上，给每个元素 id 叠加独立的时间偏移 / 暂停 / 激活态
 * @description Canvas 后端无逐元素 DOM，per-id 动画控制（`ctx.animation.restart(id)` 等）靠此把全局时间 `globalTime`
 *   折算成该 id 的「有效时刻」。纯数据 / 纯数学（无 DOM）。每个 id 的状态：
 *   - `offset`：有效时刻 = `globalTime − offset`（restart 把 offset 设为当前 globalTime，使有效时刻归零）
 *   - `pausedAt`：非 null 时定格在该有效时刻（暂停）
 *   - `active`：是否播放该 id 的**非自动播**（manual / visible / onEvent）track（被 play / restart 激活）
 *   - `stopped`：true 时该 id 渲染 base 静止态（跳过全部 track）
 *   自动播（load）track 不依赖 `active`，恒按有效时刻播放（除非 `stopped`）。
 */

/** 单个 id 的虚拟时钟态 */
type IdEntry = { offset: number; pausedAt: number | null; active: boolean; stopped: boolean };

/** 按 id 的虚拟时钟登记表 */
export type IdClockRegistry = {
  /** 该 id 的有效时刻（`pausedAt` 优先，否则 `globalTime − offset`）；无 entry → `globalTime` */
  timeFor: (id: string | undefined, globalTime: number) => number;
  /** 是否应用该 id 的非自动播 track（play / restart 后为 true） */
  isActive: (id: string | undefined) => boolean;
  /** 该 id 是否处于 stop（渲染 base，跳过全部 track） */
  isStopped: (id: string | undefined) => boolean;
  /** 播放 / 继续：清暂停、激活非自动播 track */
  play: (id: string, globalTime: number) => void;
  /** 暂停：定格在当前有效时刻 */
  pause: (id: string, globalTime: number) => void;
  /** 从头重播：有效时刻归零、激活 */
  restart: (id: string, globalTime: number) => void;
  /** 停止：渲染 base 静止态 */
  stop: (id: string) => void;
  /** 跳到有效时刻 timeMs */
  seek: (id: string, timeMs: number, globalTime: number) => void;
};

/** 创建按 id 的虚拟时钟登记表 */
export const createIdClockRegistry = (): IdClockRegistry => {
  const map = new Map<string, IdEntry>();
  const ensure = (id: string): IdEntry => {
    let entry = map.get(id);
    if (!entry) {
      entry = { offset: 0, pausedAt: null, active: false, stopped: false };
      map.set(id, entry);
    }
    return entry;
  };
  return {
    timeFor: (id, globalTime) => {
      if (id === undefined) return globalTime;
      const entry = map.get(id);
      if (!entry) return globalTime;
      return entry.pausedAt ?? globalTime - entry.offset;
    },
    isActive: id => (id === undefined ? false : map.get(id)?.active ?? false),
    isStopped: id => (id === undefined ? false : map.get(id)?.stopped ?? false),
    play: (id, globalTime) => {
      const entry = ensure(id);
      if (entry.pausedAt !== null) {
        entry.offset = globalTime - entry.pausedAt;
        entry.pausedAt = null;
      }
      entry.active = true;
      entry.stopped = false;
    },
    pause: (id, globalTime) => {
      const entry = ensure(id);
      if (entry.pausedAt === null) entry.pausedAt = globalTime - entry.offset;
      entry.stopped = false;
    },
    restart: (id, globalTime) => {
      const entry = ensure(id);
      entry.offset = globalTime;
      entry.pausedAt = null;
      entry.active = true;
      entry.stopped = false;
    },
    stop: id => {
      const entry = ensure(id);
      entry.stopped = true;
      entry.active = false;
      entry.pausedAt = null;
    },
    seek: (id, timeMs, globalTime) => {
      const entry = ensure(id);
      entry.stopped = false;
      entry.active = true;
      if (entry.pausedAt !== null) entry.pausedAt = timeMs;
      else entry.offset = globalTime - timeMs;
    },
  };
};
