import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function refineMarkdownBlock(fullContext: string, selectedBlock: string, instruction: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are an expert academic editor. Refine the following Markdown block based on the instruction.
    Maintain the structural integrity of the surrounding document.
    
    Full Document Context (for reference):
    ${fullContext.slice(0, 10000)}...
    
    Selected Block to Refine:
    ${selectedBlock}
    
    Instruction:
    ${instruction}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          refinedBlock: {
            type: Type.STRING,
            description: "The refined version of the selected Markdown block."
          }
        },
        required: ["refinedBlock"]
      }
    }
  });
  
  try {
    const result = JSON.parse(response.text || '{"refinedBlock": ""}');
    return result.refinedBlock as string;
  } catch (e) {
    console.error("Failed to parse refinement response", e);
    return selectedBlock; // Fallback to original
  }
}

export async function generateDocumentUpdate(fullContext: string, instruction: string, imageContext?: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `You are an expert academic editor. You need to update a Markdown document based on the user's instruction.
    Instead of rewriting the whole document, identify the specific blocks that need to be changed.
    Provide the exact text to search for and the new text to replace it with.
    
    The search string MUST be a unique, contiguous block of text from the document.
    Include enough context in the search string to ensure it is unique.
    
    Current Document:
    ${fullContext}
    
    ${imageContext ? `Image Context (Descriptions of relevant images provided by user):\n${imageContext}` : ''}
    
    Instruction:
    ${instruction}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          edits: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                search: {
                  type: Type.STRING,
                  description: "The exact unique substring in the document to be replaced."
                },
                replace: {
                  type: Type.STRING,
                  description: "The new text to replace the search string with."
                }
              },
              required: ["search", "replace"]
            }
          },
          summary: {
            type: Type.STRING,
            description: "A brief summary of the changes made."
          }
        },
        required: ["edits", "summary"]
      }
    }
  });
  
  try {
    const result = JSON.parse(response.text || '{"edits": [], "summary": ""}');
    return result as { edits: { search: string, replace: string }[], summary: string };
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return { edits: [], summary: "Failed to generate edits." };
  }
}

export async function chatWithDocument(fullContext: string, chatHistory: { role: string, text: string }[], userMessage: string, imageContext?: string) {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `You are an expert academic research assistant. You have access to the user's full Markdown document.
      You can reference specific lines or sections. The user might ask to analyze logic, check contradictions, or extract data.
      
      Document Context:
      ${fullContext}
      
      ${imageContext ? `Image Context (Descriptions of relevant images provided by user):\n${imageContext}` : ''}
      
      When referencing parts of the document, be specific about the content.
      Keep your responses concise and helpful.`,
    },
    history: chatHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))
  });

  const response = await chat.sendMessage({ message: userMessage });
  return response.text;
}

export async function analyzeImage(base64Data: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: base64Data.split(',')[1],
              mimeType: mimeType
            }
          },
          {
            text: "Analyze this image and provide a concise, professional description for an academic research document. Focus on what the image represents (e.g., 'A graph showing...', 'A diagram of...'). Return ONLY the description text."
          }
        ]
      }
    ]
  });
  return response.text;
}
