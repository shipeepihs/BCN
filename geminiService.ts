
import { GoogleGenAI } from "@google/genai";

// Use gemini-3-pro-preview for complex engineering and STEM tasks as recommended in the guidelines
const MODEL_NAME = 'gemini-3-pro-preview';

export async function askEngineeringAssistant(prompt: string): Promise<string> {
  if (!process.env.API_KEY) {
    return "API Key is missing. Please ensure your environment is configured.";
  }

  try {
    // Create a new GoogleGenAI instance right before making an API call
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are a professional engineering assistant. Provide accurate, concise technical information about mechanical, electrical, and civil engineering. Use standard SI and Imperial units where appropriate. Keep answers professional and minimalist.",
        temperature: 0.2,
      },
    });

    // Access the .text property directly on the response object
    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while contacting the engineering assistant. Please try again later.";
  }
}
