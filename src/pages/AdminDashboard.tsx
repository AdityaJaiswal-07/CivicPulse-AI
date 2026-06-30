import React, { useEffect } from 'react';
import { useIssueStore } from '../store/useIssueStore';
import { useAuthStore } from '../store/useAuthStore';
import { issueService } from '../services/issueService';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CheckCircle2, FolderOpen, Brain, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Spinner } from '../components/ui/Loading';

export const AdminDashboard: React.FC = () => {
  const { issues, loading, subscribeToIssues } = useIssueStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user?.societyId) {
      const unsubscribe = subscribeToIssues(user.societyId);
      return () => unsubscribe();
    }
  }, [subscribeToIssues, user?.societyId]);

  const openIssuesCount = issues.filter(i =>
    i.status === 'Reported' ||
    i.status === 'Verified' ||
    i.status === 'Assigned' ||
    i.status === 'In Progress'
  ).length;

  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

  const completedAnalyses = issues.filter(i => i.aiAnalysis?.analysisStatus === 'completed' && typeof i.aiAnalysis?.confidence === 'number');
  const avgConfidence = completedAnalyses.length > 0
    ? Math.round(completedAnalyses.reduce((acc, curr) => acc + (curr.aiAnalysis?.confidence ?? 0), 0) / completedAnalyses.length)
    : null;

  const pendingAiReviewCount = issues.filter(i => i.aiAnalysis?.analysisStatus !== 'completed').length;

  const handleAcceptPlan = async (issueId: string, committee?: string) => {
    if (!user) return;
    try {
      await issueService.acceptAIPlan(issueId, user.userId, committee || 'Maintenance');
    } catch (err) {
      console.error('Failed to accept AI plan:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Society Command Center</h1>
        <p className="mt-1 text-sm text-gray-500">Manage community operations and track issue resolution.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* ① Open Issues */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-soft transition-all duration-200 ease-in-out hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 h-full flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Open Issues</span>
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 select-none">
              <FolderOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 leading-none">{openIssuesCount}</span>
            <p className="text-[10px] text-gray-400 mt-1 select-none font-medium">Requires committee attention</p>
          </div>
        </div>

        {/* ② Resolved */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-soft transition-all duration-200 ease-in-out hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 h-full flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Resolved</span>
            <div className="p-2 rounded-full bg-green-50 text-green-600 select-none">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 leading-none">{resolvedCount}</span>
            <p className="text-[10px] text-gray-400 mt-1 select-none font-medium">Successfully completed</p>
          </div>
        </div>

        {/* ③ Average AI Confidence */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-soft transition-all duration-200 ease-in-out hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 h-full flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Avg AI Confidence</span>
            <div className="p-2 rounded-full bg-purple-50 text-purple-600 select-none">
              <Brain className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 leading-none">
              {avgConfidence !== null ? `${avgConfidence}%` : '—'}
            </span>
            <p className="text-[10px] text-gray-400 mt-1 select-none font-medium">Across completed analyses</p>
          </div>
        </div>

        {/* ④ Pending AI Review */}
        <div className="bg-white p-5 rounded-xl border border-gray-200/60 shadow-soft transition-all duration-200 ease-in-out hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 h-full flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Pending AI Review</span>
            <div className="p-2 rounded-full bg-amber-50 text-amber-600 select-none">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-extrabold text-gray-900 leading-none">{pendingAiReviewCount}</span>
            <p className="text-[10px] text-gray-400 mt-1 select-none font-medium">Awaiting AI processing</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="font-semibold text-gray-900">Issue Queue</h2>
        </div>
        <div className="overflow-x-auto">
          {issues.length === 0 ? (
            <div className="max-w-md mx-auto rounded-2xl border border-gray-200/60 bg-white shadow-soft p-8 text-center animate-in fade-in duration-300 transition-all duration-200 hover:shadow-hover hover:scale-[1.004] hover:border-gray-200 my-8">
              <div className="h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-blue-50 text-blue-600 select-none">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">No Pending Issues</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                Great! All reported issues have been reviewed.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">ID / Date</th>
                  <th className="px-6 py-3">Issue Details</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">AI Resolution</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.issueId} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-xs text-gray-500">#{issue.issueId.slice(-6)}</div>
                      <div className="text-gray-900">{new Date(issue.reportedAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{issue.aiAnalysis?.issueLabel || 'Pending'}</div>
                      <div className="text-gray-500 text-xs mt-1">{issue.locationLabel}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={issue.status === 'Reported' ? 'default' : issue.status === 'Resolved' ? 'success' : 'info'}>
                        {issue.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {issue.aiAnalysis?.analysisStatus === 'completed' ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant={issue.aiAnalysis.severity === 'Critical' ? 'danger' : 'warning'}>{issue.aiAnalysis.severity}</Badge>
                          <span className="text-xs text-gray-500">{issue.aiAnalysis.suggestedCommittee}</span>
                        </div>
                      ) : issue.aiAnalysis?.analysisStatus === 'failed' ? (
                        <span className="text-red-500 text-xs">Analysis failed</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Analyzing...</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/issue/${issue.issueId}`}>
                          <Button variant="outline" size="sm">Review</Button>
                        </Link>
                        {issue.status === 'Reported' && issue.aiAnalysis?.analysisStatus === 'completed' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptPlan(issue.issueId, issue.aiAnalysis?.suggestedCommittee)}
                          >
                            Accept AI Plan
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
