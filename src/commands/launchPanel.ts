import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchLlmResponse } from "../llm/llmAdapter";
import { listOllamaModels } from "../llm/utils";

export function registerLaunchPanel(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand("hm-code-assist.launchPanel", async () => {
        const panel = vscode.window.createWebviewPanel(
            "AIChat",
            "AI Chat",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebViewContent(context, panel);
        const llmModels = await listOllamaModels();
        llmModels.push({
            provider: "google",
            name:"gemini-2.5-pro-exp-03-25"
        })
        llmModels.push({
            provider: "google",
            name:"gemini-2.0-flash"
        })
        llmModels.push({
            provider: "pooping",
            name:"gemini-ash"
        })
        panel.webview.postMessage({ 
            command: "loadData", 
            data: {
                models: llmModels
            }
        });

        const messages = [
            { role: 'system', content: 'You are a thinking model, before giving the final response, think about the subject using the thinking tags: <think>I think I will do that!</think>\n I will do that!' },
        ]
        //TODO treat possible errors, decide where to put api key retrieval
        //find a way to add models via config
        //throw error in case there is no ollama, treat this case
        //add timeout
        //add messagin tracker

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === "chat") {
                const userPrompt = message.text;
                messages.push({
                    role: 'user',
                    content: userPrompt
                });
                const model = message.model;
                let responseText = "";
                let requestComplete = false; // Flag to track completion
                try {
                    
                    const streamResponse = await fetchLlmResponse({
                        provider: model.provider,
                        model: model.name,
                        messages: messages
                    }, context);

                    for await (const part of streamResponse) {
                        responseText += part;
                        panel.webview.postMessage({ command: "chatResponse", text: responseText });
                    }
                    requestComplete = true;
                    messages.push({
                        role: 'assistant',
                        content: responseText
                    })

                } 
                catch (err: any) {
                    requestComplete = true;
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    vscode.window.showErrorMessage("Something went wrong: \n" + errorMessage);
                } 
                finally {
                    if (requestComplete) {
                         panel.webview.postMessage({ command: "chatComplete" });
                    }
                }
            }
        });
    });
}

function getWebViewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    const mediaPath = vscode.Uri.joinPath(context.extensionUri, "src/view");

    const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "style.css"));
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "script.js"));

    const htmlPath = vscode.Uri.joinPath(mediaPath, "index.html");
    let html = fs.readFileSync(htmlPath.fsPath, "utf8");

    html = html.replace(/\${styleUri}/g, styleUri.toString());
    html = html.replace(/\${scriptUri}/g, scriptUri.toString());
    html = html.replace(/\${webview.cspSource}/g, panel.webview.cspSource);

    return html;
}