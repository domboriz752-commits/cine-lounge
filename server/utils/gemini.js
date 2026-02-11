import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set – AI enrichment will be unavailable");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const model = genAI ? genAI.getGenerativeModel({ model: MODEL }) : null;

export async function checkGemini() {
  if (!model) {
    console.warn("⚠️  Gemini skipped (no API key)");
    return;
  }
  try {
    const result = await model.generateContent('Respond with ONLY the word "OK" and nothing else.');
    const text = (await result.response).text().trim();
    if (text === "OK") {
      console.log(`✅ Gemini connection verified (${MODEL})`);
    } else {
      console.warn(`⚠️  Gemini responded unexpectedly: "${text}"`);
    }
  } catch (err) {
    console.error("❌ Gemini check failed:", err.message);
  }
}

export default model;
