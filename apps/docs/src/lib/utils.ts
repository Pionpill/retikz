import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: Array<ClassValue>) => {
  return twMerge(clsx(inputs))
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const throttle = (func: Function, delay: number) => {
  let timeId: ReturnType<typeof setTimeout> | undefined;
  let lastExeTime = 0;
  return function (this: unknown, ...args: Array<unknown>) {
    const now = Date.now();
    const interTime = now - lastExeTime;
    if (interTime >= delay) {
      func.apply(this, args);
      lastExeTime = now;
    } else {
      clearTimeout(timeId);
      timeId = setTimeout(() => {
        func.apply(this, args);
        lastExeTime = Date.now();
      }, delay);
    }
  };
};
