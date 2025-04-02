import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { fetchLlmResponse } from "../llm/fetchLlmResponse";
import { listOllamaModels } from "../llm/utils";

export function registerLaunchPanel(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand("hm-code-assist.launchPanel", async () => {
        const panel = vscode.window.createWebviewPanel(
            "hm-code-assist",
            "AI Assistant",
            vscode.ViewColumn.Two,
            { enableScripts: true, retainContextWhenHidden: true }
        );

        panel.webview.html = getWebViewContent(context, panel);
        
        let llmModels = [{
                provider: "google",
                name:"gemini-2.0-flash"
            },
            {
                provider: "google",
                name:"gemini-2.5-pro-exp-03-25"
            }
        ];
        
        try{
            const ollamaModels = await listOllamaModels();
            llmModels.push(...ollamaModels);
        }catch(err){
            vscode.window.showInformationMessage("Could not connect to Ollama");
        }

        panel.webview.postMessage({ 
            command: "loadData", 
            data: {
                models: llmModels
            }
        });

        const messages = [
            { role: 'system', content: `
                You are a helpful assistant and you follow the rules.
                The rules are:
                    1 - Whenever you output any sort of code inside a codeblock, you must do the following:
                        In the first line of the codeblock you must add a suggested path for the code file, the path should never be absolute, example:
                        \`\`\`python
                        <fp>suggested/file/path<\\fp>
                        print("hello world!")
                        \`\`\`

                        Another example:
                        \`\`\`html
                        <fp>suggested/file/path<\\fp>
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Simple html</title>
                            <link rel="stylesheet" href="style.css">
                        </head>
                        <body>

                        </body>
                        </html>
                        \`\`\`
                ` 
            },
        ]

        //TODO
        //find a way to add models via config
        panel.webview.onDidReceiveMessage(async (message: any) => {
            if (message.command === "chat") {
                const userPrompt = message.text;
                messages.push({
                    role: 'user',
                    content: userPrompt
                });
                const model = message.model;
                let responseText = "";
                let requestComplete = false;
                try {
                    
                    try{
                        const streamResponse = await fetchLlmResponse({
                            provider: model.provider,
                            model: model.name,
                            messages: messages
                        }, context);

                        for await (const part of streamResponse) {
                            responseText += part;
                            console.log(part);
                            panel.webview.postMessage({ command: "chatResponse", text: responseText });
                        }
                        messages.push({
                            role: 'assistant',
                            content: responseText
                        })
                    }catch(err){
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        vscode.window.showErrorMessage(`Something went wrong getting response from model ${model.name}, from provider ${model.provider} \n`+errorMessage)
                    }
                    finally{
                        requestComplete = true;
                    }

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
            else if(message.command == 'createFile'){
                createOrOverwriteFile(message.content, message.filePath)
            }
            else if(message.command == 'createAllFiles'){
                for(const file of message.files){
                    createOrOverwriteFile(file.content, file.filePath)
                }
            }
        });
    });
}

function getWebViewContent(context: vscode.ExtensionContext, panel: vscode.WebviewPanel): string {
    const mediaPath = vscode.Uri.joinPath(context.extensionUri, "view");

    const styleUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "style.css"));
    const scriptUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "scripts/script.js"));
    const highlightUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "scripts/highlight.min.js"));
    const markedUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "scripts/marked.min.js"));
    const purifyUri = panel.webview.asWebviewUri(vscode.Uri.joinPath(mediaPath, "scripts/purify.min.js"));

    const htmlPath = vscode.Uri.joinPath(mediaPath, "index.html");
    let html = fs.readFileSync(htmlPath.fsPath, "utf8");

    html = html.replace(/\${styleUri}/g, styleUri.toString());
    html = html.replace(/\${scriptUri}/g, scriptUri.toString());
    html = html.replace(/\${markedUri}/g, markedUri.toString());
    html = html.replace(/\${highlightUri}/g, highlightUri.toString());
    html = html.replace(/\${purifyUri}/g, purifyUri.toString());
    html = html.replace(/\${webview.cspSource}/g, panel.webview.cspSource);

    return html;
}

async function createOrOverwriteFile(content: string, relativeFilePath: string): Promise<void> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showWarningMessage('This function only works with a project opened.');
      return;
    }
  
    const workspaceFolder = folders[0];
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFilePath);
  
    try {
      await vscode.workspace.fs.stat(fileUri);
      const answer = await vscode.window.showWarningMessage(
        `File "${relativeFilePath}" already exists. Do you want to overwrite it?`,
        { modal: true },
        'Overwrite'
      );
      if (answer !== 'Overwrite') {
        return;
      }
    } catch (err) {
      //this means that we can write it because the error is thrown by:
      //await vscode.workspace.fs.stat(fileUri);
      //which means file not found, so we ca create it
    }
  
    const filePath = fileUri.fsPath;
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  
    const encoder = new TextEncoder();
    const encodedContent = encoder.encode(content);
    await vscode.workspace.fs.writeFile(fileUri, encodedContent);
  
    vscode.window.showInformationMessage(`File "${relativeFilePath}" has been created/overwritten.`);
  }