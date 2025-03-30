// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
//import * as vscode from 'vscode';
//import ollama from 'ollama';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/* Leaving this commented so I don't forget
	export function activate(context: vscode.ExtensionContext) {

		// Use the console to output diagnostic information (console.log) and errors (console.error)
		// This line of code will only be executed once when your extension is activated
		console.log('Congratulations, your extension "hm-code-assist" is now active!');

		// The command has been defined in the package.json file
		// Now provide the implementation of the command with registerCommand
		// The commandId parameter must match the command field in package.json
		const disposable = vscode.commands.registerCommand('hm-code-assist.helloWorld', () => {
			// The code you place here will be executed every time your command is executed
			// Display a message box to the user
			vscode.window.showInformationMessage('Hello World from hm_code_assist!');
		});

		context.subscriptions.push(disposable);
	} 
*/
import * as vscode from "vscode";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";
import { registerLaunchPanel } from "./commands/launchPanel";
import { registerSetGoogleApiKey } from "./commands/setGoogleApiKey";

async function getOllama() {
    const ollama = await import("ollama");
    return ollama.default;
}

export async function activate(context: vscode.ExtensionContext) {
    console.log('Congratulations, your extension "hm-code-assist" is now active!');

    context.subscriptions.push(
		registerLaunchPanel(context), 
		registerSetGoogleApiKey(context)
	);
}


async function getGoogleApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return await context.secrets.get("googleApiKey");
}

export function deactivate() {}
