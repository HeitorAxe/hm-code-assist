(function() {
    const vscode = acquireVsCodeApi();
    const askBtn = document.getElementById('askBtn');
    const promptInput = document.getElementById('prompt');
    const loader = document.getElementById('loader');
    const chatBox = document.getElementsByClassName('chat-container')[0];
    const messageGroup = document.getElementsByClassName('message-group')[0];
    const createAllBtn = document.getElementById('createAllBtn');
    let userScrolled = false;
    
    // Function to update Create All button visibility
    const updateCreateAllVisibility = () => {
        const hasFiles = document.querySelectorAll('.gen-file-btn').length > 0;
        createAllBtn.style.display = hasFiles ? 'block' : 'none';
    };

    // Initial visibility check
    updateCreateAllVisibility();
    
    // Observe DOM changes for new file buttons
    const observer = new MutationObserver(updateCreateAllVisibility);
    observer.observe(document.body, { subtree: true, childList: true });

    //control auto scroll
    chatBox.addEventListener("scroll", (event) => {
        const element = event.target;
        if (element.scrollTop + element.clientHeight < element.scrollHeight) {
            userScrolled = true;
        } else {
            userScrolled = false;
        }
    });

    // Create All button handler
    createAllBtn.addEventListener('click', () => {
        const files = [];
        
        document.querySelectorAll('.gen-file-btn').forEach(button => {
            const uuid = button.id.replace('genFileBtn-', '');
            const pre = document.querySelector(`#pre-${uuid} code`);
            const parentDiv = button.closest('.fp');
            
            if (pre && parentDiv) {
                const filePath = parentDiv.firstChild?.textContent?.trim() || 'code.txt';
                const content = pre.textContent;
                
                files.push({
                    content: content,
                    filePath: filePath
                });
            }
        });

        if (files.length > 0) {
            vscode.postMessage({
                command: 'createAllFiles',
                files: files
            });
        } else {
            console.warn('No valid files found to create');
        }
    });

    // Configure marked.js
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
            }
            return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-'
    });
    
    // Configure DOMPurify to allow fp class
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
        if (node.tagName === 'CODE') {
            node.setAttribute('class', 'hljs ' + (node.getAttribute('class') || ''));
        }
    });

    function processFpTags(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Process all code blocks
        tempDiv.querySelectorAll('pre code').forEach(codeBlock => {
            // Get raw HTML content including syntax highlighting
            const codeHtml = codeBlock.innerHTML;
            
            // Enhanced regex pattern to match all tag variations
            const fpRegex = /(&lt;fp&gt;|&lt;FP&gt;|<fp>|<FP>)(.*?)(&lt;\/?\\?fp&gt;|&lt;\/?\\?FP&gt;|<\/fp>|<\/FP>)/gi;
            let match;
            
            while ((match = fpRegex.exec(codeHtml)) !== null) {
                const fileName = match[2].trim();
                const preElement = codeBlock.closest('pre');
                const codeBlockId = generateUUID(); // Make sure this is defined elsewhere
    
                // Create file path element
                const fpElement = document.createElement('div');
                fpElement.className = 'fp';
                fpElement.textContent = fileName;
                fpElement.id = "fp-" + codeBlockId;
    
                // Create generation button
                const button = document.createElement('button');
                button.className = 'gen-file-btn';
                button.id = "genFileBtn-" + codeBlockId;
                button.textContent = "Create File";
                button.addEventListener('click', () => {
                    // Get clean code content without any tags
                    const cleanCode = codeBlock.textContent
                        .replace(fpRegex, '')
                        .trim();
                    
                    vscode.postMessage({
                        command: 'createFile',
                        fileName: fileName,
                        content: cleanCode,
                        codeBlockId: codeBlockId
                    });
                });
                
                fpElement.appendChild(button);
                
                // Insert before the code block
                if (preElement.parentNode) {
                    preElement.parentNode.insertBefore(fpElement, preElement);
                    preElement.id = "pre-" + codeBlockId;
                }
            }
    
            // Clean the code content while preserving highlighting
            codeBlock.innerHTML = codeHtml
                .replace(fpRegex, '')
                .trim();
        });
        
        return tempDiv.innerHTML;
    }


    askBtn.addEventListener('click', () => {
        const text = promptInput.value;
        if (!text) return;
        promptInput.value = '';
        askBtn.disabled = true;
        loader.classList.remove('hidden');
        
        const selectorElement = document.getElementById("llmSelector");
        const selectedOption = selectorElement.options[selectorElement.selectedIndex];
        const selectedModel = JSON.parse(selectedOption.getAttribute("data-info"));
        
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
                //console.log(text);
                if(!userScrolled){
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
                const result = parseThinkTags(text);
                const think = result.insideThink;
                const response = result.outsideThink;

                // First parse markdown
                const unsafeHtml = marked.parse(response);
                
                // Process fp tags by extracting them from code blocks
                const processedHtml = processFpTags(unsafeHtml);
                
                // Sanitize the final HTML
                const safeHtml = DOMPurify.sanitize(processedHtml);
                
                // Handle message display
                const lastMessage = messageGroup.lastElementChild;
                let assistantMessage = '';

                if(!lastMessage?.classList.contains('assistant-message')){
                    assistantMessage = document.createElement('div');
                    assistantMessage.className = 'assistant-message';
                    assistantMessage.innerHTML = safeHtml;                    
                    messageGroup.appendChild(assistantMessage);
                } else {
                    assistantMessage = messageGroup.lastElementChild;
                    assistantMessage.innerHTML = safeHtml;
                }
                

                // Add think element if present
                if(think && assistantMessage.querySelector('.think') === null){
                    const thinkElement = document.createElement('div');
                    thinkElement.className = 'think';
                    thinkElement.innerText = think;
                    assistantMessage.insertBefore(thinkElement, assistantMessage.firstChild);
                } else if(think){
                    const thinkElement = assistantMessage.querySelector('.think');
                    thinkElement.innerText = think;
                }
                
                // Apply syntax highlighting
                document.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });

                //adding create file btn functionality
                document.querySelectorAll('.gen-file-btn:not([data-listener-added])').forEach(button => {
                    // Mark the button as processed
                    button.dataset.listenerAdded = "true";
                    
                    button.addEventListener('click', (event) => {
                        // 1. Get UUID from button ID
                        const uuid = button.id.replace('genFileBtn-', '');
                        
                        // 2. Find matching <pre> element
                        const pre = document.querySelector(`#pre-${uuid} code`);
                        if (!pre) {
                            console.error('Code element not found');
                            return;
                        }
                        
                        // 3. Get filename from parent div's text
                        const parentDiv = button.closest('.fp');
                        const filePath = parentDiv?.firstChild?.textContent?.trim() || 'code.txt';
                        
                        // 4. Extract raw text content
                        const rawCode = pre.textContent;
                        
                        vscode.postMessage({ 
                            command: 'createFile', 
                            content: rawCode,
                            filePath: filePath
                        });
                    });
                });             

                
                break;

            case 'chatComplete':
                askBtn.disabled = false;
                loader.classList.add('hidden');
                break;

            case 'loadData':
                if(data && data.models){
                    const selectorElement = document.getElementById("llmSelector");
                    for(const model of data.models){
                        const newOption = document.createElement("option");
                        newOption.value = model.name;
                        newOption.textContent = model.name;
                        newOption.setAttribute("data-info", JSON.stringify(model));
                        selectorElement.appendChild(newOption);
                    }
                }
                break;
            default:
                console.warn("Invalid Message");
        }
    });

    function parseThinkTags(input) {
        let insideThink = '';
        let outsideThink = '';
        let lastIndex = 0;
        const regex = /<think>([\s\S]*?)(<\/think>|$)/g;
        let match;
    
        while ((match = regex.exec(input)) !== null) {
            if (match.index > lastIndex) {
                outsideThink += input.slice(lastIndex, match.index);
            }
    
            insideThink += match[1];
            lastIndex = regex.lastIndex;
            
            if (!match[2]) break;
        }
    
        if (lastIndex < input.length) {
            outsideThink += input.slice(lastIndex);
        }
    
        return {
            insideThink,
            outsideThink
        };
    }
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
})();