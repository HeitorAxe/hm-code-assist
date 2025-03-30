(function() {
    //keeping code inside a function avoids overwriting a variable from another script
    //it is also very ugly
    const vscode = acquireVsCodeApi();

    const askBtn = document.getElementById('askBtn');
    const promptInput = document.getElementById('prompt');
    const responseDiv = document.getElementById('response');
    const loader = document.getElementById('loader');

    askBtn.addEventListener('click', () => {
        const text = promptInput.value;
        if (!text) return;
        askBtn.disabled = true;
        loader.classList.remove('hidden');
        responseDiv.innerText = '';
        vscode.postMessage({ command: 'chat', text });
    });

    window.addEventListener('message', event => {
        const { command, text } = event.data;
        if (command === 'chatResponse') {
            const htmlContent = marked.parse(text);
            document.getElementById('response').innerHTML = htmlContent;
        } else if (command === 'chatComplete') {
            askBtn.disabled = false;
            loader.classList.add('hidden');
        }
    });

    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !askBtn.disabled) {
            event.preventDefault();
            askBtn.click();
        }
    });
})();
