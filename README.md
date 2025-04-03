# hm-code-assist

**hm-code-assist** is a Visual Studio Code extension that brings advanced LLM chat functionality directly into your editor. It allows you to connect to Gemini models using your Google API key and to local Ollama models (which are auto-detected).

## Features

- **LLM Chat Interface**: Engage in interactive conversations with language models.
- **Gemini Integration**: Connect to Gemini models by setting your Google API key.
- **Ollama Auto-Detection**: Automatically detect and use local Ollama models.
- **File Generation**: Generate and create files within your workspace directly from AI responses.
- **Reasoning models UI Support**: Visualize the thought process of reasoning models.

The extension follows the default VSCode extension development workflow:

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/HeitorAxe/hm-code-assist.git
   cd hm-code-assist
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Compile the Extension:**

   ```bash
   npm run compile
   ```

4. **Package the Extension:**
   Install `vsce` globally if you haven't already:

   ```bash
   npm install -g @vscode/vsce
   ```

   Then package the extension:

   ```bash
   vsce package
   ```

5. **Install the Extension in VSCode:**

   ```bash
   code --install-extension hm-code-assist-0.0.1.vsix
   ```

## Running a Preview with VSCode Debugger

To run a preview of the extension using the Visual Studio Code debugger:

1. **Open the Project in VS Code:**

   - Launch Visual Studio Code and open your **hm-code-assist** project directory.

2. **Access the Run and Debug View:**

   - Click on the **Run and Debug** icon in the Activity Bar on the side of the window. Alternatively, press `Ctrl+Shift+D` (`Cmd+Shift+D` on macOS).

3. **Start Debugging:**

   - Press `F5` or click the green **Start Debugging** button. This action will open a new VS Code window labeled **Extension Development Host**, where your extension is active.

4. **Interact with Your Extension:**

   - In the **Extension Development Host** window, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
   - Type and select **"hm-code-assist: Launch Panel"** to initiate the LLM chat interface.

This process allows you to test and debug your extension in an environment that simulates how users will experience it. You can set breakpoints, inspect variables, and step through your code to diagnose and fix issues.

## Configuration

Before using the extension, ensure you set up the required configurations:

- **Google API Key for Gemini:**
  - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
  - Run **"hm-code-assist: Set Google API Key"** and paste your API Key.
- **Ollama Models:**
  - No manual configuration is required as the extension auto-detects local Ollama models.

### Customizing Available Models

You can edit the list of available models by modifying your VSCode settings. Navigate to the settings (`Ctrl+,` or `Cmd+,` on macOS) and search for `hmCodeAssist.llmModels`. You can manually update the list of models by adding or modifying entries in your `settings.json` file:

```json
"hmCodeAssist.llmModels": [
    {
        "provider": "google",
        "name": "gemini-2.0-flash"
    },
    {
        "provider": "google",
        "name": "gemini-2.5-pro-exp-03-25"
    }
]
```

## Usage

- **Starting a Chat Session:**

  - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
  - Run **"hm-code-assist: Launch Panel"** to open the LLM chat interface.

- **Generating Files:**

  - Within the chat interface, prompt the AI to generate files. The extension will display a "Create File" button; click to add these files to your current workspace.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have feature requests, please open an issue in the [GitHub repository](https://github.com/HeitorAxe/hm-code-assist/issues).

