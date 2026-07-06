// ========== Toast 提示组件 ==========

let toastTimeout = null;

export const Toast = {
    /**
     * 显示一条提示消息
     * @param {string} message - 提示文本
     * @param {number} duration - 持续时间（毫秒）
     */
    show(message, duration = 2200) {
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
        }, duration);
    }
};
