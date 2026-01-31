import { useMemo, useState, useCallback } from 'react';

// ----------------------------------------------------------------------

export function useTabs(defaultValue) {
  const [value, setValue] = useState(defaultValue);

  const onChange = useCallback((event, newValue) => {
    setValue(newValue);
  }, []);

  const memoizedValue = useMemo(() => ({ value, setValue, onChange }), [onChange, value]);

  return memoizedValue;
}
