// ========== 场景管理器 ==========
// 统一管理主界面 → 前情提要 → 游戏场景 的切换

export const SceneManager = {
    /**
     * 切换到指定场景（带淡出过渡）
     * @param {string} fromId - 当前场景元素 id
     * @param {string} toId - 目标场景元素 id
     * @param {function} onShow - 目标场景显示后的回调
     */
    transitionTo(fromId, toId, onShow) {
        const fromEl = document.getElementById(fromId);
        const toEl = document.getElementById(toId);

        if (!fromEl) return;

        fromEl.classList.add('fade-transition');
        setTimeout(() => {
            fromEl.style.display = 'none';
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
        if (el) el.style.display = display;
    },

    /**
     * 隐藏某个场景元素
     */
    hide(id) {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    }
};
