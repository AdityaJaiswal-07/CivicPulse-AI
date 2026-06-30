import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { issueService } from '../services/issueService';
import { aiService } from '../services/aiService';
import { storageService } from '../services/storageService';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Camera, Image as ImageIcon, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AIAnalysisCard } from '../components/ai/AIAnalysisCard';
import { AIAnalysis } from '../types';

const LOADING_STEPS = [
  "🧠 Detecting issue from image...",
  "🔍 Identifying category...",
  "⚡ Estimating severity...",
  "🏢 Finding responsible committee...",
  "📋 Preparing action plan...",
  "✅ Finalizing AI response..."
];

export const ReportIssue: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<AIAnalysis | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [createdIssueId, setCreatedIssueId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [validationErr, setValidationErr] = useState<string | null>(null);

  useEffect(() => {
    if (!showSuccessCard || !pendingAnalysis) return;

    const timer = setTimeout(() => {
      setAnalysisResult(pendingAnalysis);
      setPendingAnalysis(null);
      setShowSuccessCard(false);
      setIsProcessing(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [showSuccessCard, pendingAnalysis]);

  useEffect(() => {
    if (!isProcessing) {
      setLoadingStepIndex(0);
      setOpacity(1);
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout>;

    const intervalId = setInterval(() => {
      setOpacity(0);
      timeoutId = setTimeout(() => {
        setLoadingStepIndex((prev) => (prev + 1) % LOADING_STEPS.length);
        setOpacity(1);
      }, 200);
    }, 1000);

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isProcessing]);

  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[ReportIssue] Image Upload fired');
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStep(2);
    }
  };

  const handleProcessAI = async () => {
    if (!imageFile || !user) return;

    if (!address.trim()) {
      setValidationErr('Address is required');
      return;
    }

    setIsProcessing(true);
    setAnalysisError(null);
    setStep(3);

    try {
      const newIssueId = await issueService.createIssue({
        societyId: user.societyId,
        reportedBy: user.userId,
        imageUrl: '',
        locationLabel: landmark || 'Manual location',
        description: description,
        address: address,
        landmark: landmark,
      } as any);
      setCreatedIssueId(newIssueId);

      const imageUrl = await storageService.uploadImage(imageFile, user.societyId, newIssueId);
      await issueService.updateIssueImage(newIssueId, imageUrl);

      console.log('[ReportIssue] 4 Converting to base64...');
      const base64 = await storageService.fileToBase64(imageFile);
      console.log('[ReportIssue] Calling AI...');
      const analysis = await aiService.analyzeIssue(newIssueId, base64, description, imageFile.type, address, landmark);
      console.log('[ReportIssue] 6 AI returned:', analysis);

      setPendingAnalysis(analysis);
      setShowSuccessCard(true);
    } catch (error) {
      console.error('[ReportIssue] Error processing AI:', error);
      setAnalysisError('AI analysis failed. Please check your connection and try again.');
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (!createdIssueId) return;
    navigate(`/issue/${createdIssueId}`);
  };

  const handleRetry = () => {
    setStep(2);
    setAnalysisError(null);
    setAnalysisResult(null);
    setPendingAnalysis(null);
    setShowSuccessCard(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
        <p className="text-sm text-gray-500">Help keep your community safe and clean.</p>
      </div>

      {step === 1 && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="rounded-full bg-blue-50 p-4 mb-4">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Take a photo of the issue</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm">
              Our AI will analyze the image to determine the severity and suggest a resolution plan.
            </p>

            <div className="flex gap-4 w-full max-w-xs">
              <input id="issue-image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              <label htmlFor="issue-image-upload" className="flex-1 cursor-pointer">
                <div className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-medium transition-colors">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Upload Photo
                </div>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && previewUrl && (
        <div className="space-y-6">
          <div className="relative rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
            <img src={previewUrl} alt="Preview" className="w-full h-auto max-h-[60vh] object-contain" />
            <button
              onClick={() => { setStep(1); setImageFile(null); setPreviewUrl(null); }}
              className="absolute top-4 right-4 bg-white/90 text-gray-900 text-sm font-medium px-3 py-1.5 rounded-full shadow-sm hover:bg-white"
            >
              Retake
            </button>
          </div>

          <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                value={address}
                onChange={e => {
                  setAddress(e.target.value);
                  if (e.target.value.trim()) setValidationErr(null);
                }}
                placeholder="Enter the complete location of the issue"
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 transition-shadow resize-none ${
                  validationErr 
                    ? 'border-red-500 focus:ring-red-200 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {validationErr && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 animate-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-3.5 h-3.5" /> {validationErr}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Landmark (Optional)</label>
              <input
                type="text"
                value={landmark}
                onChange={e => setLandmark(e.target.value)}
                placeholder="Nearby landmark (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-shadow"
              />
            </div>
          </div>

          <Button onClick={handleProcessAI} className="w-full h-12 text-lg">
            Analyze Issue with AI <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isProcessing ? (
            showSuccessCard ? (
              <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 border-green-100 py-12 text-center animate-in fade-in duration-300">
                <style>{`
                  @keyframes progress-fill {
                    from { width: 0%; }
                    to { width: 100%; }
                  }
                  .animate-progress-fill {
                    animation: progress-fill 800ms linear forwards;
                  }
                `}</style>
                <CardContent className="flex flex-col items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto mb-4 shadow-sm select-none">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">AI Analysis Complete</h3>
                  <p className="text-sm text-gray-500 mt-2">Generating your civic resolution plan...</p>
                  <div className="w-full max-w-xs mx-auto bg-green-100 rounded-full h-1 mt-6 overflow-hidden shadow-inner">
                    <div className="h-full bg-green-600 rounded-full animate-progress-fill" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100 py-12">
                <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <h3 
                    className="text-xl font-semibold text-gray-900 transition-opacity duration-200"
                    style={{ opacity }}
                  >
                    {LOADING_STEPS[loadingStepIndex]}
                  </h3>
                  <p className="text-sm text-gray-500">Please wait while Gemini processes the image.</p>
                </CardContent>
              </Card>
            )
          ) : analysisError ? (
            /* Error State — previously this was an infinite spinner */
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Analysis Failed</h3>
                  <p className="text-sm text-red-600 mt-1">{analysisError}</p>
                </div>
                <Button variant="outline" onClick={handleRetry}>Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <AIAnalysisCard analysis={analysisResult || undefined} isLoading={false} />
          )}

          {!isProcessing && !analysisError && analysisResult && (
            <Button onClick={handleSubmit} className="w-full h-14 text-lg">
              Submit to Society
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
