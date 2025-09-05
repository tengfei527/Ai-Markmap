// 用户界面管理模块
// 处理模态框、视图切换、按钮状态等UI交互

/**
 * 设置语言并更新界面文本
 */
function setLanguage(lang) {
    if (!translations[lang]) return;

    const oldDefaultMarkdown = T('defaultMarkdown');
    const isShowingDefaultMarkdown = currentMarkdown === oldDefaultMarkdown;

    currentLanguage = lang;
    localStorage.setItem('ai-mindmap-language', lang);
    document.documentElement.lang = lang.split('-')[0];

    const t = translations[lang];

    // 更新所有带翻译标签的元素
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.dataset.t;
        if (t[key]) el.innerHTML = t[key];
    });
    
    document.querySelectorAll('[data-t-placeholder]').forEach(el => {
        const key = el.dataset.tPlaceholder;
        if (t[key]) el.placeholder = t[key];
    });

    document.querySelectorAll('[data-t-title]').forEach(el => {
        const key = el.dataset.tTitle;
        if (t[key]) el.title = t[key];
    });
    
    // 更新信息模态框内容
    const infoModalContent = document.querySelector('#info-modal .info-modal-content');
    if (infoModalContent && t['infoModalContentHtml']) {
        infoModalContent.innerHTML = t['infoModalContentHtml'];
    }

    // 更新语言按钮状态
    document.querySelectorAll('#lang-switcher .lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // 更新页面标题
    document.title = (lang === 'zh') ? 'AI思维导图生成 - AiMarkmap' : 'AI Mind Map Generation - AiMarkmap';

    // 如果当前显示的是默认Markdown，更新为对应语言的默认内容
    if (isShowingDefaultMarkdown) {
        currentMarkdown = T('defaultMarkdown');
        updateMarkmap(currentMarkdown);
    }
    
    loadPrompt();

    handleFullScreenChange();
    updateAllButtonStates();
    if (aiResults.length > 0) {
        renderResultTabs();
        document.querySelectorAll('.result-tab-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.index) === activeResultIndex);
        });
    }
}

/**
 * 翻译函数，根据当前语言获取对应文本
 */
function T(key, ...args) {
    const translation = translations[currentLanguage]?.[key];
    if (typeof translation === 'function') {
        return translation(...args);
    }
    return translation || key;
}

/**
 * 更新版本数量显示
 */
function updateVersionCountDisplay() {
    const count = versionSlider.value;
    versionCountDisplay.textContent = count;
}

/**
 * 切换视图模式（输入/原文/Markdown）
 */
function switchView(viewName) {
    currentViewMode = viewName;
    if (viewName === 'original') {
        contentDisplay.value = topicInput.value;
        contentDisplay.style.display = 'block';
        topicInput.style.display = 'none';
    } else if (viewName === 'markdown') {
        contentDisplay.value = currentMarkdown;
        contentDisplay.style.display = 'block';
        topicInput.style.display = 'none';
    } else {
        contentDisplay.style.display = 'none';
        topicInput.style.display = 'block';
    }
    updateAllButtonStates();
}

/**
 * 清空所有内容
 */
function clearContent() {
    topicInput.value = '';
    clearAiResults();
    currentMarkdown = T('defaultMarkdown');
    updateMarkmap(currentMarkdown);
    switchView('input');
    topicInput.focus();
}

/**
 * 清空AI生成结果
 */
function clearAiResults() {
    aiResults = [];
    activeResultIndex = -1;
    renderResultTabs();
}

/**
 * 渲染结果选项卡
 */
function renderResultTabs() {
    const tabsContainer = document.getElementById('results-tabs');
    tabsContainer.innerHTML = '';
    if (aiResults.length > 1) {
        aiResults.forEach((_, index) => {
            const tab = document.createElement('button');
            tab.className = 'result-tab-btn';
            tab.textContent = T('js_tab_version', index);
            tab.dataset.index = index;
            tab.onclick = () => switchToResult(index);
            tabsContainer.appendChild(tab);
        });
    }
}

/**
 * 切换到指定结果
 */
function switchToResult(index) {
    if (index < 0 || index >= aiResults.length) return;

    activeResultIndex = index;
    const result = aiResults[index];
    currentMarkdown = result.markdown;
    mm.setData(result.root);
    mm.fit();

    if (currentViewMode === 'markdown') {
        contentDisplay.value = currentMarkdown;
    }

    document.querySelectorAll('.result-tab-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.index) === index);
    });
}

/**
 * 更新所有按钮状态
 */
function updateAllButtonStates() {
    const hasOriginalContent = topicInput.value.trim() !== '';
    const hasManualMd = topicInput.value.trim().startsWith('#');
    const hasGeneratedMd = aiResults.length > 0;
    const isDefaultMd = !hasManualMd && !hasGeneratedMd && currentMarkdown === T('defaultMarkdown');
    
    const exportSvgBtn = document.getElementById('export-svg-btn');
    const exportPngBtn = document.getElementById('export-png-btn');

    showOriginalBtn.classList.toggle('active', currentViewMode === 'original');
    showMarkdownBtn.classList.toggle('active', currentViewMode === 'markdown');
    showOriginalBtn.disabled = !hasOriginalContent;
    showMarkdownBtn.disabled = !hasGeneratedMd && !hasManualMd;

    const canExport = !isDefaultMd;
    if (exportSvgBtn) exportSvgBtn.disabled = !canExport;
    if (exportPngBtn) exportPngBtn.disabled = !canExport;
}

// 模态框管理函数
function openSettingsModal() { settingsModal.classList.remove('hidden'); }
function closeSettingsModal() { settingsModal.classList.add('hidden'); }
function saveAndCloseSettings() {
    autoCompleteApiUrl();
    saveConfig();
    closeSettingsModal();
    const apiUrl = document.getElementById('api-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    if (apiUrl && apiKey) { queryAvailableModels(true); }
}

function openInfoModal() { infoModal.classList.remove('hidden'); }
function closeInfoModal() { infoModal.classList.add('hidden'); }

function openPromptModal() {
    promptInput.value = AI_PROMPT_TEMPLATE;
    promptModal.classList.remove('hidden');
}
function closePromptModal() { promptModal.classList.add('hidden'); }
function saveAndClosePrompt() {
    const newPrompt = promptInput.value.trim();

    if (newPrompt) {
        if (newPrompt.includes('{{CONTENT}}')) {
            AI_PROMPT_TEMPLATE = newPrompt;
        } else {
            AI_PROMPT_TEMPLATE = newPrompt + '\n\n"{{CONTENT}}"';
        }
        localStorage.setItem('ai-mindmap-prompt', AI_PROMPT_TEMPLATE);
    } else {
        AI_PROMPT_TEMPLATE = T('defaultPrompt');
        localStorage.removeItem('ai-mindmap-prompt');
    }

    closePromptModal();
}