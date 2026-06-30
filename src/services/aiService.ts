import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { AIAnalysis } from '../types';

export const aiService = {
  analyzeIssue: async (issueId: string, imageBase64: string, description?: string, mimeType = 'image/jpeg', address?: string, landmark?: string): Promise<AIAnalysis> => {
    const analyzeCall = httpsCallable<
      { issueId: string; imageBase64: string; description?: string; mimeType?: string; address?: string; landmark?: string },
      { success: boolean; analysis: AIAnalysis }
    >(functions, 'analyzeIssue');
    const result = await analyzeCall({ issueId, imageBase64, description, mimeType, address, landmark });
    return result.data.analysis;
  }
};