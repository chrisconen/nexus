const IS_ENABLED =
  import.meta.env.DATA_LOGGING_ENABLED === "true" ||
  import.meta.env.DATA_LOGGING_ENABLED === "1";

export function logData(...args: unknown[]) {
  if (IS_ENABLED) {
    console.log(...args);
  }
}
