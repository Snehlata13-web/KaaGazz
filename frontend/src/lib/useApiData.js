import { useCallback, useEffect, useState } from 'react'

/**
 * Loads data from one or more API calls and exposes the loading/error state the
 * section components render. `loader` must return a promise; it is re-run
 * whenever `deps` change or `reload()` is called.
 *
 * `loading` is derived by comparing the request key with the key of the result
 * currently in state, so no extra render pass is needed to enter the loading
 * state when the dependencies change.
 */
export function useApiData(loader, deps = []) {
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState({ data: null, error: null, key: null })
  const key = `${JSON.stringify(deps)}|${nonce}`

  useEffect(() => {
    let active = true
    loader()
      .then((data) => {
        if (active) setResult({ data, error: null, key })
      })
      .catch((error) => {
        // The whole error is kept so the UI can read its HTTP status, not just
        // the raw backend message.
        if (active) setResult({ data: null, error, key })
      })
    return () => {
      active = false
    }
    // `loader` is recreated on every render by design; `key` captures the real
    // dependencies passed in by the caller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const reload = useCallback(() => setNonce((value) => value + 1), [])
  const settled = result.key === key

  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
    reload,
  }
}

/**
 * Wraps a write action (POST/PATCH) with pending + error state and runs
 * `onSuccess` so the surrounding data can be refreshed.
 */
export function useApiAction(action, { onSuccess } = {}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (...args) => {
      setPending(true)
      setError('')
      try {
        const result = await action(...args)
        onSuccess?.(result)
        return result
      } catch (actionError) {
        setError(actionError.message)
        return null
      } finally {
        setPending(false)
      }
    },
    [action, onSuccess],
  )

  return { run, pending, error, setError }
}
