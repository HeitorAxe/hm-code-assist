import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { fetchLlmResponse } from "../utils/llmAdapter";

export function registerLaunchPanel(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand("hm-code-assist.launchPanel", async () => {
        const panel = vscode.window.createWebviewPanel(
            "deepChat",
            "AI Chat",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebViewContent(context, panel);

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === "chat") {
                const userPrompt = message.text;
                let responseText = "";
                let requestComplete = false; // Flag to track completion

                try {
                    const apiKey = await context.secrets.get("googleApiKey");
                    if (!apiKey) {
                         vscode.window.showErrorMessage("Google API Key not found. Please set it in secrets.");
                         panel.webview.postMessage({ command: "chatComplete" });
                         return;
                    }
                    
                    const streamResponse = await fetchLlmResponse({
                        provider: "google",
                        model: "gemini-2.0-flash",
                        apiKey: apiKey,
                        userPrompt: userPrompt
                    });

                    for await (const part of streamResponse) {
                        // Ensure content is treated as a string
                        const contentPart = part.content?.toString() ?? "";
                        // Split the content but keep the whitespace tokens (spaces, newlines, etc.)
                        // Filter out empty strings that might result from splitting
                        const tokens = contentPart.split(/(\s+)/).filter(Boolean);
                        for (const token of tokens) {
                            responseText += token+" ";
                            panel.webview.postMessage({ command: "chatResponse", text: responseText });
                            // Delay for smoother streaming effect (optional)
                            await new Promise(resolve => setTimeout(resolve, 5));
                        }
                    }
                    requestComplete = true; // Mark as complete after successful streaming

                } catch (err: any) { // Catch specific error type if possible
                    requestComplete = true; // Mark as complete even on error
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    vscode.window.showErrorMessage("Something went wrong: \n" + errorMessage);
                } finally {
                    // Ensure the completion message is sent regardless of success or failure
                    if (requestComplete) {
                         panel.webview.postMessage({ command: "chatComplete" });
                    }
                     // If the request never even started properly (e.g., API key issue handled above),
                     // the 'finally' block still runs, but we might have already sent chatComplete.
                     // The requestComplete flag helps prevent sending it twice in some edge cases,
                     // although the frontend should handle receiving it multiple times gracefully.
                }
            }
        });
    });
}

function getWebViewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    // Determine the path to your media folder
    const mediaPath = vscode.Uri.joinPath(context.extensionUri, "src/view");

    // Generate URIs for the CSS and JS files
    const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "style.css"));
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "script.js"));

    // Read the HTML file
    const htmlPath = vscode.Uri.joinPath(mediaPath, "index.html");
    let html = fs.readFileSync(htmlPath.fsPath, "utf8");

    // Replace the placeholders in the HTML with the actual URIs
    html = html.replace(/\${styleUri}/g, styleUri.toString());
    html = html.replace(/\${scriptUri}/g, scriptUri.toString());
    html = html.replace(/\${webview.cspSource}/g, panel.webview.cspSource);

    return html;
}