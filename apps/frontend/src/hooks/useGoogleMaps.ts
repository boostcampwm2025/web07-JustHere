import { useEffect, useState } from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loadPromise: Promise<void> | null = null;
let optionsSet = false;

const loadGoogleMaps = () => {
  if (!loadPromise) {
    loadPromise = (async () => {
      if (!optionsSet) {
        setOptions({
          key: GOOGLE_MAPS_API_KEY,
          libraries: ['places'],
        });
        optionsSet = true;
      }

      await importLibrary('places');
    })();
  }

  return loadPromise;
};

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('Google Maps API key가 설정되지 않았습니다. .env 파일을 확인해주세요.');
      return;
    }

    loadGoogleMaps()
      .then(() => setIsLoaded(true))
      .catch((error) => {
        console.error('Failed to load Google Maps API script', error);
      });
  }, []);

  return isLoaded;
}
