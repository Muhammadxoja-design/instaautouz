function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export const logger = {
  info: (msg: string, ...args: unknown[]) => {
    console.log(`\x1b[36m[${timestamp()}]\x1b[0m \x1b[32mINFO\x1b[0m  ${msg}`, ...args);
  },
  warn: (msg: string, ...args: unknown[]) => {
    console.warn(`\x1b[36m[${timestamp()}]\x1b[0m \x1b[33mWARN\x1b[0m  ${msg}`, ...args);
  },
  error: (msg: string, ...args: unknown[]) => {
    console.error(`\x1b[36m[${timestamp()}]\x1b[0m \x1b[31mERROR\x1b[0m ${msg}`, ...args);
  },
  success: (msg: string, ...args: unknown[]) => {
    console.log(`\x1b[36m[${timestamp()}]\x1b[0m \x1b[35mOK\x1b[0m    ${msg}`, ...args);
  },
};
