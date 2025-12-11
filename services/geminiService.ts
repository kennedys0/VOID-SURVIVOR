import { GoogleGenAI, Type } from "@google/genai";
import { VoidEvent } from "../types";

const API_KEY = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

/**
 * Generates a dynamic "Void Event" based on current game stats.
 */
export const generateVoidEvent = async (
  level: number,
  killCount: number,
  playerHpRatio: number
): Promise<VoidEvent> => {
  if (!ai) {
    // Fallback if no API key is present
    return {
      title: "The Void Shifts",
      message: "A tremor runs through the digital reality.",
      modifier: { enemySpeedMultiplier: 1.1 }
    };
  }

  const prompt = `
    You are the "Void Director" of a video game.
    Context:
    - Player Level: ${level}
    - Enemies Defeated: ${killCount}
    - Player Health Status: ${playerHpRatio < 0.3 ? "Critical" : playerHpRatio < 0.7 ? "Moderate" : "Healthy"}

    Generate a short, cryptic, or intense narrative event message (max 1 sentence) and a gameplay modifier.
    If the player is doing well, make it harder. If they are dying, maybe give a slight reprieve or a "final stand" challenge.

    JSON Schema:
    {
      "title": "Short Title (e.g. 'Sudden Swarm')",
      "message": "Flavor text.",
      "modifier": {
        "enemySpeedMultiplier": number (0.8 to 1.5),
        "enemySpawnRateMultiplier": number (0.5 to 2.0),
        "bossSpawn": boolean (true if level > 5 and lucky)
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            message: { type: Type.STRING },
            modifier: {
              type: Type.OBJECT,
              properties: {
                enemySpeedMultiplier: { type: Type.NUMBER },
                enemySpawnRateMultiplier: { type: Type.NUMBER },
                enemyHpMultiplier: { type: Type.NUMBER },
                bossSpawn: { type: Type.BOOLEAN },
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No text returned");
    
    return JSON.parse(text) as VoidEvent;

  } catch (error) {
    console.error("Gemini AI generation failed:", error);
    return {
      title: "Connection Lost",
      message: "The Void Director is silent. Defaulting protocols.",
      modifier: { enemySpeedMultiplier: 1.05 }
    };
  }
};