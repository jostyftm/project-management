import { useState, useEffect } from 'react'

function useDebounce(value: string, delay: number = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer) // limpia el timer si el valor cambia antes del delay
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
