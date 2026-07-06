// ========== 主界面逻辑 ==========

import { SceneManager } from '../common/sceneManager.js';

export const MainMenu = {
    /**
     * 初始化主界面，使用事件委托统一绑定所有按钮事件
     */
    init() {
        const menuEl = document.getElementById('main-menu');
        if (!menuEl) {
            console.error('MainMenu.init: 找不到 #main-menu 元素');
            return;
        }

        // 统一使用事件委托处理所有菜单按钮点击
        menuEl.addEventListener('click', (e) => {
            // 向上查找最近的 .menu-btn（支持点击按钮内部元素）
            const btn = e.target.closest('.menu-btn');
            if (!btn) return;

            e.preventDefault();
            const text = btn.textContent.trim();

            switch (text) {
                case '开始游戏':
                    this.onStart();
                    break;
                case '读取存档':
                    this.onLoad();
                    break;
                case '设置选项':
                    this.onSettings();
                    break;
                case '关于我们':
                    this.showAbout();
                    break;
                default:
                    console.warn('MainMenu: 未处理的按钮:', text);
            }
        });

        console.log('MainMenu: 主界面按钮事件绑定完成');
    },

    /**
     * 开始游戏：主界面 → 前情提要
     */
    onStart() {
        console.log('MainMenu: 开始游戏按钮被点击');
        SceneManager.transitionTo('main-menu', 'intro-screen', () => {
            document.dispatchEvent(new CustomEvent('startIntro'));
        });
    },

    /**
     * 读取存档
     */
    onLoad() {
        // Toast 由 common/toast.js 提供，此处直接使用 DOM 创建提示
        this._showToast('暂无存档');
    },

    /**
     * 打开设置面板
     */
    onSettings() {
        console.log('MainMenu: 打开设置');
        document.dispatchEvent(new CustomEvent('openSettings', {
            detail: { source: 'main-menu' }
        }));
    },

    /**
     * 关于我们弹窗
     */
    showAbout() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.7); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        `;
        overlay.innerHTML = `
            <div style="
                background: #f5f0e8; border: 4px solid #8b5a2b; border-radius: 16px;
                padding: 40px 56px; text-align: center; max-width: 480px;
                font-family: 'Microsoft YaHei', sans-serif; color: #2c1810;
            ">
                <h2 style="color: #8b4513; letter-spacing: 6px; margin-bottom: 24px;">匠灵：守护手艺传承</h2>
                <p style="line-height: 2; margin: 8px 0;">一款以浙江非遗文化为题材的</p>
                <p style="line-height: 2; margin: 8px 0;">国风叙事解谜游戏</p>
                <p style="line-height: 2; margin: 16px 0;">开发团队：匠灵工作室</p>
                <p style="line-height: 2; margin: 8px 0; color: #888;">© 2026 All Rights Reserved</p>
                <button style="
                    margin-top: 28px; padding: 10px 40px; background: #8b4513; color: #fff;
                    border: none; border-radius: 8px; font-size: 16px; cursor: pointer;
                    letter-spacing: 3px;
                ">关闭</button>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.tagName === 'BUTTON') {
                overlay.remove();
            }
        });
        document.body.appendChild(overlay);
    },

    /**
     * 简易 Toast 提示
     */
    _showToast(message) {
        let toast = document.querySelector('.toast-message');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-message';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.style.opacity = '1';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
        }, 2200);
    }
};
