// 主应用程序模块
// 初始化应用、管理全局状态和事件处理

// 全局状态变量
let mm = null;                    // Markmap实例
let transformer = null;           // Markmap转换器
let debounceTimer = null;         // 防抖计时器
let currentMarkdown = '';         // 当前显示的Markdown内容
let aiResults = [];               // AI生成的结果数组
let activeResultIndex = -1;       // 当前激活的结果索引
let timerInterval = null;         // 计时器间隔
let startTime = 0;                // 计时开始时间
let currentViewMode = 'input';    // 当前视图模式
let AI_PROMPT_TEMPLATE = '';      // AI提示模板
let editingNodeContext = null;    // 正在编辑的节点上下文

let currentLanguage = 'zh';       // 当前语言

// DOM元素引用
let editorPanel;
let topicInput;
let contentDisplay;
let showOriginalBtn;
let showMarkdownBtn;
let themeSelect;
let modeToggle;

/**
 * 切换编辑器面板折叠状态
 */
function toggleEditorPanel() {
    editorPanel.classList.toggle('folded');
    
    // 保存折叠状态到本地存储
    const isFolded = editorPanel.classList.contains('folded');
    localStorage.setItem('editorPanelFolded', isFolded);
    
    // 调整思维导图容器大小
    if (mm) {
        setTimeout(() => {
            mm.fit();
        }, 100);
    }
}

/**
 * 处理主题切换
 */
function handleThemeChange() {
    const theme = themeSelect.value;
    applyTheme(theme);
    localStorage.setItem('ai-mindmap-theme', theme);
}

/**
 * 应用主题样式
 */
function applyTheme(theme) {
    // 移除所有主题类
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-blue', 'theme-green', 'theme-purple');
    
    // 添加当前主题类
    document.body.classList.add(`theme-${theme}`);
}

/**
 * 切换日/夜模式
 */
function toggleDayNightMode() {
    const isNightMode = document.body.classList.toggle('night-mode');
    const mode = isNightMode ? 'night' : 'day';
    localStorage.setItem('ai-mindmap-mode', mode);
}
const settingsModal = document.getElementById('settings-modal');
const infoModal = document.getElementById('info-modal');
const editNodeModal = document.getElementById('edit-node-modal');
const versionSlider = document.getElementById('version-slider');
const versionCountDisplay = document.getElementById('version-count-display');
const generateBtn = document.getElementById('generate-btn');
const pasteGenerateBtn = document.getElementById('paste-generate-btn');
const promptModal = document.getElementById('prompt-modal');
const promptInput = document.getElementById('prompt-input');

// 节点颜色调色板
const colorPalette = [
  '#3B82F6',
  '#16A34A',
  '#F97316',
  '#9333EA',
  '#E11D48',
  '#0891B2',
];

/**
 * 根据节点深度获取颜色
 */
function getNodeColor(node) {
  if (node.depth === 0) return '#374151';
  const index = (node.depth - 1) % colorPalette.length;
  return colorPalette[index];
}

/**
 * 等待核心库加载完成
 */
function waitForLibraries() {
    return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
            if (window.markmap) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('核心库加载超时，请检查网络连接或刷新页面。'));
        }, 10000);
    });
}

/**
 * 初始化应用程序
 */
async function init() {
    try {
        // 初始化DOM元素引用
        editorPanel = document.querySelector('.editor-panel');
        topicInput = document.getElementById('topic-input');
        contentDisplay = document.getElementById('content-display');
        showOriginalBtn = document.getElementById('show-original-btn');
        showMarkdownBtn = document.getElementById('show-markdown-btn');
        themeSelect = document.getElementById('theme-select');
        modeToggle = document.getElementById('mode-toggle');
        
        await waitForLibraries();
        const { Transformer, Markmap } = window.markmap;
        transformer = new Transformer();
        const svg = document.querySelector('#mindmap');
        
        // 创建Markmap实例
        mm = Markmap.create(svg, { 
            duration: 500, 
            nodeMinHeight: 16, 
            spacingVertical: 5, 
            spacingHorizontal: 80, 
            autoFit: true, 
            fitRatio: 0.95, 
            color: getNodeColor,
        });
        
        setupNodeInteraction();

        // 事件监听器设置
        document.getElementById('lang-switcher').addEventListener('click', (e) => {
            if (e.target.matches('.lang-btn')) {
                const lang = e.target.dataset.lang;
                setLanguage(lang);
            }
        });

        document.getElementById('api-url').addEventListener('blur', autoCompleteApiUrl);
        
        document.getElementById('model-select').addEventListener('change', handleModelChange);
        ['api-url', 'api-key', 'model-select', 'custom-model-input'].forEach(id => {
            document.getElementById(id).addEventListener('input', saveConfig);
        });

        contentDisplay.addEventListener('input', handleDisplayEdit);
        topicInput.addEventListener('focus', () => switchView('input'));
        
        topicInput.addEventListener('input', handleTopicInput);

        // 全屏事件监听
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
        document.addEventListener('mozfullscreenchange', handleFullScreenChange);
        document.addEventListener('MSFullscreenChange', handleFullScreenChange);

        // 模态框事件监听
        document.querySelector('#settings-modal .modal-close-btn').addEventListener('click', closeSettingsModal);
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) { closeSettingsModal(); }
        });

        document.getElementById('info-btn').addEventListener('click', openInfoModal);
        document.querySelector('#info-modal .modal-close-btn').addEventListener('click', closeInfoModal);
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) { closeInfoModal(); }
        });
        
        document.getElementById('prompt-settings-btn').addEventListener('click', openPromptModal);
        document.querySelector('#prompt-modal .modal-close-btn').addEventListener('click', closePromptModal);
        promptModal.addEventListener('click', (e) => {
            if (e.target === promptModal) { closePromptModal(); }
        });

        editNodeModal.addEventListener('click', (e) => {
            if (e.target === editNodeModal) { closeEditModal(); }
        });

        versionSlider.addEventListener('input', () => {
            updateVersionCountDisplay();
            saveConfig();
        });
        
        // API密钥可见性切换
        document.getElementById('toggle-api-key-visibility').addEventListener('click', function() {
            const apiKeyInput = document.getElementById('api-key');
            const isPassword = apiKeyInput.type === 'password';
            apiKeyInput.type = isPassword ? 'text' : 'password';
            this.textContent = isPassword ? '🙈' : '👁️';
        });

        // 编辑器面板折叠功能
        document.getElementById('fold-btn').addEventListener('click', toggleEditorPanel);

        // 主题切换功能
        themeSelect.addEventListener('change', handleThemeChange);

        // 日/夜模式切换功能
        modeToggle.addEventListener('click', toggleDayNightMode);

        // 加载配置和初始化
        loadConfig();

        // 加载编辑器面板折叠状态
        const savedFoldState = localStorage.getItem('editorPanelFolded');
        if (savedFoldState === 'true') {
            editorPanel.classList.add('folded');
        }

        // 加载保存的主题
        const savedTheme = localStorage.getItem('ai-mindmap-theme') || 'default';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);

        // 加载日/夜模式设置
        const savedMode = localStorage.getItem('ai-mindmap-mode');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedMode === 'night' || (!savedMode && systemPrefersDark)) {
            document.body.classList.add('night-mode');
        }

        const savedLang = localStorage.getItem('ai-mindmap-language');
        const browserLang = navigator.language.split('-')[0];
        const initialLang = savedLang || (['zh', 'en'].includes(browserLang) ? browserLang : 'zh');
        setLanguage(initialLang);

        const apiUrl = document.getElementById('api-url').value.trim();
        const apiKey = document.getElementById('api-key').value.trim();
        if (apiUrl && apiKey) {
            queryAvailableModels(true);
        }

        handleModelChange();
        clearContent();
        updateVersionCountDisplay();

    } catch (error) {
        console.error('初始化失败:', error);
        alert(error.message);
    }
}

/**
 * 更新思维导图显示
 */
function updateMarkmap(markdown) {
    if (!mm || !transformer) return;
    try {
        const { root } = transformer.transform(markdown);
        mm.setData(root);
    } catch (error) { console.error('渲染Markmap失败:', error); }
    updateAllButtonStates();
}

/**
 * 防抖更新思维导图
 */
function debounceUpdate(markdown) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { updateMarkmap(markdown); mm.fit(); }, 300);
}

/**
 * 启动计时器
 */
function startTimer(displayElement) {
    startTime = Date.now();
    displayElement.textContent = '0.0s';
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        displayElement.textContent = `${elapsedSeconds.toFixed(1)}s`;
    }, 100);
}

/**
 * 停止计时器
 */
function stopTimer() { clearInterval(timerInterval); }

/**
 * 切换全屏模式
 */
function toggleFullScreen() {
    const mindmapPanel = document.querySelector('.mindmap-panel');
    const isFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (!isFullScreen) {
        if (mindmapPanel.requestFullscreen) { mindmapPanel.requestFullscreen(); }
        else if (mindmapPanel.mozRequestFullScreen) { mindmapPanel.mozRequestFullScreen(); }
        else if (mindmapPanel.webkitRequestFullscreen) { mindmapPanel.webkitRequestFullscreen(); }
        else if (mindmapPanel.msRequestFullscreen) { mindmapPanel.msRequestFullscreen(); }
    } else {
        if (document.exitFullscreen) { document.exitFullscreen(); }
        else if (document.mozCancelFullScreen) { document.mozCancelFullScreen(); }
        else if (document.webkitExitFullscreen) { document.webkitExitFullscreen(); }
        else if (document.msExitFullscreen) { document.msExitFullscreen(); }
    }
}

/**
 * 处理全屏状态变化
 */
function handleFullScreenChange() {
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const isFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    
    fullscreenBtn.textContent = isFullScreen ? T('js_exit_fullscreen') : T('js_fullscreen');

    if (mm) {
        setTimeout(() => { mm.fit(); }, 200);
    }
}

/**
 * 全局键盘事件处理
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (!editNodeModal.classList.contains('hidden')) {
             e.preventDefault();
             closeEditModal();
        } else {
             removeContextMenu();
        }
        return;
    }

    if (!editNodeModal.classList.contains('hidden')) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
             e.preventDefault();
             saveNodeEdit();
        }
        return;
    }

    if (e.key === 'F11') {
        e.preventDefault();
        toggleFullScreen();
    }

    const activeEl = document.activeElement;
    const isEditing = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

    if (!isEditing && aiResults.length > 1) {
        let newIndex;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            newIndex = (activeResultIndex + 1) % aiResults.length;
            switchToResult(newIndex);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            newIndex = (activeResultIndex - 1 + aiResults.length) % aiResults.length;
            switchToResult(newIndex);
        }
    }

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 's') {
            e.preventDefault();
            exportPNG();
        }
        if (e.key === 'Enter') {
            if (document.activeElement === topicInput && topicInput.value.trim()){
                 e.preventDefault();
                 generateWithAI();
            }
        }
    }
});

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', init);