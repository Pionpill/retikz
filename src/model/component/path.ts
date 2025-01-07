import { Position } from '../../types/coordinate/descartes';

export type StateListener = (state?: PathModel, prevState?: PathModel) => void;

export default class PathModel {
  type = ['path'];
  init = false;
  disposed = false;
  ways: Array<Position[]> = [];
  lineWidth = 1;
  listeners = new Set<StateListener>();

  constructor(ways: Array<Position[]>, lineWidth: number, init = true) {
    this.update({ ways, lineWidth, init });
  }

  update(config: { ways?: Array<Position[]>; lineWidth?: number; init?: boolean }) {
    const { ways, lineWidth, init } = config;
    const preSelf = { ...this };
    let needUpdate = false;

    if (!this.init && init) {
      this.init = init;
      needUpdate = true;
    }
    if (ways && ways !== this.ways) {
      this.ways = ways;
      needUpdate = true;
    }
    if (lineWidth && lineWidth !== this.lineWidth) {
      this.lineWidth = lineWidth;
      needUpdate = true;
    }
    if (this.init && needUpdate) this.notify(preSelf);
  }

  notify(preSelf?: PathModel) {
    this.listeners.forEach(listener => listener({ ...this }, preSelf));
  }

  subscribe(listener: StateListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose() {
    this.listeners.clear();
    this.disposed = true;
    this.notify(this);
  }
}
