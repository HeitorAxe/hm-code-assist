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

export function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

        const wordsAndSpaces = text.match(/\S+|\s+/g) || [];
        
        for (const part of wordsAndSpaces) {
            for(const letter of part){
                yield letter;
                await delay(delayMs);
            }
        }
    }
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("Operation timed out"));
        }, ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (err) => {
                clearTimeout(timer);
                reject(err);
            }
        );
    });
}