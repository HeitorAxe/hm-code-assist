import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import * as vscode from "vscode";
import { getOllama, transformToWords, simpleMessage, convertToLangchainMessages } from "./utils";


/**
 * Fetches a streamed LLM response and transforms it to yield one word at a time.
 * The delay between words is controlled by the `delayMs` parameter (default is 100ms).
 */
export async function fetchLlmResponse(
    request: {
        provider: string,
        model: string,
        messages: {
            role: string,
            content: string
        }[]
    },
    context: vscode.ExtensionContext,
    delayMs: number = 5
): Promise<AsyncIterable<string>>
{
    const { provider, model, messages } = request;

    if (provider === "google") {
        const apiKey = await context.secrets.get("googleApiKey");
        if (!apiKey) {
            vscode.window.showErrorMessage("Google API Key not found. Please set it in secrets.");
            return transformToWords(simpleMessage("Google API Key not found. Please set it in secrets."), delayMs);
        }
        const llm = new ChatGoogleGenerativeAI({
            model: model,
            temperature: 0,
            apiKey: apiKey,
            
        });
        const streamResponse = await llm.stream(convertToLangchainMessages(messages));
        return transformToWords(streamResponse, delayMs);
    }

    else if (provider === "ollama") {
        const ollama = await getOllama();
        const streamResponse = await ollama.chat({
            model: model,
            messages: messages,
            stream: true,
        });
        return transformToWords(streamResponse, delayMs);
    }

    else {
        return transformToWords(simpleMessage("This model is not available"), delayMs);
    }
}
