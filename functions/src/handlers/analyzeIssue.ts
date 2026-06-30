import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { db } from '../config/firebase';
import { GoogleGenAI } from '@google/genai';
import { aiAnalysisSchema } from '../schema/aiSchema';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeAndCleanJson(text: string): string {
  // 1. Remove leading/trailing whitespace & BOM characters
  text = text.trim().replace(/^\uFEFF/, "");

  // 2. Extract JSON block if surrounded by markdown code fences or text
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // 3. Escape literal newlines/carriagereturns inside string values
  let clean = "";
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : "";
    if (char === '"' && prev !== '\\') {
      inString = !inString;
    }
    if (inString && (char === '\n' || char === '\r')) {
      if (char === '\n') {
        clean += '\\n';
      }
    } else {
      clean += char;
    }
  }
  text = clean;

  // 4. Remove trailing commas before } or ]
  text = text.replace(/,\s*([}\]])/g, '$1');

  // 5. Repair duplicated quotes at string ending
  // e.g. "Water Leak"" -> "Water Leak"
  text = text.replace(/([^:\s])""\s*([,}])/g, '$1"$2');

  // 6. Balance unclosed braces or brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inStr = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = i > 0 ? text[i - 1] : "";
    if (char === '"' && prev !== '\\') {
      inStr = !inStr;
    }
    if (!inStr) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }

  if (inStr) {
    text += '"';
  }
  while (openBrackets > 0) {
    text += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    text += '}';
    openBraces--;
  }

  return text;
}

function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  const fieldsToCheck: string[] = [];
  if (error instanceof Error) {
    if (error.message) fieldsToCheck.push(error.message);
    if (error.stack) fieldsToCheck.push(error.stack);
    if (error.name) fieldsToCheck.push(error.name);
  }
  
  const errObj = error as any;
  if (errObj.code) fieldsToCheck.push(String(errObj.code));
  if (errObj.status) fieldsToCheck.push(String(errObj.status));
  if (errObj.message) fieldsToCheck.push(String(errObj.message));
  
  fieldsToCheck.push(String(error));
  
  const searchStr = fieldsToCheck.join(' ').toLowerCase();
  
  return (
    searchStr.includes('503') ||
    searchStr.includes('unavailable') ||
    searchStr.includes('headerstimeout') ||
    searchStr.includes('headers_timeout') ||
    searchStr.includes('und_err_headers_timeout') ||
    searchStr.includes('timeout') ||
    searchStr.includes('fetch failed')
  );
}

const MODELS = [
  "gemini-3.5-flash",
  "gemini-2.5-flash"
];

const MODEL_CONFIGS: { [key: string]: { maxAttempts: number; backoffDelays: number[] } } = {
  "gemini-3.5-flash": {
    maxAttempts: 2,
    backoffDelays: [2000]
  },
  "gemini-2.5-flash": {
    maxAttempts: 1,
    backoffDelays: []
  }
};

async function callGeminiWithRetry(
  ai: GoogleGenAI,
  modelName: string,
  maxAttempts: number,
  backoffDelays: number[],
  imageMime: string,
  imageBase64: string,
  prompt: string
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Attempt ${attempt}/${maxAttempts}`);
    console.log("Calling Gemini...");

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: imageMime, data: imageBase64 } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      console.log("Gemini response:", response);
      console.log("Gemini text:", response.text);

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      console.log(`Gemini succeeded on attempt ${attempt}`);
      return text;
    } catch (error: unknown) {
      if (attempt < maxAttempts && isRetryableError(error)) {
        console.log("Gemini temporary failure. Retrying...");
        await delay(backoffDelays[attempt - 1]);
      } else {
        throw error;
      }
    }
  }
  throw new Error("Unexpected end of retry loop");
}

export const analyzeIssue = onCall({ secrets: [GEMINI_API_KEY], timeoutSeconds: 30, region: 'asia-south2' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { imageBase64, issueId, description, mimeType, address, landmark } = request.data;
  if (!imageBase64 || !issueId) {
    throw new HttpsError('invalid-argument', 'Missing imageBase64 or issueId');
  }

  const imageMime = mimeType || 'image/jpeg';

  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    const prompt = `You are a civic infrastructure specialist AI assistant for residential apartment societies in India. 
    Analyze this image from a residential apartment society. 
    Resident description (if any): ${description || 'None'}.
    Issue Address:
    ${address || 'Not Provided'}
    Landmark:
    ${landmark || 'Not Provided'}
    
    Use the location information while suggesting the responsible committee, urgency, action plan and administrative recommendations.
    
    Identify the civic issue and respond ONLY with valid JSON.
    Provide an actionable resolution plan for the RWA committee.
    
    Required JSON schema structure (no markdown, just JSON):
    {
      "issueType": "Plumbing|Electrical|Security|Sanitation|Structural|Common Area|Other",
      "issueLabel": "<specific descriptive label>",
      "severity": "Critical|High|Medium|Low",
      "priority": "Urgent|High|Normal|Low",
      "confidence": <0-100 integer>,
      "suggestedCommittee": "Maintenance|Security|Sanitation|Works|General Administration",
      "temporaryActions": ["<action 1>", "<action 2>"],
      "actionPlan": [{"step": "<step>", "timeline": "<time>", "responsibility": "<who>"}],
      "estimatedCost": "<cost range or N/A>",
      "estimatedResolutionTime": "<time>",
      "reasoning": "<why this severity and plan>",
      "nextSteps": "<single most important action for RWA head>"
    }`;

    let text = "";
    let successfulModel = "";

    for (let i = 0; i < MODELS.length; i++) {
      const model = MODELS[i];
      const config = MODEL_CONFIGS[model];
      console.log(`Using model: ${model}`);

      try {
        text = await callGeminiWithRetry(
          ai,
          model,
          config.maxAttempts,
          config.backoffDelays,
          imageMime,
          imageBase64,
          prompt
        );
        successfulModel = model;
        break;
      } catch (error: unknown) {
        if (!isRetryableError(error)) {
          throw error;
        }
        if (i < MODELS.length - 1) {
          console.log(`Switching to fallback model: ${MODELS[i + 1]}`);
        } else {
          throw error;
        }
      }
    }

    console.log(`Analysis completed using ${successfulModel}`);

    let parsedJson;
    try {
      const sanitized = sanitizeAndCleanJson(text);
      parsedJson = JSON.parse(sanitized);
    } catch (e) {
      console.error('Failed to parse sanitized JSON:', e);
      throw new HttpsError('internal', 'AI returned invalid structured data.');
    }

    // Validate with Zod
    const validatedData = aiAnalysisSchema.parse(parsedJson);

    // Write to Firestore inside the function to ensure integrity
    await db.collection('issues').doc(issueId).update({
      aiAnalysis: { ...validatedData, analysisStatus: 'completed' },
      status: 'Reported'
    });

    return { success: true, analysis: { ...validatedData, analysisStatus: 'completed' as const } };
  } catch (error: unknown) {
    console.error('AI Analysis Error:', error);
    await db.collection('issues').doc(issueId).set({
      aiAnalysis: { analysisStatus: 'failed' },
    }, { merge: true });

    let message = error instanceof Error ? error.message : 'AI analysis failed';
    if (isRetryableError(error)) {
      message = 'AI service is temporarily experiencing high demand. Please try again in a few moments.';
    }
    throw new HttpsError('internal', message);
  }
});
