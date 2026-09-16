import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Minimal data-fetching hook. Deliberately not a query library — the app has a handful of
 * endpoints and adding one would be weight the project does not need.
 *
 *   const { data, error, loading, reload } = useApi(() => api.reports.list(), [])
 */
export function useApi(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const mounted = useRef(true)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const result = await fetcherRef.current()
      if (mounted.current) setState({ data: result.data, meta: result.meta, error: null, loading: false })
      return result.data
    } catch (err) {
      if (mounted.current) setState({ data: null, error: err, loading: false })
      return null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    run()
  }, deps)

  return {
    ...state,
    reload: run,
    setData: (updater) =>
      setState((s) => ({
        ...s,
        data: typeof updater === 'function' ? updater(s.data) : updater,
      })),
  }
}

/** For actions (submit, delete) rather than reads: tracks pending + error for one call. */
export function useAction(action) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)

  const run = useCallback(
    async (...args) => {
      setPending(true)
      setError(null)
      try {
        return await action(...args)
      } catch (err) {
        setError(err)
        return null
      } finally {
        setPending(false)
      }
    },
    [action]
  )

  return { run, pending, error, clearError: () => setError(null) }
}
