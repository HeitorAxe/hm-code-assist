(function() {
    //keeping code inside a function avoids overwriting a variable from another script
    //it is also very ugly
    const vscode = acquireVsCodeApi();

    const askBtn = document.getElementById('askBtn');
    const promptInput = document.getElementById('prompt');
    const loader = document.getElementById('loader');
    const messageGroup = document.getElementsByClassName('message-group')[0];

    // Add this right after loading the libraries (marked and highlight.js)
    marked.setOptions({
        highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-'
    });
    
    // Add DOMPurify config to allow highlight.js classes
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
        if (node.tagName === 'CODE') {
        node.setAttribute('class', 'hljs ' + (node.getAttribute('class') || ''));
        }
    });

    askBtn.addEventListener('click', () => {
        const text = promptInput.value;
        if (!text) return;
        promptInput.value = '';
        //disabling send button
        askBtn.disabled = true;
        loader.classList.remove('hidden');
        //getting data from selector
        const selectorElement = document.getElementById("llmSelector");
        const selectedOption = selectorElement.options[selectorElement.selectedIndex];
        const selectedModel = JSON.parse(selectedOption.getAttribute("data-info"));
        //adding user message to chat
        const userMessage = document.createElement('div');
        userMessage.innerText = text;
        userMessage.className = 'user-message';
        messageGroup.appendChild(userMessage);

        vscode.postMessage({ 
            command: 'chat', 
            text: text,
            model: selectedModel
        });
    });

    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !askBtn.disabled) {
            event.preventDefault();
            askBtn.click();
        }
    });

    window.addEventListener('message', event => {
        const { command, text, data } = event.data;
        switch(command){
            case 'chatResponse':
                // Sanitize and parse markdown
                const unsafeHtml = marked.parse(text);
                const safeHtml = DOMPurify.sanitize(unsafeHtml);
                
                const lastMessage = messageGroup.lastElementChild;
                
                if(!lastMessage?.classList.contains('assistant-message')){
                    const assistantMessage = document.createElement('div');
                    assistantMessage.className = 'assistant-message';
                    assistantMessage.innerHTML = safeHtml;
                    messageGroup.appendChild(assistantMessage)
                } else {
                    messageGroup.lastElementChild.innerHTML = safeHtml;
                }
                
                // Apply syntax highlighting
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
                break;

            case 'chatComplete':
                askBtn.disabled = false;
                loader.classList.add('hidden');
                break;

            case 'loadData':
                if(data && data.models){
                    const selectorElement = document.getElementById("llmSelector")
                    for(const model of data.models){
                        console.log(model)
                        const newOption=document.createElement("option");
                        newOption.value=model.name;
                        newOption.textContent = model.name;
                        newOption.setAttribute("data-info",  JSON.stringify(model))
                        selectorElement.appendChild(newOption)
                    }
                }
                break;
            default:
                console.warn("Invalid Message")
        }
    });


})();
