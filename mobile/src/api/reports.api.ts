import * as Linking from 'expo-linking';
import { storage } from '../services/storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api';

export const reportsApi = {
  /**
   * Get direct download URL for the investment PDF report.
   */
  getReportUrl: (investmentId: string, currentPrice?: string): string => {
    let url = `${API_BASE_URL}/investments/${investmentId}/report`;
    if (currentPrice) {
      url += `?currentPrice=${encodeURIComponent(currentPrice)}`;
    }
    return url;
  },

  /**
   * Open / download the PDF report in the native browser or PDF viewer.
   */
  openReport: async (investmentId: string, currentPrice?: string): Promise<void> => {
    const url = reportsApi.getReportUrl(investmentId, currentPrice);
    const token = await storage.getToken();

    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      throw new Error('Unable to open browser to download report.');
    }
  },
};
