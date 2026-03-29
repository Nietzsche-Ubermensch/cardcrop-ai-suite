import { ImageSize, ProcessingSettings, AnalysisResult, RestorationLevel } from "../types";

// Get API key from localStorage or env
const getApiKey = (): string => {
  const key = localStorage.getItem('OPENAI_API_KEY') || (typeof process !== 'undefined' && process.env?.OPENAI_API_KEY);
  if (!key) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in .env.local or enter it in the UI.');
  }
  return key;
};

// Direct API call helper
const callOpenAI = async (endpoint: string, body: any): Promise<any> => {
  const apiKey = getApiKey();
  
  const response = await fetch(`https://api.openai.com/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  return response.json();
};

const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Client-side cropping using Canvas based on AI bounding box
export const cropImage = async (file: File, box: number[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      
      if (!box || box.length < 4) {
        resolve(img.src); 
        return;
      }

      let [ymin, xmin, ymax, xmax] = box;

      // Normalize if values are > 1
      if (ymin > 1 || xmin > 1 || ymax > 1 || xmax > 1) {
        ymin /= 100;
        xmin /= 100;
        ymax /= 100;
        xmax /= 100;
      }

      ymin = Math.max(0, Math.min(1, ymin));
      xmin = Math.max(0, Math.min(1, xmin));
      ymax = Math.max(0, Math.min(1, ymax));
      xmax = Math.max(0, Math.min(1, xmax));

      const x = xmin * img.width;
      const y = ymin * img.height;
      const width = (xmax - xmin) * img.width;
      const height = (ymax - ymin) * img.height;

      if (width <= 0 || height <= 0) {
        resolve(img.src);
        return;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      
      ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.95));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Chat with Lumina using GPT-5.4-nano via Chat Completions API
export const generateBotResponse = async (
  history: { role: string; parts: { text: string }[] }[],
  newMessage: string
): Promise<string> => {
  try {
    // Convert history to OpenAI format
    const messages = history.map(h => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.parts[0]?.text || ''
    }));
    
    messages.push({ role: 'user', content: newMessage });

    const data = await callOpenAI('/chat/completions', {
      model: 'gpt-4.1-nano',  // Using gpt-4.1-nano as gpt-5.4-nano may not be available yet
      messages: [
        {
          role: 'system',
          content: "You are Lumina, an expert AI assistant specializing in sports card grading and restoration. You provide professional advice on PSA/BGS grading standards, card condition assessment, surface damage evaluation, and restoration techniques. You are knowledgeable, concise, and helpful."
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    return data.choices[0]?.message?.content || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw error;
  }
};

// Generate card images using DALL-E 3 (gpt-image-1 not available via API yet)
export const generateCardImage = async (prompt: string, size: ImageSize): Promise<string> => {
  try {
    // Map size to DALL-E format
    const sizeMap: Record<ImageSize, string> = {
      [ImageSize.Size1K]: '1024x1024',
      [ImageSize.Size2K]: '1024x1024',
      [ImageSize.Size4K]: '1792x1024'
    };

    const data = await callOpenAI('/images/generations', {
      model: 'dall-e-3',
      prompt: `Professional sports trading card: ${prompt}. High quality, photorealistic, studio lighting, centered composition, clean design.`,
      size: sizeMap[size],
      quality: size === ImageSize.Size4K ? 'hd' : 'standard',
      n: 1,
      response_format: 'b64_json'
    });

    if (data.data && data.data[0]?.b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }
    
    throw new Error("No image data received from the model.");
  } catch (error: any) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

// Analyze card damage using GPT-4.1-mini with vision
export const analyzeCardDamage = async (file: File): Promise<AnalysisResult> => {
  try {
    const base64 = await fileToBase64(file);
    
    const data = await callOpenAI('/chat/completions', {
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a sports card grading expert. Analyze card images and return JSON with damage assessment.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this sports card image. Return ONLY JSON in this exact format:
{
  "damageScore": number (0-100, 0=perfect, 100=heavily damaged),
  "issues": ["list", "of", "condition", "issues"],
  "recommendedFixes": ["list", "of", "recommended", "fixes"],
  "boundingBox": [ymin, xmin, ymax, xmax] (normalized 0-1)
}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${file.type};base64,${base64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    });

    const content = data.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }

    return { 
      damageScore: 0, 
      issues: ["Analysis failed"], 
      recommendedFixes: [], 
      boundingBox: [0, 0, 1, 1] 
    };
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return { 
      damageScore: 0, 
      issues: ["Analysis failed: " + error.message], 
      recommendedFixes: [], 
      boundingBox: [0, 0, 1, 1] 
    };
  }
};

// Restore card using GPT-4.1-mini with vision (generates improved version)
export const restoreCard = async (
  file: File, 
  settings: ProcessingSettings, 
  analysis?: AnalysisResult
): Promise<string> => {
  try {
    // First crop if needed
    let base64Image: string;
    
    if (settings.autoCrop && analysis?.boundingBox) {
      const croppedDataUrl = await cropImage(file, analysis.boundingBox);
      base64Image = croppedDataUrl.split(',')[1];
    } else {
      base64Image = await fileToBase64(file);
    }

    // Build restoration prompt
    let strengthPrompt = "";
    switch (settings.restorationLevel) {
      case RestorationLevel.Light:
        strengthPrompt = "Light restoration: remove dust, minor scratches. Preserve original texture.";
        break;
      case RestorationLevel.Balanced:
        strengthPrompt = "Balanced restoration: remove scratches, dust, enhance colors slightly, sharpen text.";
        break;
      case RestorationLevel.Aggressive:
        strengthPrompt = "Heavy restoration: remove all damage, reconstruct corners, strong denoise and sharpening.";
        break;
    }

    // For restoration, we'll use DALL-E 3 to generate a cleaned version
    // based on description of the original
    const data = await callOpenAI('/chat/completions', {
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Describe this sports card in detail so it can be recreated as a pristine, high-quality digital version. Include: player name, team, year, card design elements, colors, text. ${strengthPrompt}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const description = data.choices[0]?.message?.content || 'Professional sports trading card';
    
    // Generate restored image using DALL-E
    const imageData = await callOpenAI('/images/generations', {
      model: 'dall-e-3',
      prompt: `Create a pristine, professionally restored version of this sports card: ${description}. Clean, high-quality, no damage, perfect centering, studio lighting, scan quality.`,
      size: '1024x1024',
      quality: 'hd',
      n: 1,
      response_format: 'b64_json'
    });

    if (imageData.data && imageData.data[0]?.b64_json) {
      return `data:image/png;base64,${imageData.data[0].b64_json}`;
    }
    
    throw new Error("Restoration failed: No image generated.");
  } catch (error: any) {
    console.error("Restoration Error:", error);
    throw error;
  }
};