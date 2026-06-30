import { create } from 'zustand';
import { AppNotification, Issue } from '../types';

const STORAGE_KEY = 'civicpulse-read-notifications';

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export type NotificationType = 'new_issue' | 'ai_completed' | 'summary_generated' | 'status_updated' | 'resolved';

export interface ExtendedNotification extends AppNotification {
  type: NotificationType;
  title: string;
  description: string;
}

interface NotificationState {
  notifications: ExtendedNotification[];
  syncFromIssues: (issues: Issue[], userId: string) => void;
  markAllRead: () => void;
  markAsRead: (id: string) => void;
  unreadCount: () => number;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],

  syncFromIssues: (issues, userId) => {
    const readIds = loadReadIds();
    const notifications: ExtendedNotification[] = [];

    issues.forEach(issue => {
      if (issue.reportedBy !== userId) return;

      const label = issue.aiAnalysis?.issueLabel || `Issue #${issue.issueId.slice(-6)}`;

      // 1. New Issue Reported
      const newIssueId = `${issue.issueId}-new_issue`;
      notifications.push({
        id: newIssueId,
        issueId: issue.issueId,
        message: `Your report for "${label}" has been logged.`,
        title: 'Issue Reported',
        description: `Your report for "${label}" has been logged successfully.`,
        type: 'new_issue',
        createdAt: issue.reportedAt,
        read: readIds.has(newIssueId),
      });

      // 2. AI Analysis Completed
      if (issue.aiAnalysis && issue.aiAnalysis.analysisStatus === 'completed') {
        const aiId = `${issue.issueId}-ai_completed`;
        notifications.push({
          id: aiId,
          issueId: issue.issueId,
          message: `AI analysis completed for "${label}"`,
          title: 'AI Analysis Ready',
          description: `Gemini has analyzed "${label}" and generated a resolution plan.`,
          type: 'ai_completed',
          createdAt: issue.reportedAt,
          read: readIds.has(aiId),
        });
      }

      // 3. Community Summary Generated
      if (issue.feedbackSummary) {
        const summaryId = `${issue.issueId}-summary_generated`;
        notifications.push({
          id: summaryId,
          issueId: issue.issueId,
          message: `AI generated feedback summary for "${label}"`,
          title: 'Feedback Summary Ready',
          description: `AI summarized resident feedback on your issue "${label}".`,
          type: 'summary_generated',
          createdAt: issue.reportedAt,
          read: readIds.has(summaryId),
        });
      }

      // 4. Issue Status Updated
      if (issue.status !== 'Reported' && issue.status !== 'Resolved') {
        const statusId = `${issue.issueId}-status_updated-${issue.status}`;
        notifications.push({
          id: statusId,
          issueId: issue.issueId,
          message: `"${label}" status updated to ${issue.status}`,
          title: 'Status Updated',
          description: `"${label}" status was updated to ${issue.status}.`,
          type: 'status_updated',
          createdAt: issue.reportedAt,
          read: readIds.has(statusId),
        });
      }

      // 5. Issue Resolved
      if (issue.status === 'Resolved') {
        const resolvedId = `${issue.issueId}-resolved`;
        notifications.push({
          id: resolvedId,
          issueId: issue.issueId,
          message: `"${label}" is resolved`,
          title: 'Issue Resolved',
          description: `Your reported issue "${label}" has been resolved.`,
          type: 'resolved',
          createdAt: issue.reportedAt,
          read: readIds.has(resolvedId),
        });
      }
    });

    set({ notifications: notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
  },

  markAllRead: () => {
    const readIds = loadReadIds();
    get().notifications.forEach(n => readIds.add(n.id));
    saveReadIds(readIds);
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    }));
  },

  markAsRead: (id: string) => {
    const readIds = loadReadIds();
    readIds.add(id);
    saveReadIds(readIds);
    set(state => ({
      notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    }));
  },

  unreadCount: () => get().notifications.filter(n => !n.read).length,
}));
