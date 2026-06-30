import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { db } from '../config/firebase';
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const summarizeFeedback = onDocumentCreated({
  document: 'issues/{issueId}/comments/{commentId}',
  region: 'asia-south2',
  secrets: [GEMINI_API_KEY]
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const issueId = event.params.issueId;
  console.log("Summarize trigger fired", issueId);

  // Check if we need to summarize (e.g. every 5th comment)
  const issueRef = db.collection('issues').doc(issueId);
  const issueDoc = await issueRef.get();
  const issue = issueDoc.data();

  if (!issue) return;

  const commentsCountSnapshot = await issueRef
    .collection("comments")
    .count()
    .get();

  const commentCount = commentsCountSnapshot.data().count;
  console.log("Comment count:", commentCount);

  // Only summarize every 5 comments to save AI calls
  if (commentCount === 0 || commentCount % 5 !== 0) return;

  const commentsSnapshot = await db.collection('issues').doc(issueId).collection('comments').orderBy('createdAt', 'desc').limit(10).get();
  const commentsList = commentsSnapshot.docs.map(d => d.data().text).join('\n- ');

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
  const prompt = `Summarize the following community comments about a civic issue.
  Issue: ${issue.aiAnalysis?.issueLabel || 'Unknown'}
  Comments: 
  - ${commentsList}
  
  Respond with a single concise paragraph summarizing resident sentiment and key urgency signals.`;

  try {
    console.log("Calling Gemini...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });
    console.log("Gemini response received");
    console.log(response.text);

    if (response.text) {
      console.log("Updating Firestore...");
      await issueRef.update({ feedbackSummary: response.text });
      console.log("Feedback summary saved successfully.");
    }
  } catch (err) {
    console.error("Summarization failed:", err);
  }
});
