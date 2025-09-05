// 配置管理模块
// 处理API配置、模型选择和本地存储

const LAST_SUCCESSFUL_MODEL_KEY = 'ai-mindmap-last-successful-model';

/**
 * 自动补全API URL，确保包含正确的端点
 */
function autoCompleteApiUrl() {
    const input = document.getElementById('api-url');
    let url = input.value.trim();
    if (!url || url.includes('/chat/completions')) { return; }
    url = url.replace(/\/+$/, '');
    let correctedUrl;
    if (url.endsWith('/v1')) {
        correctedUrl = url + '/chat/completions';
    } else {
        correctedUrl = url + '/v1/chat/completions';
    }
    input.value = correctedUrl;
}

/**
 * 保存当前配置到本地存储
 */
function saveConfig() {
    const config = {
        apiUrl: document.getElementById('api-url').value,
        apiKey: document.getElementById('api-key').value,
        model: document.getElementById('model-select').value,
        customModel: document.getElementById('custom-model-input').value,
        versionCount: document.getElementById('version-slider').value,
    };
    localStorage.setItem('ai-mindmap-config', JSON.stringify(config));
}

/**
 * 从本地存储加载配置
 */
function loadConfig() {
    try {
        const configStr = localStorage.getItem('ai-mindmap-config');
        const parsed = configStr ? JSON.parse(configStr) : {};

        document.getElementById('api-url').value = parsed.apiUrl || '';
        document.getElementById('api-key').value = parsed.apiKey || '';

        if (parsed.versionCount) {
            document.getElementById('version-slider').value = parsed.versionCount;
        }

        const modelSelect = document.getElementById('model-select');
        const customModelInput = document.getElementById('custom-model-input');
        
        let modelToSet;

        const lastSuccessfulModel = localStorage.getItem(LAST_SUCCESSFUL_MODEL_KEY);
        if (lastSuccessfulModel) {
            modelToSet = lastSuccessfulModel;
        } else {
            modelToSet = parsed.model || 'gpt-4o-mini';
        }
        
        if ([...modelSelect.options].some(opt => opt.value === modelToSet)) {
            modelSelect.value = modelToSet;
            customModelInput.value = parsed.customModel || '';
        } else {
            modelSelect.value = 'custom';
            customModelInput.value = modelToSet;
        }

    } catch(e) {
        console.error("解析本地配置失败", e);
        localStorage.removeItem('ai-mindmap-config');
    }
}

/**
 * 加载Prompt模板配置
 */
function loadPrompt() {
    const savedPrompt = localStorage.getItem('ai-mindmap-prompt');
    AI_PROMPT_TEMPLATE = savedPrompt || T('defaultPrompt');
}

/**
 * 处理模型选择变化，显示/隐藏自定义模型输入框
 */
function handleModelChange() {
    const modelSelect = document.getElementById('model-select');
    const customModelInput = document.getElementById('custom-model-input');
    customModelInput.classList.toggle('hidden', modelSelect.value !== 'custom');
}