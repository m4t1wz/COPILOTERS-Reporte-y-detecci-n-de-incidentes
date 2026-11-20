/**
 * Transforma una marca de tiempo ISO a la hora oficial argentina (UTC-3).
 * Formato visual estándar requerido por especificación: DD/MM/AAAA (HH:MM)
 * Ejemplo: 18/11/2026 (14:22)
 */
export const formatArgentinaDate = (isoString?: string | null): string => {
  if (!isoString) return '--/--/---- (--:--)';

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      return '--/--/---- (--:--)';
    }

    // Argentina es UTC-3 fijo
    // Usamos Intl.DateTimeFormat para garantizar precisión independientemente de la zona del dispositivo
    const formatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${day}/${month}/${year} (${hour}:${minute})`;
  } catch {
    return '--/--/---- (--:--)';
  }
};
