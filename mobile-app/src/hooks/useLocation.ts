import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { isInsideFormosa } from '../utils/geo';
import { coordinatesFallback, formatGeocodedAddress } from '../utils/address-formatter';

export { isInsideFormosa };

export interface LocationState {
  latitude: number;
  longitude: number;
  addressReference: string;
  isInsideFormosa: boolean;
  isLoading: boolean;
  errorMessage: string | null;
}

// Referencia preliminar (05 §1.1); la dirección oficial la calcula el backend al crear el reporte.
const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    return formatGeocodedAddress(results?.[0], lat, lon);
  } catch {
    return coordinatesFallback(lat, lon);
  }
};

export const useLocation = () => {
  // Ubicación inicial por defecto: Formosa Capital
  const [location, setLocation] = useState<LocationState>({
    latitude: -26.1852,
    longitude: -58.1738,
    addressReference: 'Formosa Capital, Formosa',
    isInsideFormosa: true,
    isLoading: true,
    errorMessage: null,
  });

  // Cada lectura (GPS o manual) toma un turno; solo la más reciente puede escribir el estado.
  const requestIdRef = useRef(0);

  const fetchCurrentLocation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    setLocation((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isCurrent()) return;
      if (status !== 'granted') {
        setLocation((prev) => ({
          ...prev,
          isLoading: false,
          errorMessage: 'Permiso de ubicación no concedido. Podés ingresar la ubicación manualmente.',
        }));
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (!isCurrent()) return;

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const inside = isInsideFormosa(lat, lon);
      const address = await reverseGeocode(lat, lon);
      if (!isCurrent()) return;

      setLocation({
        latitude: lat,
        longitude: lon,
        addressReference: address,
        isInsideFormosa: inside,
        isLoading: false,
        errorMessage: inside
          ? null
          : 'La ubicación detectada parece encontrarse fuera de la provincia de Formosa.',
      });
    } catch {
      if (!isCurrent()) return;
      setLocation((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: 'No se pudo obtener la posición satelital. Usando ubicación predeterminada.',
      }));
    }
  }, []);

  useEffect(() => {
    fetchCurrentLocation();
  }, [fetchCurrentLocation]);

  const setManualCoordinates = useCallback(
    async (lat: number, lon: number, customAddress?: string) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const requestId = ++requestIdRef.current;
      const inside = isInsideFormosa(lat, lon);
      const errorMessage = inside
        ? null
        : 'La ubicación seleccionada está fuera de los límites de la provincia de Formosa.';

      // Las coordenadas se aplican de inmediato; la dirección se muestra en carga hasta resolverse.
      setLocation({
        latitude: lat,
        longitude: lon,
        addressReference: customAddress || coordinatesFallback(lat, lon),
        isInsideFormosa: inside,
        isLoading: !customAddress,
        errorMessage,
      });
      if (customAddress) return;

      const address = await reverseGeocode(lat, lon);
      if (requestId !== requestIdRef.current) return;
      setLocation((prev) => ({ ...prev, addressReference: address, isLoading: false }));
    },
    []
  );

  return {
    ...location,
    refreshLocation: fetchCurrentLocation,
    setManualCoordinates,
  };
};
