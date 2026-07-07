// ========== 主界面逻辑 ==========

import { SceneManager } from '../common/sceneManager.js';

export const MainMenu = {
    init() {
        const menuEl = document.getElementById('main-menu');
        if (!menuEl) {
            console.error('MainMenu.init: 找不到 #main-menu 元素');
            return;
        }

        menuEl.addEventListener('click', (e) => {
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
            }
        });

        console.log('MainMenu: 主界面按钮事件绑定完成');
    },

    /**
     * 开始游戏：直接弹出存档选择 → 选槽 → 前情提要 → 游戏
     */
    onStart() {
        console.log('MainMenu: 开始游戏 → 打开存档选择');
        document.dispatchEvent(new CustomEvent('showSaveSlots', {
            detail: { mode: 'new-game' }
        }));
    },

    /**
     * 读取存档：打开存档选择（读档模式 → 直接进游戏，跳过前情提要）
     */
    onLoad() {
        console.log('MainMenu: 读取存档');
        document.dispatchEvent(new CustomEvent('showSaveSlots', {
            detail: { mode: 'load' }
        }));
    },

    onSettings() {
        document.dispatchEvent(new CustomEvent('openSettings', {
            detail: { source: 'main-menu' }
        }));
    },

    showAbout() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.7); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        `;
        overlay.innerHTML = `
            <div style="background:#f5f0e8;border:4px solid #8b5a2b;border-radius:16px;padding:40px 56px;text-align:center;max-width:480px;font-family:'Microsoft YaHei',sans-serif;color:#2c1810;">
                <h2 style="color:#8b4513;letter-spacing:6px;margin-bottom:24px;">匠灵：守护手艺传承</h2>
                <p style="line-height:2;">一款以浙江非遗文化为题材的</p>
                <p style="line-height:2;">国风叙事解谜游戏</p>
                <p style="line-height:2;margin-top:16px;">开发团队：匠灵工作室</p>
                <p style="line-height:2;color:#888;">© 2026 All Rights Reserved</p>
                <button style="margin-top:28px;padding:10px 40px;background:#8b4513;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;letter-spacing:3px;">关闭</button>
            </div>
        `;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.tagName === 'BUTTON') overlay.remove();
        });
        document.body.appendChild(overlay);
    }
};
