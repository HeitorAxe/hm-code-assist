import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
async function getOllama() {
    const ollama = await import("ollama");
    return ollama.default;
}
import { ReadableStream } from "stream/web";

const object = {
    provider: "",
    model: "",
    userPrompt: "?",
    messages: []
}

export async function fetchLlmResponse(request:{
    provider: string,
    model: string,
    userPrompt: string,
    apiKey?: string,
    messages?: [{
        role: string,
        content: string
    }]
}): 
Promise<AsyncIterable<any>>{
    let response = ""
    const {provider, model, apiKey, userPrompt, messages} = request

     
    if(false){
        const llm = new ChatGoogleGenerativeAI({
            model: model,
            temperature: 0,
            apiKey: apiKey,
        });
        const streamResponse = await llm.stream(userPrompt);
        return streamResponse
    }
    else{
        const ollama = await getOllama();
        const streamResponse = await ollama.chat({
            model: "deepseek-r1:1.5b",
            messages: [{ role: "user", content: userPrompt }],
            stream: true,
        }); 
        async function* transformStream() {
            for await (const chunk of streamResponse) {
                yield chunk.message // Extract the string from the object
            }
        }
        return transformStream()
    }

}


