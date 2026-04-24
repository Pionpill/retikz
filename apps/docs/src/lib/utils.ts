import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const throttle = (func: Function, delay: number) => {
  let timeId: number | NodeJS.Timeout;
  let lastExeTime = 0;
  return function (this: unknown, ...args: unknown[]) {
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
