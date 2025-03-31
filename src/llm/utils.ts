import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

export async function getOllama() {
    const ollama = await import("ollama");
    return ollama.default;
}

export async function listOllamaModels(): Promise<{ provider: string, name: string }[]> {
    const ollama = await getOllama();
    const ollamaModels = await ollama.list();

    const result = [];
    for (const model of ollamaModels.models) {
        result.push({ provider: "ollama", name: model.name });
    }
    return result;
}


export function convertToLangchainMessages(inputMessages: Array<{ role: string; content: string }>) {
    return inputMessages.map(msg => {
      switch (msg.role.toLowerCase()) {
        case 'system':
          return new SystemMessage(msg.content);
        case 'user':
          return new HumanMessage(msg.content);
        case 'assistant':
          return new AIMessage(msg.content);
        default:
          throw new Error(`Unknown role: ${msg.role}`);
      }
    });
  }

export async function* simpleMessage(message: string): AsyncIterable<string> {
    yield message;
}

// A delay function to pause execution for a given number of milliseconds.
export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Transforms any async iterable response into a stream that yields one word at a time.
 * The function handles responses that are strings or objects with `message` or `content` properties.
 */
export async function* transformToWords(
    stream: AsyncIterable<any>,
    delayMs: number
): AsyncIterable<string> {
    for await (const chunk of stream) {
        let text = "";
        if (typeof chunk === "string") {
            text = chunk;
        } else if (chunk.message) {
            text = chunk.message.content;
        } else if (chunk.content) {
            text = chunk.content;
        } else {
            text = String(chunk);
        }

        // Use a regular expression to match words and spaces
        const wordsAndSpaces = text.match(/\S+|\s+/g) || [];
        
        for (const part of wordsAndSpaces) {
            yield part;
            await delay(delayMs);
        }
    }
}