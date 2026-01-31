import { ScaleControl, GeolocateControl, NavigationControl, FullscreenControl } from 'react-map-gl';

// ----------------------------------------------------------------------

export function MapControl({ hideScale, hideGeolocate, hideFullscreen, hideNavigation }) {
  return (
    <>
      {!hideGeolocate && (
        <GeolocateControl position="top-left" positionOptions={{ enableHighAccuracy: true }} />
      )}

      {!hideFullscreen && <FullscreenControl position="top-left" />}

      {!hideScale && <ScaleControl position="bottom-left" />}

      {!hideNavigation && <NavigationControl position="bottom-left" />}
    </>
  );
}
