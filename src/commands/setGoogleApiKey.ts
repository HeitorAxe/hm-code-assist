import * as vscode from "vscode";

export function registerSetGoogleApiKey(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand("hm-code-assist.setGoogleApiKey", async () =>{
        const apiKey = await vscode.window.showInputBox({
            prompt: "Enter your Google API Key",
            ignoreFocusOut: true,
            password: true
        })
    
        if (apiKey) {
            await context.secrets.store("googleApiKey", apiKey);
            console.log(apiKey)
            vscode.window.showInformationMessage("Googl API Key Saved!")
        }
    
    })
}
