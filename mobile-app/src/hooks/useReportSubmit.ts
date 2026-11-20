import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshMapQueries } from './useIncidents';
import { reportService } from '../services/report-service';
import { ReportConfirmation, ReportCreatePayload } from '../types';
import { formatAPIError } from '../services/api';

export const useReportSubmit = () => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async (payload: ReportCreatePayload): Promise<ReportConfirmation | null> => {
    setIsSubmitting(true);
    setErrorMessage(null);

    // Validación condicional de negocio
    const hasPhoto = Boolean(payload.photo && payload.photo.uri);
    const hasComment = Boolean(payload.comment && payload.comment.trim().length > 0);

    if (!hasPhoto && !hasComment) {
      setErrorMessage(
        'Como no adjuntaste foto, debés describir qué ocurrió en el comentario para que podamos atender el aviso.'
      );
      setIsSubmitting(false);
      return null;
    }

    if (payload.category === 'otro' && !hasPhoto && !hasComment) {
      setErrorMessage(
        'Al seleccionar "Otro", debés especificar qué sucedió si no adjuntaste una fotografía.'
      );
      setIsSubmitting(false);
      return null;
    }

    try {
      const confirmation = await reportService.submitReport(payload);
      // El reporte nuevo aparece en el mapa y en «Mis reportes» sin esperar al refresco periódico.
      refreshMapQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
      return confirmation;
    } catch (error) {
      setErrorMessage(formatAPIError(error));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submit,
    isSubmitting,
    errorMessage,
    setErrorMessage,
  };
};
