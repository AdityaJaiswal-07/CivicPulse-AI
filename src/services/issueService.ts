import { collection, doc, setDoc, updateDoc, query, orderBy, onSnapshot, increment, where, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Issue, IssueStatus } from '../types';

export const issueService = {
  subscribeToIssues: (societyId: string, callback: (issues: Issue[]) => void) => {
    const q = query(collection(db, 'issues'), where('societyId', '==', societyId), orderBy('reportedAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const issues = snapshot.docs.map(doc => doc.data() as Issue);
      callback(issues);
    },
      (error) => {
        console.error("Firestore Error:", error);
        callback([]);
      });
  },

  subscribeToIssue: (issueId: string, callback: (issue: Issue | null) => void) => {
    return onSnapshot(doc(db, 'issues', issueId), (snap) => {
      callback(snap.exists() ? snap.data() as Issue : null);
    }, (error) => {
      console.error('Issue subscription error:', error);
      callback(null);
    });
  },

  createIssue: async (issueData: Partial<Issue>): Promise<string> => {
    if (!issueData.societyId) {
      throw new Error("Society ID is required");
    }

    const issueRef = doc(collection(db, 'issues'));
    const issueId = issueRef.id;

    const newIssue: any = {
      issueId,
      societyId: issueData.societyId,
      reportedBy: issueData.reportedBy || 'unknown',
      reportedAt: new Date().toISOString(),
      status: 'Reported',
      imageUrl: issueData.imageUrl || '',
      description: issueData.description || '',
      locationLabel: issueData.locationLabel || 'Unknown Location',
      address: (issueData as any).address || '',
      landmark: (issueData as any).landmark || '',
      voteCount: 0,
      commentCount: 0,
      aiAnalysis: { analysisStatus: 'processing' } as Issue['aiAnalysis'],
    };

    await setDoc(issueRef, newIssue);
    return issueId;
  },

  updateIssueStatus: async (issueId: string, status: IssueStatus, assignedCommittee?: string): Promise<void> => {
    const issueRef = doc(db, 'issues', issueId);
    const updates: Record<string, unknown> = { status };
    if (assignedCommittee) updates.assignedCommittee = assignedCommittee;
    await updateDoc(issueRef, updates);
  },

  acceptAIPlan: async (issueId: string, adminUid: string, assignedCommittee: string): Promise<void> => {
    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
      status: 'Verified',
      acceptedAIPlan: true,
      acceptedAt: new Date().toISOString(),
      acceptedBy: adminUid,
      assignedCommittee,
    });
  },

  updateIssueImage: async (issueId: string, imageUrl: string): Promise<void> => {
    await updateDoc(doc(db, 'issues', issueId), { imageUrl });
  },

  hasVoted: async (issueId: string, userId: string): Promise<boolean> => {
    const voteSnap = await getDoc(doc(db, 'issues', issueId, 'votes', userId));
    return voteSnap.exists();
  },

  voteIssue: async (issueId: string, userId: string): Promise<void> => {
    const voteRef = doc(db, 'issues', issueId, 'votes', userId);
    const existing = await getDoc(voteRef);
    if (existing.exists()) {
      throw new Error('You have already voted on this issue');
    }

    const issueRef = doc(db, 'issues', issueId);
    await setDoc(voteRef, { votedAt: new Date().toISOString() });
    await updateDoc(issueRef, { voteCount: increment(1) });
  }
};
