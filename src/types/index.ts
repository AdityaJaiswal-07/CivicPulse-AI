export type Role = 'resident' | 'admin';
export type IssueStatus = 'Reported' | 'Verified' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected' | 'Closed';
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';
export type Priority = 'Urgent' | 'High' | 'Normal' | 'Low';

export interface User {
  userId: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: Role;
  societyId: string;
}

export interface ActionPlanStep {
  step: string;
  timeline: string;
  responsibility: string;
}

export interface AIAnalysis {
  issueType: string;
  issueLabel: string;
  severity: Severity;
  priority: Priority;
  confidence: number;
  suggestedCommittee: string;
  temporaryActions: string[];
  actionPlan: ActionPlanStep[];
  estimatedCost?: string;
  estimatedResolutionTime?: string;
  reasoning?: string;
  nextSteps: string;
  analysisStatus: AnalysisStatus;
}

export interface Issue {
  issueId: string;
  societyId: string;
  reportedBy: string;
  reportedAt: string; // ISO string for simplicity in frontend
  imageUrl: string;
  description?: string;
  location?: { lat: number; lng: number };
  locationLabel?: string;
  status: IssueStatus;
  assignedCommittee?: string;
  aiAnalysis?: AIAnalysis;
  voteCount: number;
  commentCount: number;
  feedbackSummary?: string;
  acceptedAIPlan?: boolean;
  acceptedAt?: string;
  acceptedBy?: string;
}

export interface Comment {
  commentId: string;
  issueId: string;
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  issueId: string;
  message: string;
  createdAt: string;
  read: boolean;
}
