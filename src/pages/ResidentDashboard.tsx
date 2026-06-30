import React, { useEffect } from 'react';
import { useIssueStore } from '../store/useIssueStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { IssueCard } from '../components/issues/IssueCard';
import { Plus, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/ui/Loading';

export const ResidentDashboard: React.FC = () => {
  const { issues, loading, subscribeToIssues } = useIssueStore();
  const { user } = useAuthStore();
  const syncFromIssues = useNotificationStore(s => s.syncFromIssues);

  useEffect(() => {
    if (user?.societyId) {
      const unsubscribe = subscribeToIssues(user.societyId);
      return () => unsubscribe();
    }
  }, [subscribeToIssues, user?.societyId]);

  useEffect(() => {
    if (user && issues.length > 0) {
      syncFromIssues(issues, user.userId);
    }
  }, [issues, user, syncFromIssues]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 pb-24 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Community Feed</h1>
          <p className="mt-1 text-sm text-gray-500">Recent issues reported in your society.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="w-8 h-8" />
        </div>
      ) : issues.length === 0 ? (
        <div className="max-w-md mx-auto rounded-2xl border border-gray-200/60 bg-white shadow-soft p-8 text-center animate-in fade-in duration-300 transition-all duration-200 hover:shadow-hover hover:scale-[1.004] hover:border-gray-200">
          <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-50 text-blue-600 select-none">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No Issues Reported Yet</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
            Start improving your community by reporting the first issue.
          </p>
          <div className="mt-6">
            <Link
              to="/report"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-6 font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Report an Issue
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <IssueCard key={issue.issueId} issue={issue} />
          ))}
        </div>
      )}

      <Link
        to="/report"
        className="fixed bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
};
