import * as vscode from "vscode";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";



export function registerLaunchPanel(context: vscode.ExtensionContext): vscode.Disposable{
    return vscode.commands.registerCommand("hm-code-assist.launchPanel", async () => {
        const panel = vscode.window.createWebviewPanel(
            "deepChat",
            "AI Chat",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebViewContent();

        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === "chat") {
                const userPrompt = message.text;
                let responseText = "";

                try {
                    /* 
                    const ollama = await getOllama();
                    const streamResponse = await ollama.chat({
                        model: "deepseek-r1:1.5b",
                        messages: [{ role: "user", content: userPrompt }],
                        stream: true,
                    }); 
                    */
                    const apiKey = await context.secrets.get("googleApiKey")
                    
                    const model = new ChatGoogleGenerativeAI({
                        model: "gemini-2.0-flash",
                        temperature: 0,
                        apiKey: apiKey,
                    });
                  
                    const streamResponse = await model.stream(userPrompt);
                    

                    for await (const part of streamResponse) {
                        responseText += part.content;
                        panel.webview.postMessage({ command: "chatResponse", text: responseText });
                    }
                } catch (err) {
                    vscode.window.showErrorMessage("Something went wrong: \n"+err)
                    panel.webview.postMessage({ command: "chatResponse", text: responseText });
                }
            }
        });
    });
}

function getWebViewContent(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"/>
    <title>Chat with VS Code</title>
    <style>
        body { font-family: sans-serif; margin: 1rem; }
        #prompt { width: 100%; box-sizing: border-box; }
        #response { border: 1px solid #ccc; margin-top: 1rem; padding: 0.5rem; min-height: 100px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h2>Chat</h2>
    <textarea id="prompt" rows="3" placeholder="Ask Something"></textarea><br/>
    <button id="askBtn">Ask</button>
    <div id="response"></div>

    <script>
        const vscode = acquireVsCodeApi();

        document.getElementById('askBtn').addEventListener('click', () => {
            const text = document.getElementById('prompt').value;
            vscode.postMessage({ command: 'chat', text });
        });

        window.addEventListener('message', event => {
            const { command, text } = event.data;
            if (command === 'chatResponse') {
                document.getElementById('response').innerText = text;
            }
        });
    </script>
</body>
</html>
    `;
}