import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️  GEMINI_API_KEY not set – AI enrichment will be unavailable");
}

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const model = genAI
  ? genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
  : null;

export default model;
