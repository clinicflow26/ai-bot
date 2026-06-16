interface Message {
  role: "user" | "assistant";
  content: string;
}

interface OllamaChatResponse {
  message?: {
    role?: string;
    content?: string;
  };
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

export async function generateChatResponse(
  messages: Message[],
  webSearch: boolean
): Promise<{ text: string; provider: string; webSearchAttempted: boolean }> {
  console.log(
    `[AI Server] Received message list. Count: ${messages.length}, WebSearch: ${webSearch}`
  );

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful, professional, and knowledgeable AI assistant. " +
              "Use Markdown where useful. Keep answers clear and practical. " +
              "If asked for code, provide complete working snippets when possible.",
          },
          ...messages.map((message) => ({
            role: message.role === "assistant" ? "assistant" : "user",
            content: message.content,
          })),
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama request failed with ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OllamaChatResponse;
    const replyText =
      data.message?.content?.trim() ||
      "I was unable to formulate a response. Please try again.";

    const webSearchNote = webSearch
      ? "_Note: Web search toggle is on, but local Ollama does not provide built-in web grounding in this setup._\n\n"
      : "";

    return {
      text: `${webSearchNote}${replyText}`,
      provider: `Ollama (${OLLAMA_MODEL})`,
      webSearchAttempted: false,
    };
  } catch (error: any) {
    console.error("[AI Server Error] Error calling Ollama API:", error);
    return {
      text:
        `⚠️ **Ollama Connection Error:** ${error?.message || "An unexpected error occurred while communicating with the local AI service."}\n\n` +
        `Make sure Ollama is running at \`${OLLAMA_BASE_URL}\` and that the model \`${OLLAMA_MODEL}\` is available locally.`,
      provider: "Ollama (Errored)",
      webSearchAttempted: false,
    };
  }
}
