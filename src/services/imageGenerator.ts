// src/services/imageGenerator.ts

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash-image-preview"; // The "Nano Banana" model

// Helper to fetch blob URL and convert to Base64
async function urlToBase64(url: string): Promise<string | null> {
  try {
    // Optimization: If it's already a data URL, just extract the base64
    if (url.startsWith('data:')) {
      return url.split(',')[1];
    }

    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result?.toString().split(',')[1] || null;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image:", error);
    return null;
  }
}

export async function generateMoodImageFromBoard(
  referenceImageUrls: string[]
): Promise<string | null> {
  if (!API_KEY) {
    console.error("Missing Gemini API Key");
    return null;
  }

  // Limit to 4 images to avoid payload limits/latency
  const selectedUrls = referenceImageUrls.slice(0, 4);

  // Convert all URLs to base64 inlineData objects
  const imageParts = await Promise.all(
    selectedUrls.map(async (url) => {
      const base64Data = await urlToBase64(url);
      if (!base64Data) return null;
      return {
        inlineData: {
          mimeType: "image/jpeg", // Assuming jpeg/png, API is flexible
          data: base64Data
        }
      };
    })
  );

  // Filter out any failed conversions
  const validImageParts = imageParts.filter(part => part !== null);

  if (validImageParts.length === 0) {
    console.warn("No valid images to generate from.");
    return null;
  }

  const promptText = `Generate a new moodboard image that perfectly blends the visual style, color palette, and atmospheric vibe of these reference images. Create something new that feels like it belongs in this collection.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              ...validImageParts // Spread the image parts into the request
            ]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            candidateCount: 1
          }
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText);
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.[0];

    if (imagePart?.inlineData?.data) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }

    return null;
  } catch (error) {
    console.error("Generation failed:", error);
    return null;
  }
}

export async function generateBoardDescription(
  referenceImageUrls: string[]
): Promise<string | null> {
  if (!API_KEY) {
    console.error("Missing Gemini API Key");
    return null;
  }

  // Limit to 6 images for context
  const selectedUrls = referenceImageUrls.slice(0, 6);

  const imageParts = await Promise.all(
    selectedUrls.map(async (url) => {
      const base64Data = await urlToBase64(url);
      if (!base64Data) return null;
      return {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Data
        }
      };
    })
  );

  const validImageParts = imageParts.filter(part => part !== null);

  if (validImageParts.length === 0) {
    return null;
  }

  const promptText = "Analyze the visual style, color palette, and overall vibe of these images. Write a concise, elegant 1-2 sentence description that captures the aesthetic theme. Focus on mood, texture, and artistic direction.";

  try {
    // Use gemini-1.5-flash-001 for better stability
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              ...validImageParts
            ]
          }],
          generationConfig: {
            candidateCount: 1,
            maxOutputTokens: 100
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      throw new Error(errorText);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("Description generation failed:", error);
    return null;
  }
}