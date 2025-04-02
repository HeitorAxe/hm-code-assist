# hm-code-assist

**hm-code-assist** is a Visual Studio Code extension that brings advanced LLM chat functionality directly into your editor. It allows you to connect to Gemini models using your Google API key and to local Ollama models (which are auto-detected).

## Features

- **LLM Chat Interface**: Engage in interactive conversations with language models.
- **Gemini Integration**: Connect to Gemini models by setting your Google API key.
- **Ollama Auto-Detection**: Automatically detect and use local Ollama models.
- **File Generation**: Generate and create files within your workspace directly from AI responses.
- **Reasoning models UI Support**: Visualize the thought process of reasoning models.

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/HeitorAxe/hm-code-assist
   cd hm-code-assist
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Build the Extension (if necessary):**

   ```bash
   npm run compile
   ```

## Running the Extension

The extension follows the default VSCode extension development workflow:

1. Open the project folder in Visual Studio Code.
2. Press `F5` to launch a new Extension Development Host window.
3. In the new window, open the Command Palette with `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and type **"hm-code-assist: Launch Panel"** to initiate the chat interface.

## Configuration

Before using the extension, ensure you set up the required configurations:

- **Google API Key for Gemini:**
  - Open the VSCode settings (`Ctrl+,` or `Cmd+,` on macOS).
  - Search for `hm-code-assist.googleApiKey`.
  - Enter your Google API key to enable Gemini model integration.

- **Ollama Models:**
  - No manual configuration is required as the extension auto-detects local Ollama models.

## Usage

- **Starting a Chat Session:**
  - Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
  - Run **"hm-code-assist: Start Chat"** to open the LLM chat interface.

- **Generating Files:**
  - Within the chat interface, prompt the AI to generate files. The extension will automatically create and add these files to your current workspace.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have feature requests, please open an issue in the [GitHub repository](https://github.com/HeitorAxe/hm-code-assist/issues).
