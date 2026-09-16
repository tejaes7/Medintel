const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info

function emit(level, msg, meta) {
  if (LEVELS[level] < threshold) return
  const line = { ts: new Date().toISOString(), level, msg, ...(meta ? { ...meta } : {}) }
  const out = level === 'error' || level === 'warn' ? console.error : console.log
  out(JSON.stringify(line))
}

export const logger = {
  debug: (m, x) => emit('debug', m, x),
  info: (m, x) => emit('info', m, x),
  warn: (m, x) => emit('warn', m, x),
  error: (m, x) => emit('error', m, x),
  child: (base) => ({
    debug: (m, x) => emit('debug', m, { ...base, ...x }),
    info: (m, x) => emit('info', m, { ...base, ...x }),
    warn: (m, x) => emit('warn', m, { ...base, ...x }),
    error: (m, x) => emit('error', m, { ...base, ...x }),
  }),
}
