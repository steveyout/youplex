import { useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

export function useCarouselDots(mainApi) {
  const [dotCount, setDotCount] = useState(0);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [scrollSnaps, setScrollSnaps] = useState([]);

  const onClickDot = useCallback(
    (index) => {
      if (!mainApi) return;
      mainApi.scrollTo(index);
    },
    [mainApi]
  );

  const onInit = useCallback((_mainApi) => {
    setScrollSnaps(_mainApi.scrollSnapList());
  }, []);

  const onSelect = useCallback((_mainApi) => {
    setSelectedIndex(_mainApi.selectedScrollSnap());
    setDotCount(_mainApi.scrollSnapList().length);
  }, []);

  useEffect(() => {
    if (!mainApi) return;

    onInit(mainApi);
    onSelect(mainApi);
    mainApi.on('reInit', onInit);
    mainApi.on('reInit', onSelect);
    mainApi.on('select', onSelect);
  }, [mainApi, onInit, onSelect]);

  return {
    dotCount,
    scrollSnaps,
    selectedIndex,
    onClickDot,
  };
}
