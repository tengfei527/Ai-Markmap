// AI功能模块
// 处理AI模型查询、内容生成等AI相关功能

/**
 * 查询可用的AI模型
 */
async function queryAvailableModels(isSilent = false) {
    const apiUrl = document.getElementById('api-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    if (!apiUrl || !apiKey) {
        if (!isSilent) {
            alert(T('js_alert_query_no_config'));
            openSettingsModal();
        }
        return;
    }
    
    const queryBtn = document.getElementById('query-models-btn');
    const originalText = queryBtn.innerHTML;
    queryBtn.disabled = true;
    if (!isSilent) { queryBtn.innerHTML = T('js_querying'); }
    
    try {
        let modelsApiUrl = apiUrl.replace(/\/chat\/completions$/, '/models');
        if (!modelsApiUrl.endsWith('/models')) {
            const baseUrlMatch = apiUrl.match(/^(https?:\/\/.+?\/v\d+)/);
            if (baseUrlMatch) { modelsApiUrl = `${baseUrlMatch[1]}/models`;
            } else { throw new Error("无法从API地址推断出/models路径，请检查API地址格式。"); }
        }
        
        const response = await fetch(modelsApiUrl, {
            method: 'GET', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) { 
            const errorText = await response.text();
            throw new Error(`查询失败: ${response.status} - ${response.statusText}. 响应: ${errorText}`); 
        }
        
        const data = await response.json();
        const models = (data.data || data.models || []).map(m => m.id || m.name || m).filter(Boolean);
        if (models.length === 0) { throw new Error('未找到可用模型'); }
        
        const modelSelect = document.getElementById('model-select');
        const currentSelectedValue = modelSelect.value === 'custom' ? document.getElementById('custom-model-input').value : modelSelect.value;
        modelSelect.innerHTML = '<option value="custom">自定义</option>';
        models.forEach(modelId => {
            const option = document.createElement('option');
            option.value = option.textContent = modelId;
            modelSelect.appendChild(option);
        });
        
        const optionExists = models.includes(currentSelectedValue);
        if(optionExists) { modelSelect.value = currentSelectedValue;
        } else {
            modelSelect.value = 'custom';
            document.getElementById('custom-model-input').value = currentSelectedValue;
        }
        
        handleModelChange();
        saveConfig();
        
        if (!isSilent) {
            alert(T('js_alert_query_success', models.length));
        } else {
            console.log(`[Silent Query] Successfully fetched ${models.length} models.`);
        }
    } catch (error) {
        console.error('查询模型失败:', error);
        if (!isSilent) alert(T('js_alert_query_failed', error.message));
    } finally {
        queryBtn.disabled = false;
        queryBtn.innerHTML = T('queryBtn');
    }
}

/**
 * 使用AI生成思维导图内容
 */
async function generateWithAI() {
    const content = topicInput.value.trim();
    if (!content) { alert(T('js_alert_no_content')); return; }

    const apiUrl = document.getElementById('api-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim();
    const modelSelect = document.getElementById('model-select');
    let model = modelSelect.value === 'custom' ? document.getElementById('custom-model-input').value.trim() : modelSelect.value;
    
    if (modelSelect.value === 'custom' && !model) { alert(T('js_alert_no_custom_model')); return; }
    if (!apiUrl || !apiKey) { alert(T('js_alert_no_api_config')); openSettingsModal(); return; }

    const loadingOverlay = document.getElementById('loading-overlay');
    const statusMessage = document.getElementById('status-message');
    const timerDisplay = document.getElementById('timer-display');
    const generatingText = T('js_generating');

    generateBtn.disabled = true;
    pasteGenerateBtn.disabled = true;
    generateBtn.innerHTML = generatingText;
    pasteGenerateBtn.innerHTML = generatingText;

    loadingOverlay.style.display = 'flex';
    statusMessage.textContent = T('js_status_requesting');
    startTimer(timerDisplay);
    clearAiResults();

    try {
        const fetchPromises = [];
        const numVersions = parseInt(versionSlider.value, 10);
        for (let i = 0; i < numVersions; i++) {
            fetchPromises.push(
                fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: AI_PROMPT_TEMPLATE.replace('{{CONTENT}}', content) }],
                        max_tokens: 2000,
                        temperature: 0.6 + i * 0.15
                    })
                })
            );
        }

        const responses = await Promise.allSettled(fetchPromises);
        let successfulResults = 0;

        for (const result of responses) {
            if (result.status === 'fulfilled') {
                const response = result.value;
                 if (response.ok) {
                    try {
                        const data = await response.json();
                        const markdownContent = data.choices?.[0]?.message?.content;
                        if (markdownContent) {
                            const { root } = transformer.transform(markdownContent.trim());
                            aiResults.push({ markdown: markdownContent.trim(), root: root });
                            successfulResults++;
                            statusMessage.textContent = T('js_status_generated', successfulResults, numVersions);
                        }
                    } catch (e) { console.error('解析AI响应失败:', e); }
                }
            } else {
                console.error('一个AI请求失败:', result.reason);
            }
        }
        
        if (aiResults.length > 0) {
            localStorage.setItem(LAST_SUCCESSFUL_MODEL_KEY, model);
            statusMessage.textContent = T('js_status_done', aiResults.length);
            renderResultTabs();
            switchToResult(0);
            switchView('markdown');
            setTimeout(() => { loadingOverlay.style.display = 'none'; }, 1000);
        } else {
            throw new Error(T('js_alert_all_failed'));
        }

    } catch (error) {
        console.error('AI生成失败:', error);
        alert(T('js_alert_gen_failed', error.message));
        loadingOverlay.style.display = 'none';
        updateMarkmap(currentMarkdown);
    } finally {
        stopTimer();
        generateBtn.disabled = false;
        pasteGenerateBtn.disabled = false;
        generateBtn.innerHTML = T('generateBtn');
        pasteGenerateBtn.innerHTML = T('pasteGenerateBtn');
        updateAllButtonStates();
    }
}

/**
 * 从剪贴板粘贴内容并生成
 */
async function pasteAndGenerate() {
    if (!navigator.clipboard) {
        alert(T('js_alert_no_clipboard'));
        return;
    }

    try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) {
            alert(T('js_alert_clipboard_empty'));
            return;
        }
        
        topicInput.value = text;
        switchView('input');
        await generateWithAI();

    } catch (err) {
        console.error("无法读取剪贴板:", err);
        alert(T('js_alert_clipboard_error'));
    }
}

/**
 * 处理主题输入变化
 */
function handleTopicInput() {
    const text = this.value;
    if (text.trim().startsWith('#')) {
        clearAiResults();
        currentMarkdown = text;
        debounceUpdate(currentMarkdown);
    } else {
        updateAllButtonStates();
    }
}

/**
 * 处理显示区域编辑
 */
function handleDisplayEdit() {
    if (currentViewMode === 'markdown') {
        const newMarkdown = this.value;
        currentMarkdown = newMarkdown;

        if (activeResultIndex > -1 && aiResults[activeResultIndex]) {
            aiResults[activeResultIndex].markdown = newMarkdown;
            try {
                const { root } = transformer.transform(newMarkdown);
                aiResults[activeResultIndex].root = root;
            } catch (error) {
                console.error('Error parsing edited markdown:', error);
            }
        }
        
        debounceUpdate(newMarkdown);
    } else if (currentViewMode === 'original') {
        topicInput.value = this.value;
        updateAllButtonStates();
    }
}