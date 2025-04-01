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

        //TODO try loading those from a json
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
            { role: 'system', content: `
                You are a helpful assistant and you follow the rules.
                The rules are:
                    1 - Whenever you output any sort of code inside a codeblock, you must do the following:
                        In the first line of the codeblock you must add a suggested path for the code file, the path should never be absolute, example:
                        \`\`\`python
                        <fp>suggested/file/path<\\fp>
                        print("hello world!")
                        \`\`\`
                ` 
            },
        ]

        //TODO treat possible errors, decide where to put api key retrieval
        //find a way to add models via config
        //throw error in case there is no ollama, treat this case
        //add timeout
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

async function createOrOverwriteFile(content: string, relativeFilePath: string): Promise<void> {
    // Check if there is at least one workspace folder open.
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showWarningMessage('This function only works with a project opened.');
      return;
    }
  
    // Use the first open workspace folder.
    const workspaceFolder = folders[0];
    const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, relativeFilePath);
  
    // Check if the file exists.
    try {
      await vscode.workspace.fs.stat(fileUri);
      // File exists; ask user if they want to overwrite.
      const answer = await vscode.window.showWarningMessage(
        `File "${relativeFilePath}" already exists. Do you want to overwrite it?`,
        { modal: true },
        'Overwrite'
      );
      if (answer !== 'Overwrite') {
        return; // Stop if the user doesn't confirm.
      }
    } catch (err) {
      // If stat throws, the file does not exist. Proceed.
    }
  
    // Ensure the directory exists.
    const filePath = fileUri.fsPath;
    const dirPath = path.dirname(filePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  
    // Write the content to the file.
    const encoder = new TextEncoder();
    const encodedContent = encoder.encode(content);
    await vscode.workspace.fs.writeFile(fileUri, encodedContent);
  
    vscode.window.showInformationMessage(`File "${relativeFilePath}" has been created/overwritten.`);
  }