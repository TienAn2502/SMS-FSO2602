import debounce from 'lodash/debounce';
import { useEffect, useMemo, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  const debouncedSet = useMemo(
    () => debounce((next: T) => setDebouncedValue(next), delay),
    [delay],
  );

  useEffect(() => {
    debouncedSet(value);
    return () => debouncedSet.cancel();
  }, [value, debouncedSet]);

  return debouncedValue;
}
