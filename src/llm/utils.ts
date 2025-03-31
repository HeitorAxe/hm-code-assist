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
        // Split the text by spaces and filter out any empty entries.
        const words = text.split(" ").filter(word => word.length > 0);
        for (const word of words) {
            yield word;
            await delay(delayMs);
        }
    }
}