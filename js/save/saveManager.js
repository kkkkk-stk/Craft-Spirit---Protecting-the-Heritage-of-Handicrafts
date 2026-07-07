// ========== 存档管理器 ==========
// 管理存档槽位选择、保存、读取、删除（基于 localStorage）

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
    deleteBtn: null,
    _mode: 'new-game',
    _deleteMode: false,
    _slots: [],

    init() {
        this.overlay = document.getElementById('save-slots-overlay');
        this.slotList = document.getElementById('save-slots-list');
        this.deleteBtn = document.getElementById('save-slots-delete');

        if (!this.overlay) {
            console.error('SaveManager: 找不到 #save-slots-overlay');
            return;
        }

        this._loadFromStorage();

        // 返回按钮
        const backBtn = document.getElementById('save-slots-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.close());
        }

        // 删除存档按钮
        if (this.deleteBtn) {
            this.deleteBtn.addEventListener('click', () => this._toggleDeleteMode());
        }

        // 点击遮罩关闭
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
        this._deleteMode = false;
        this._renderSlots();

        const titleEl = document.getElementById('save-slots-title');
        if (titleEl) {
            titleEl.textContent = mode === 'new-game' ? '选 择 存 档' : '读 取 存 档';
        }

        // 删除按钮仅读档模式显示
        if (this.deleteBtn) {
            this.deleteBtn.style.display = mode === 'load' ? 'inline-block' : 'none';
            this.deleteBtn.classList.remove('active');
            this.deleteBtn.textContent = '删除存档';
        }

        this.overlay.style.display = 'flex';
        console.log('SaveManager: 显示存档界面，模式:', mode);
    },

    close() {
        this._deleteMode = false;
        this.overlay.style.display = 'none';

        if (this._mode === 'new-game') {
            SceneManager.show('main-menu', 'flex');
        }

        console.log('SaveManager: 关闭存档界面');
    },

    /**
     * 切换删除模式
     */
    _toggleDeleteMode() {
        this._deleteMode = !this._deleteMode;

        if (this.deleteBtn) {
            if (this._deleteMode) {
                this.deleteBtn.classList.add('active');
                this.deleteBtn.textContent = '取消删除';
            } else {
                this.deleteBtn.classList.remove('active');
                this.deleteBtn.textContent = '删除存档';
            }
        }

        this._renderSlots();
        console.log('SaveManager: 删除模式:', this._deleteMode ? '开' : '关');
    },

    _renderSlots() {
        if (!this.slotList) return;
        this.slotList.innerHTML = '';

        this._slots.forEach((slot, index) => {
            // 包裹容器：数字标号在存档槽外面
            const wrapper = document.createElement('div');
            wrapper.className = 'save-slot-wrapper';

            const el = document.createElement('div');
            el.className = 'save-slot';
            if (slot.isEmpty) {
                el.classList.add('empty');
            }
            if (this._deleteMode && !slot.isEmpty) {
                el.classList.add('delete-mode');
            }

            // 删除模式下的红叉（仅非空槽位）
            if (this._deleteMode && !slot.isEmpty) {
                const deleteX = document.createElement('span');
                deleteX.className = 'save-slot-delete-x';
                deleteX.textContent = '✕';
                deleteX.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._confirmDelete(index);
                });
                el.appendChild(deleteX);
            }

            // 槽位序号（在存档槽外面）
            const idxSpan = document.createElement('span');
            idxSpan.className = 'save-slot-index';
            idxSpan.textContent = index + 1;

            // 槽位信息
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
            el.appendChild(infoDiv);

            // 点击事件（删除模式下不触发选择）
            if (!this._deleteMode || slot.isEmpty) {
                el.addEventListener('click', () => this._onSlotClick(index));
            }

            wrapper.appendChild(idxSpan);
            wrapper.appendChild(el);
            this.slotList.appendChild(wrapper);
        });
    },

    _onSlotClick(index) {
        if (this._deleteMode) return;
        const slot = this._slots[index];

        if (this._mode === 'new-game') {
            if (!slot.isEmpty) {
                const confirmed = confirm(
                    `「${slot.name}」已有存档（${this._formatTime(slot.timestamp)}），\n是否覆盖？`
                );
                if (!confirmed) return;
            }
            this._startNewGame(index);
        } else {
            if (slot.isEmpty) {
                this._showToast('该存档为空');
                return;
            }
            this._loadGame(index);
        }
    },

    /**
     * 确认删除存档
     */
    _confirmDelete(index) {
        const slot = this._slots[index];
        const confirmed = confirm(
            `确认删除「${slot.name}」？\n\n` +
            `保存时间：${this._formatTime(slot.timestamp)}\n` +
            `所在章节：${slot.chapter || '未知'}\n\n` +
            `此操作不可撤销！`
        );
        if (!confirmed) return;

        // 删除槽位数据
        this._slots[index] = createEmptySlot(index);
        this._saveToStorage();
        this._showToast(`「存档${['一', '二', '三'][index]}」已删除`);

        // 如果删除的是当前活跃槽位，清除活跃标记
        if (gameState.activeSlotIndex === index) {
            gameState.activeSlotIndex = -1;
        }

        // 如果所有存档都被删了，自动退出删除模式
        if (this._filledCount() === 0 && this._deleteMode) {
            this._deleteMode = false;
            if (this.deleteBtn) {
                this.deleteBtn.classList.remove('active');
                this.deleteBtn.textContent = '删除存档';
            }
        }

        this._renderSlots();
        console.log('SaveManager: 已删除槽位', index + 1);
    },

    // ==================== 业务逻辑 ====================

    _startNewGame(slotIndex) {
        console.log('SaveManager: 新游戏 → 槽位', slotIndex + 1);

        gameState.activeSlotIndex = slotIndex;
        gameState.playerPosPercent = 15;
        gameState.playerDirection = 'right';
        gameState.playerMoving = false;
        gameState.hasMap = false;
        gameState.tutorialShown = false;
        gameState.dialogueActive = false;
        gameState.currentDialogueIndex = 0;
        gameState.currentChapter = 'prologue';
        gameState.isPaused = false;

        this.close();
        SceneManager.hide('main-menu');
        SceneManager.show('intro-screen', 'flex');
        document.dispatchEvent(new CustomEvent('startIntro'));
    },

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

    _loadGame(slotIndex) {
        const slot = this._slots[slotIndex];
        if (slot.isEmpty || !slot.state) return;

        console.log('SaveManager: 读档 → 槽位', slotIndex + 1);

        gameState.activeSlotIndex = slotIndex;
        gameState.loadSnapshot(slot.state);

        this.close();
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
