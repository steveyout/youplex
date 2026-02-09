import { STATUS } from 'react-joyride';
import { useRef, useState } from 'react';

// ----------------------------------------------------------------------

export function useWalktour({ steps, defaultRun }) {
  const helpers = useRef();

  const [run, setRun] = useState(!!defaultRun);

  const setHelpers = (storeHelpers) => {
    helpers.current = storeHelpers;
  };

  const onCallback = (data) => {
    const { status } = data;

    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
    }
  };

  return {
    run,
    steps,
    setRun,
    onCallback,
    setHelpers,
  };
}
