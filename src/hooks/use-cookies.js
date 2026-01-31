import { useMemo, useState, useEffect, useCallback } from 'react';

import { isEqual } from 'src/utils/helper';

// ----------------------------------------------------------------------

export function useCookies(key, initialState, defaultValues, options) {
  const [state, set] = useState(initialState);

  const multiValue = initialState && typeof initialState === 'object';

  const canReset = !isEqual(state, defaultValues);

  useEffect(() => {
    const restoredValue = getStorage(key);

    if (restoredValue) {
      if (multiValue) {
        set((prevValue) => ({ ...prevValue, ...restoredValue }));
      } else {
        set(restoredValue);
      }
    }
  }, [key, multiValue]);

  const setState = useCallback(
    (updateState) => {
      if (multiValue) {
        set((prevValue) => {
          setStorage(key, { ...prevValue, ...updateState }, options?.daysUntilExpiration);
          return { ...prevValue, ...updateState };
        });
      } else {
        setStorage(key, updateState, options?.daysUntilExpiration);
        set(updateState);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, multiValue]
  );

  const setField = useCallback(
    (name, updateValue) => {
      if (multiValue) {
        setState({
          [name]: updateValue,
        });
      }
    },
    [multiValue, setState]
  );

  const resetState = useCallback(() => {
    removeStorage(key);
    set(defaultValues);
  }, [defaultValues, key]);

  const memoizedValue = useMemo(
    () => ({
      state,
      setState,
      setField,
      resetState,
      canReset,
    }),
    [canReset, resetState, setField, setState, state]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

function getStorage(key) {
  try {
    const keyName = `${key}=`;

    const cDecoded = decodeURIComponent(document.cookie);

    const cArr = cDecoded.split('; ');

    let res;

    cArr.forEach((val) => {
      if (val.indexOf(keyName) === 0) res = val.substring(keyName.length);
    });

    if (res) {
      return JSON.parse(res);
    }
  } catch (error) {
    console.error('Error while getting from cookies:', error);
  }

  return null;
}

// ----------------------------------------------------------------------

function setStorage(key, value, daysUntilExpiration = 0) {
  try {
    const serializedValue = encodeURIComponent(JSON.stringify(value));
    let cookieOptions = `${key}=${serializedValue}; path=/`;

    if (daysUntilExpiration > 0) {
      const expirationDate = new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000);
      cookieOptions += `; expires=${expirationDate.toUTCString()}`;
    }

    document.cookie = cookieOptions;
  } catch (error) {
    console.error('Error while setting cookie:', error);
  }
}

// ----------------------------------------------------------------------

function removeStorage(key) {
  try {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (error) {
    console.error('Error while removing cookie:', error);
  }
}
