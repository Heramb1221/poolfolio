import { useState } from 'react';
import { reportsApi } from '../api/reports.api';

export function useInvestmentReport() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadReport = async (investmentId: string, currentPrice?: string) => {
    setIsDownloading(true);
    setError(null);
    try {
      await reportsApi.openReport(investmentId, currentPrice);
    } catch (err: any) {
      setError(err.message || 'Failed to download report');
      throw err;
    } finally {
      setIsDownloading(false);
    }
  };

  return {
    downloadReport,
    isDownloading,
    error,
  };
}
