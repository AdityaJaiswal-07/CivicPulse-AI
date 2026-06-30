import React from 'react';
import { AIAnalysis } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Sparkles, AlertTriangle, ShieldCheck, ChevronRight, Info } from 'lucide-react';
import { Spinner } from '../ui/Loading';

interface AIAnalysisCardProps {
  analysis?: AIAnalysis;
  isLoading?: boolean;
}

export const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({ analysis, isLoading }) => {
  if (analysis?.analysisStatus === 'failed') {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="text-lg font-semibold text-red-900">AI Analysis Failed</h3>
          <p className="text-sm text-red-600">Unable to analyze this issue. Please try reporting again.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !analysis || analysis.analysisStatus === 'pending' || analysis.analysisStatus === 'processing') {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-primary" />
        </div>
        <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-4">
          <Spinner className="w-8 h-8" />
          <div>
            <h3 className="text-lg font-medium text-gray-900">Google Gemini is analyzing the issue...</h3>
            <p className="text-sm text-gray-500 mt-1">Extracting issue type, severity, and action plan.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'bg-green-500';
    if (conf >= 70) return 'bg-blue-500';
    if (conf >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'Critical':
        return <Badge variant="danger">Critical Severity</Badge>;
      case 'High':
        return <Badge variant="warning">High Severity</Badge>;
      case 'Medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-none">Medium Severity</Badge>;
      case 'Low':
      default:
        return <Badge variant="success">Low Severity</Badge>;
    }
  };

  const getPriorityBadge = (pri: string) => {
    switch (pri) {
      case 'Urgent':
        return <Badge variant="danger">Urgent Priority</Badge>;
      case 'High':
        return <Badge variant="warning">High Priority</Badge>;
      case 'Normal':
        return <Badge variant="info">Normal Priority</Badge>;
      case 'Low':
      default:
        return <Badge variant="default">Low Priority</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-50/50 via-white to-white border-indigo-100 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
      <CardHeader className="pb-4 border-b border-indigo-50/60">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="font-bold text-xs tracking-wider uppercase">AI Resolution Engine</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {getSeverityBadge(analysis.severity)}
            {getPriorityBadge(analysis.priority)}
          </div>
        </div>
        
        <CardTitle className="text-2xl mt-4 font-bold text-gray-900 leading-tight">
          {analysis.issueLabel}
        </CardTitle>

        {/* Confidence Progress Bar & Meta Info */}
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Category: <strong className="text-gray-700">{analysis.issueType}</strong>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" /> {analysis.confidence}% Confidence
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
            <div 
              className={`h-full rounded-full ${getConfidenceColor(analysis.confidence)} transition-all duration-1000 ease-out`} 
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
        </div>

        {/* Explainability Panel */}
        <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 space-y-2 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <span role="img" aria-label="brain" className="select-none">🧠</span> AI Reasoning
            </h4>
            <span className="text-[10px] bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded font-semibold uppercase tracking-wider">
              AI Explainability
            </span>
          </div>
          <div className="flex items-start gap-2 text-sm leading-relaxed text-slate-800 break-words">
            <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="italic">
              {analysis.reasoning ? `"${analysis.reasoning}"` : "No reasoning was provided by the AI."}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {analysis.temporaryActions.length > 0 && (
          <div className="bg-orange-50/70 rounded-xl p-4 border border-orange-100">
            <h4 className="font-bold text-orange-800 text-xs mb-2 flex items-center gap-1.5 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-orange-600 animate-bounce" /> Immediate Actions Required
            </h4>
            <ul className="space-y-2">
              {analysis.temporaryActions.map((action, i) => (
                <li key={i} className="text-sm text-orange-950 flex items-start gap-2 leading-relaxed">
                  <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Highlighted Info Grid: Committee, Cost, Resolution Time */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Suggested Committee */}
          <div className="bg-blue-50/40 border border-blue-100/60 p-4 rounded-xl flex items-start gap-3 shadow-sm hover:bg-blue-50/60 transition-colors">
            <span className="text-xl mt-0.5 select-none" role="img" aria-label="committee">🏢</span>
            <div>
              <h5 className="text-[10px] font-bold text-blue-900/60 uppercase tracking-wider">Suggested Committee</h5>
              <p className="font-bold text-sm text-blue-950 mt-1 leading-snug">
                {analysis.suggestedCommittee} Committee
              </p>
            </div>
          </div>

          {/* Estimated Cost */}
          <div className="bg-emerald-50/40 border border-emerald-100/60 p-4 rounded-xl flex items-start gap-3 shadow-sm hover:bg-emerald-50/60 transition-colors">
            <span className="text-xl mt-0.5 select-none" role="img" aria-label="cost">💰</span>
            <div>
              <h5 className="text-[10px] font-bold text-emerald-900/60 uppercase tracking-wider">Estimated Cost</h5>
              <p className="font-bold text-sm text-emerald-950 mt-1 leading-snug">
                {(analysis as any).estimatedCost || 'Not Available'}
              </p>
            </div>
          </div>

          {/* Resolution Time */}
          <div className="bg-indigo-50/40 border border-indigo-100/60 p-4 rounded-xl flex items-start gap-3 shadow-sm hover:bg-indigo-50/60 transition-colors">
            <span className="text-xl mt-0.5 select-none" role="img" aria-label="time">⏱️</span>
            <div>
              <h5 className="text-[10px] font-bold text-indigo-900/60 uppercase tracking-wider">Resolution Time</h5>
              <p className="font-bold text-sm text-indigo-950 mt-1 leading-snug">
                {(analysis as any).estimatedResolutionTime || 'Not Available'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Action Plan */}
        <div className="pt-2">
          <h4 className="font-bold text-gray-900 text-xs mb-4 uppercase tracking-wider">Recommended Action Plan</h4>
          <div className="space-y-5 relative pl-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-100">
            {analysis.actionPlan.map((step, i) => (
              <div key={i} className="relative flex flex-col gap-1.5">
                {/* Timeline dot */}
                <div className="absolute -left-6 top-0.5 flex items-center justify-center w-6 h-6 rounded-full border-2 border-indigo-100 bg-indigo-50 text-indigo-700 text-[10px] font-extrabold shadow-sm z-10">
                  {i + 1}
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-indigo-100 hover:shadow-soft transition-all duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-50">
                    <span className="font-bold text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span role="img" aria-label="responsibility" className="select-none">👤</span> {step.responsibility}
                    </span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span role="img" aria-label="timeline" className="select-none">📅</span> {step.timeline}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed break-words">
                    {step.step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Next Step */}
        <div className="bg-indigo-600 text-white p-5 rounded-xl flex items-center justify-between shadow-soft hover:bg-indigo-700 transition-colors">
          <div className="min-w-0 pr-4">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Next Step for RWA Head</h4>
            <p className="font-semibold text-sm mt-1 leading-snug break-words">
              {analysis.nextSteps}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-indigo-200 flex-shrink-0" />
        </div>

        {/* Footer Disclaimer */}
        <div className="text-[11px] text-gray-400 text-center select-none pt-4 border-t border-gray-100/50 mt-2">
          AI recommendations assist the RWA committee and should be reviewed before implementation.
        </div>
      </CardContent>
    </Card>
  );
};
