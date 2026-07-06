// ========== 场景管理器 ==========
// 统一管理主界面 → 前情提要 → 游戏场景 的切换

export const SceneManager = {
    /**
     * 切换到指定场景（带淡出过渡）
     * @param {string} fromId - 当前场景元素 id
     * @param {string|null} toId - 目标场景元素 id（可为 null）
     * @param {function} onShow - 目标场景显示后的回调
     */
    transitionTo(fromId, toId, onShow) {
        const fromEl = document.getElementById(fromId);
        const toEl = toId ? document.getElementById(toId) : null;

        if (!fromEl) {
            console.warn('SceneManager.transitionTo: 找不到来源元素:', fromId);
            // 即使找不到来源，也尝试显示目标并执行回调
            if (toEl) {
                toEl.style.display = 'flex';
            }
            if (typeof onShow === 'function') {
                onShow();
            }
            return;
        }

        console.log('SceneManager: 切换场景', fromId, '→', toId || '(无)');

        fromEl.classList.add('fade-transition');
        setTimeout(() => {
            fromEl.style.display = 'none';
            fromEl.classList.remove('fade-transition');
            if (toEl) {
                toEl.style.display = 'flex';
            }
            if (typeof onShow === 'function') {
                onShow();
            }
        }, 600);
    },

    /**
     * 显示某个场景元素
     */
    show(id, display = 'flex') {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = display;
            console.log('SceneManager: 显示', id);
        } else {
            console.warn('SceneManager.show: 找不到元素:', id);
        }
    },

    /**
     * 隐藏某个场景元素
     */
    hide(id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
        }
    }
};
