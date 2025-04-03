(function() {
    // --- Element References ---
    const vscode = acquireVsCodeApi();
    const askBtn = document.getElementById('askBtn');
    const promptInput = document.getElementById('prompt');
    const loader = document.getElementById('loader');
    const chatBox = document.getElementsByClassName('chat-container')[0];
    const messageGroup = document.getElementsByClassName('message-group')[0];
    const createAllBtn = document.getElementById('createAllBtn');

    // --- State Variables ---
    let userScrolled = false;
    const scrollThreshold = 15;
    let currentAssistantMessageElement = null;

    // --- Debounced Scroll Handler ---
    let scrollTimeout;
    const debouncedScrollHandler = () => {
         const distanceToBottom = chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;
         const isAtBottom = distanceToBottom <= scrollThreshold;
        if (!isAtBottom && !userScrolled) {
            userScrolled = true;
        } else if (isAtBottom && userScrolled) {
            userScrolled = false;
        }
    };
    chatBox.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(debouncedScrollHandler, 50);
    });

    // --- Create All Button Visibility ---
    const updateCreateAllVisibility = () => {
        const hasFiles = messageGroup.querySelectorAll('.gen-file-btn').length > 0;
        createAllBtn.style.display = hasFiles ? 'block' : 'none';
    };
    updateCreateAllVisibility();

    // --- Observe DOM for FP Button Changes ---
    const observer = new MutationObserver((mutationsList) => {
         for(const mutation of mutationsList) {
             if (mutation.type === 'childList') {
                 const addedNodesImpact = Array.from(mutation.addedNodes).some(node =>
                    (node.classList && node.classList.contains('gen-file-btn')) || (node.querySelector && node.querySelector('.gen-file-btn'))
                 );
                 const removedNodesImpact = Array.from(mutation.removedNodes).some(node =>
                    (node.classList && node.classList.contains('gen-file-btn')) || (node.querySelector && node.querySelector('.gen-file-btn'))
                 );
                 if (addedNodesImpact || removedNodesImpact) {
                     updateCreateAllVisibility();
                     break;
                 }
             }
         }
    });
    observer.observe(messageGroup, { subtree: true, childList: true });

    // --- Create All Button Functionality ---
    createAllBtn.addEventListener('click', () => {
        const files = [];
        messageGroup.querySelectorAll('.gen-file-btn').forEach(button => {
            const uuid = button.dataset.uuid;
            if (!uuid) {
                console.warn('Create All: Skipping button without UUID.');
                return;
            }
            const pre = document.querySelector(`#pre-${uuid} code`);
            const fpDiv = document.querySelector(`.fp[data-associated-pre="pre-${uuid}"]`);
            if (pre && fpDiv) {
                const filePath = fpDiv.dataset.filename || `code-${uuid}.txt`;
                const content = pre.textContent || '';
                files.push({ content: content, filePath: filePath });
            } else {
                 console.warn(`Create All: Could not find elements for UUID: ${uuid}`);
            }
        });
        if (files.length > 0) {
            vscode.postMessage({ command: 'createAllFiles', files: files });
            console.log(`Create All: Posting ${files.length} files.`);
        } else {
            console.warn('Create All: No valid files found to create.');
        }
    });

    // --- Event Delegation for Individual Create File Buttons ---
    messageGroup.addEventListener('click', (event) => {
        const button = event.target.closest('.gen-file-btn');
        if (button) {
            const uuid = button.dataset.uuid;
            if (!uuid) {
                console.error('Create File click: Button is missing UUID:', button);
                return;
            }
            const pre = document.querySelector(`#pre-${uuid} code`);
            const fpDiv = document.querySelector(`.fp[data-associated-pre="pre-${uuid}"]`);
            if (pre && fpDiv) {
                const filePath = fpDiv.dataset.filename || `code-${uuid}.txt`;
                const rawCode = pre.textContent || '';
                console.log(`Create File click: Posting file '${filePath}'`);
                vscode.postMessage({ command: 'createFile', content: rawCode, filePath: filePath });
            } else {
                 console.error('Create File click: Could not find pre or fp element for UUID:', uuid);
                 if (!pre) console.error('Pre element missing');
                 if (!fpDiv) console.error('FP div missing');
            }
        }
    });

    // --- Configure marked.js ---
    marked.setOptions({
        highlight: function(code, lang) {
            const language = lang || 'plaintext';
            if (hljs.getLanguage(language)) {
                try {
                   const elem = document.createElement('div');
                   elem.textContent = code;
                   return hljs.highlight(elem.innerHTML, { language: language, ignoreIllegals: true }).value;
                } catch (e) {
                    console.error("Highlighting error:", e, "Lang:", language);
                    return hljs.highlightAuto(code).value;
                }
            }
            return hljs.highlightAuto(code).value;
        },
        langPrefix: 'hljs language-'
    });

    // --- Configure DOMPurify ---
    DOMPurify.addHook('afterSanitizeAttributes', function(node) {
        if (node.tagName === 'CODE' && node.getAttribute('class')?.includes('language-')) {
             node.classList.add('hljs');
        }
    });
    DOMPurify.setConfig({ ADD_ATTR: ['data-uuid', 'data-filename', 'data-associated-pre'] });

    // --- Helper Function: Process <fp> Tags ---
    function processFpTags(htmlString) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        const codeBlocks = tempDiv.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
            const preElement = codeBlock.closest('pre');
            if (!preElement) return;
            const codeText = codeBlock.textContent || "";
            const fpRegex = /<fp>(.*?)<\/fp>/gi;
            const matches = [...codeText.matchAll(fpRegex)];
            let cleanedCode = codeText;
            if (matches.length > 0) {
                const codeBlockId = generateUUID();
                 matches.forEach(match => {
                    const fullMatch = match[0];
                    const fileName = match[1].trim();
                    const fpElement = document.createElement('div');
                    fpElement.className = 'fp';
                    fpElement.dataset.filename = fileName;
                    fpElement.dataset.associatedPre = `pre-${codeBlockId}`;
                    fpElement.textContent = fileName;
                    const button = document.createElement('button');
                    button.className = 'gen-file-btn';
                    button.dataset.uuid = codeBlockId;
                    button.textContent = "Create File";
                    fpElement.appendChild(button);
                    if (preElement.parentNode && !preElement.parentNode.querySelector(`.fp[data-associated-pre="pre-${codeBlockId}"]`)) {
                       preElement.parentNode.insertBefore(fpElement, preElement);
                    }
                    cleanedCode = cleanedCode.replace(fullMatch, '');
                 });
                 codeBlock.textContent = cleanedCode.trim();
                 if (!preElement.id) {
                    preElement.id = `pre-${codeBlockId}`;
                 }
             }
        });
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
             fragment.appendChild(tempDiv.firstChild);
        }
        return fragment;
    }

    // --- Helper Function: Parse <think> Tags ---
    function parseThinkTags(input) {
        let insideThink = '';
        let outsideThink = '';
        let lastIndex = 0;
        const regex = /<think[^>]*>([\s\S]*?)(?:<\/think>|$)/gi;
        let match;
        while ((match = regex.exec(input)) !== null) {
            if (match.index > lastIndex) {
                outsideThink += input.slice(lastIndex, match.index);
            }
            insideThink += match[1];
            lastIndex = regex.lastIndex;
        }
        if (lastIndex < input.length) {
            outsideThink += input.slice(lastIndex);
        }
        return {
            insideThink: insideThink.trim(),
            outsideThink: outsideThink
        };
    }

    // --- Helper Function: Generate UUID ---
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Ask Button Event Listener ---
    askBtn.addEventListener('click', () => {
        const text = promptInput.value.trim();
        if (!text) return;
        promptInput.value = '';
        askBtn.disabled = true;
        loader.classList.remove('hidden');
        userScrolled = false;
        currentAssistantMessageElement = null;
        const selectorElement = document.getElementById("llmSelector");
        const selectedOption = selectorElement.options[selectorElement.selectedIndex];
        const selectedModel = JSON.parse(selectedOption.getAttribute("data-info"));
        const userMessage = document.createElement('div');
        userMessage.innerText = text;
        userMessage.className = 'user-message';
        messageGroup.appendChild(userMessage);
        chatBox.scrollTop = chatBox.scrollHeight;
        vscode.postMessage({ command: 'chat', text: text, model: selectedModel });
    });

    // --- Prompt Input Enter Key Listener ---
    promptInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !askBtn.disabled) {
            event.preventDefault();
            askBtn.click();
        }
    });

    // --- VS Code Message Listener (Handles Backend Communication) ---
    window.addEventListener('message', event => {
        const { command, text, data } = event.data;
        switch(command){
            case 'chatResponse': {
                if (text === undefined || text === null) {
                    break;
                }

                // --- Ensure the assistant message container div exists ---
                if (!currentAssistantMessageElement) {
                     currentAssistantMessageElement = document.createElement('div');
                     currentAssistantMessageElement.className = 'assistant-message';
                     const lastUserMsg = messageGroup.querySelector('.user-message:last-of-type');
                     if(lastUserMsg && lastUserMsg.nextSibling) {
                        messageGroup.insertBefore(currentAssistantMessageElement, lastUserMsg.nextSibling);
                     } else {
                        messageGroup.appendChild(currentAssistantMessageElement);
                     }
                     if (!userScrolled) chatBox.scrollTop = chatBox.scrollHeight;
                }
                // ----------------------------------------------------------

                // --- Re-render the entire message content on each update ---
                try {
                    const thinkResult = parseThinkTags(text);
                    const unsafeHtml = marked.parse(thinkResult.outsideThink);
                    const safeHtml = DOMPurify.sanitize(unsafeHtml, { RETURN_DOM_FRAGMENT: false });
                    const processedFragment = processFpTags(safeHtml);
                    const newContentContainer = document.createElement('div');
                    if(thinkResult.insideThink) {
                        const thinkElement = document.createElement('div');
                        thinkElement.className = 'think';
                        thinkElement.innerText = thinkResult.insideThink;
                        newContentContainer.appendChild(thinkElement);
                    }
                    newContentContainer.appendChild(processedFragment);
                    currentAssistantMessageElement.innerHTML = '';
                    while (newContentContainer.firstChild) {
                        currentAssistantMessageElement.appendChild(newContentContainer.firstChild);
                    }

                    const blocksToHighlight = currentAssistantMessageElement.querySelectorAll('pre code:not(.hljs-highlighted)');
                    blocksToHighlight.forEach(block => {
                        try {
                            hljs.highlightElement(block);
                            block.classList.add('hljs-highlighted');
                        } catch(e) {
                           console.error("Highlighting error during stream update:", e);
                           block.classList.add('hljs-highlighted');
                        }
                    });
                    currentAssistantMessageElement.querySelectorAll('pre code.hljs-highlighted').forEach(b => b.classList.remove('hljs-highlighted'));

                } catch (renderError) {
                    console.error("Error during assistant message render:", renderError, "Text:", text.substring(0, 100) + "...");
                    if (currentAssistantMessageElement) {
                        currentAssistantMessageElement.innerHTML = `<p style="color: orange; font-style: italic;">[Error rendering message update: ${renderError.message}]</p>`;
                    }
                }
                updateCreateAllVisibility();
                if (!userScrolled) {
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
                break;
            }

            case 'chatComplete': {
                askBtn.disabled = false;
                loader.classList.add('hidden');
                if (currentAssistantMessageElement) {
                     updateCreateAllVisibility();
                }
                 currentAssistantMessageElement = null;
                 if (!userScrolled) {
                     chatBox.scrollTop = chatBox.scrollHeight;
                 }
                 console.log("Chat complete.");
                break;
            }

            case 'loadData': {
                if(data && data.models){
                    const selectorElement = document.getElementById("llmSelector");
                    selectorElement.innerHTML = '';
                    for(const model of data.models){
                        const newOption = document.createElement("option");
                        newOption.value = model.name;
                        newOption.textContent = model.name;
                        newOption.setAttribute("data-info", JSON.stringify(model));
                        selectorElement.appendChild(newOption);
                    }
                    console.log(`Loaded ${data.models.length} models into selector.`);
                } else {
                    console.warn("Received loadData command without valid data.models");
                }
                break;
            }
            default:
                console.warn("Received unknown command from VS Code:", command);
        }
    });

})();