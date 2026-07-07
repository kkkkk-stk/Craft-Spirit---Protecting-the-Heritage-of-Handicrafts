// ========== 存档管理器 ==========
// 管理存档槽位选择、保存、读取（基于 localStorage）

import { gameState } from '../common/gameState.js';
import { SceneManager } from '../common/sceneManager.js';

const STORAGE_KEY = 'craft_spirit_saves';
const MAX_SLOTS = 3;

function createEmptySlot(index) {
    return {
        isEmpty: true,
        name: `存档${['一', '二', '三'][index]}`,
        timestamp: null,
        chapter: null,
        state: null
    };
}

export const SaveManager = {
    overlay: null,
    slotList: null,
    _mode: 'new-game',
    _slots: [],

    init() {
        this.overlay = document.getElementById('save-slots-overlay');
        this.slotList = document.getElementById('save-slots-list');

        if (!this.overlay) {
            console.error('SaveManager: 找不到 #save-slots-overlay');
            return;
        }

        this._loadFromStorage();

        const backBtn = document.getElementById('save-slots-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.close());
        }

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.addEventListener('showSaveSlots', (e) => {
            this.show(e.detail?.mode || 'new-game');
        });

        console.log('SaveManager: 初始化完成，已加载', this._filledCount(), '个存档');
    },

    // ==================== 存储层 ====================

    _loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const data = JSON.parse(raw);
                this._slots = data.slots || [];
            }
        } catch (err) {
            console.warn('SaveManager: 读取存档失败', err);
        }
        while (this._slots.length < MAX_SLOTS) {
            this._slots.push(createEmptySlot(this._slots.length));
        }
    },

    _saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, slots: this._slots }));
        } catch (err) {
            console.error('SaveManager: 保存失败', err);
        }
    },

    _filledCount() {
        return this._slots.filter(s => !s.isEmpty).length;
    },

    // ==================== UI 层 ====================

    show(mode = 'new-game') {
        this._mode = mode;
        this._renderSlots();

        const titleEl = document.getElementById('save-slots-title');
        if (titleEl) {
            titleEl.textContent = mode === 'new-game' ? '选 择 存 档' : '读 取 存 档';
        }

        this.overlay.style.display = 'flex';
        console.log('SaveManager: 显示存档界面，模式:', mode);
    },

    close() {
        this.overlay.style.display = 'none';

        // 新游戏模式下返回 → 回到主菜单
        if (this._mode === 'new-game') {
            SceneManager.show('main-menu', 'flex');
        }

        console.log('SaveManager: 关闭存档界面');
    },

    _renderSlots() {
        if (!this.slotList) return;
        this.slotList.innerHTML = '';

        this._slots.forEach((slot, index) => {
            const el = document.createElement('div');
            el.className = 'save-slot' + (slot.isEmpty ? ' empty' : '');

            const idxSpan = document.createElement('span');
            idxSpan.className = 'save-slot-index';
            idxSpan.textContent = index + 1;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'save-slot-info';

            const nameDiv = document.createElement('div');
            nameDiv.className = 'save-slot-name';
            nameDiv.textContent = slot.name;

            const metaDiv = document.createElement('div');
            metaDiv.className = 'save-slot-meta';

            if (slot.isEmpty) {
                const emptyHint = document.createElement('span');
                emptyHint.textContent = '— 空 —';
                metaDiv.appendChild(emptyHint);
            } else {
                const timeSpan = document.createElement('span');
                timeSpan.textContent = '🕐 ' + this._formatTime(slot.timestamp);
                metaDiv.appendChild(timeSpan);

                const chapterSpan = document.createElement('span');
                chapterSpan.textContent = '📍 ' + (slot.chapter || '未知');
                metaDiv.appendChild(chapterSpan);
            }

            infoDiv.appendChild(nameDiv);
            infoDiv.appendChild(metaDiv);
            el.appendChild(idxSpan);
            el.appendChild(infoDiv);
            el.addEventListener('click', () => this._onSlotClick(index));
            this.slotList.appendChild(el);
        });
    },

    _onSlotClick(index) {
        const slot = this._slots[index];

        if (this._mode === 'new-game') {
            // 新游戏：确认覆盖已有存档
            if (!slot.isEmpty) {
                const confirmed = confirm(
                    `「${slot.name}」已有存档（${this._formatTime(slot.timestamp)}），\n是否覆盖？`
                );
                if (!confirmed) return;
            }
            this._startNewGame(index);
        } else {
            // 读档：只能选非空槽位，直接进游戏
            if (slot.isEmpty) {
                this._showToast('该存档为空');
                return;
            }
            this._loadGame(index);
        }
    },

    // ==================== 业务逻辑 ====================

    /**
     * 新游戏 —— 选槽 → 前情提要 → 游戏
     */
    _startNewGame(slotIndex) {
        console.log('SaveManager: 新游戏 → 槽位', slotIndex + 1);

        gameState.activeSlotIndex = slotIndex;
        gameState.playerPosPercent = 15;
        gameState.hasMap = false;
        gameState.tutorialShown = false;
        gameState.dialogueActive = false;
        gameState.currentDialogueIndex = 0;
        gameState.currentChapter = 'prologue';
        gameState.isPaused = false;

        this.close();

        // 隐藏主菜单，播放前情提要
        SceneManager.hide('main-menu');
        SceneManager.show('intro-screen', 'flex');

        // 通知 intro 模块开始
        document.dispatchEvent(new CustomEvent('startIntro'));
    },

    /**
     * 保存游戏
     */
    saveGame() {
        const idx = gameState.activeSlotIndex;
        if (idx < 0 || idx >= MAX_SLOTS) {
            console.warn('SaveManager: 无活跃存档槽位');
            return;
        }

        this._slots[idx] = {
            isEmpty: false,
            name: `存档${['一', '二', '三'][idx]}`,
            timestamp: new Date().toISOString(),
            chapter: gameState.getChapterName(),
            state: gameState.getSaveSnapshot()
        };

        this._saveToStorage();
        this._showToast(`已保存到「存档${['一', '二', '三'][idx]}」`);
        console.log('SaveManager: 保存到槽位', idx + 1);
    },

    /**
     * 读档 —— 直接进游戏，跳过前情提要
     */
    _loadGame(slotIndex) {
        const slot = this._slots[slotIndex];
        if (slot.isEmpty || !slot.state) return;

        console.log('SaveManager: 读档 → 槽位', slotIndex + 1);

        gameState.activeSlotIndex = slotIndex;
        gameState.loadSnapshot(slot.state);

        this.close();

        // 隐藏主菜单和前情提要，直接显示游戏
        SceneManager.hide('main-menu');
        SceneManager.hide('intro-screen');
        SceneManager.show('game-screen', 'block');
        SceneManager.show('ui-hud', 'flex');

        document.dispatchEvent(new CustomEvent('gameLoaded', {
            detail: { slotIndex: slotIndex }
        }));

        this._showToast(`已读取「存档${['一', '二', '三'][slotIndex]}」`);
    },

    // ==================== 工具 ====================

    _formatTime(isoString) {
        if (!isoString) return '—';
        try {
            const d = new Date(isoString);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch { return '—'; }
    },

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
        this._toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
    }
};
