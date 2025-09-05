// 工具函数模块
// 提供性能优化、错误处理和通用工具函数

// 防抖函数
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 安全获取元素
function getElementSafe(selector, context = document) {
    try {
        const element = context.querySelector(selector);
        if (!element) {
            console.warn(`Element not found: ${selector}`);
            return null;
        }
        return element;
    } catch (error) {
        console.error(`Error getting element ${selector}:`, error);
        return null;
    }
}

// 深度克隆对象
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const cloned = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            cloned[key] = deepClone(obj[key]);
        }
    }
    return cloned;
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成唯一ID
function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 安全解析JSON
function safeJsonParse(str, defaultValue = null) {
    try {
        return JSON.parse(str);
    } catch {
        return defaultValue;
    }
}

// 检查网络状态
function checkNetworkStatus() {
    return navigator.onLine;
}

// 添加网络状态监听
function addNetworkListener(callback) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
}

// 性能测量工具
const perf = {
    marks: new Map(),
    
    start(name) {
        this.marks.set(name, performance.now());
    },
    
    end(name) {
        const startTime = this.marks.get(name);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.marks.delete(name);
            return duration;
        }
        return null;
    },
    
    measure(name) {
        const duration = this.end(name);
        if (duration !== null) {
            console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        }
        return duration;
    }
};

// 导出工具函数
export {
    debounce,
    throttle,
    getElementSafe,
    deepClone,
    formatFileSize,
    generateId,
    safeJsonParse,
    checkNetworkStatus,
    addNetworkListener,
    perf
};