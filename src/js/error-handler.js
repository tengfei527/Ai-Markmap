// 错误处理模块
// 统一管理应用程序错误处理和恢复机制

class ErrorHandler {
    constructor() {
        this.errors = [];
        this.maxErrors = 100;
        this.setupGlobalHandlers();
    }

    // 设置全局错误处理器
    setupGlobalHandlers() {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'unhandledrejection');
            event.preventDefault();
        });

        // 捕获全局JavaScript错误
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, 'global');
            event.preventDefault();
        });
    }

    // 处理错误
    handleError(error, type = 'manual', context = {}) {
        const errorEntry = {
            id: Date.now() + Math.random().toString(36).substr(2),
            timestamp: new Date().toISOString(),
            type,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context,
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.errors.push(errorEntry);
        
        // 保持错误列表大小
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        this.logError(errorEntry);
        this.showUserFriendlyError(errorEntry);

        return errorEntry;
    }

    // 记录错误到控制台
    logError(errorEntry) {
        console.error(`[${errorEntry.type}] ${errorEntry.message}`, {
            context: errorEntry.context,
            stack: errorEntry.stack
        });
    }

    // 显示用户友好的错误信息
    showUserFriendlyError(errorEntry) {
        // 根据错误类型显示不同的用户提示
        let userMessage;
        
        switch (errorEntry.type) {
            case 'network':
                userMessage = T('error_network');
                break;
            case 'api':
                userMessage = T('error_api');
                break;
            case 'export':
                userMessage = T('error_export');
                break;
            default:
                userMessage = T('error_general');
        }

        // 使用Toast通知而不是alert
        this.showToast(userMessage, 'error');
    }

    // 显示Toast通知
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${message}</span>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 400px;
            animation: toastSlideIn 0.3s ease;
        `;

        document.body.appendChild(toast);

        // 自动消失
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toastSlideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    // 获取错误统计
    getErrorStats() {
        const stats = {
            total: this.errors.length,
            byType: {},
            recent: this.errors.slice(-10)
        };

        this.errors.forEach(error => {
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
        });

        return stats;
    }

    // 清除错误记录
    clearErrors() {
        this.errors = [];
    }

    // 导出错误报告
    exportErrorReport() {
        const report = {
            generatedAt: new Date().toISOString(),
            app: 'AiMarkmap',
            version: '1.0.0',
            errors: this.errors,
            stats: this.getErrorStats()
        };

        return JSON.stringify(report, null, 2);
    }
}

// 创建全局错误处理器实例
const errorHandler = new ErrorHandler();

// 错误类型常量
const ERROR_TYPES = {
    NETWORK: 'network',
    API: 'api',
    VALIDATION: 'validation',
    EXPORT: 'export',
    RENDER: 'render',
    UNKNOWN: 'unknown'
};

// 导出错误处理器
export { errorHandler, ERROR_TYPES };