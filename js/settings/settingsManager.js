// ========== 设置管理器 ==========
// 管理设置面板（主菜单 → 按键绑定等子功能）

import { gameState } from '../common/gameState.js';

// 默认按键绑定（用于恢复默认）
const DEFAULT_KEY_BINDINGS = {
    moveLeft:  { keys: ['arrowleft', 'a'], label: '向左移动' },
    moveRight: { keys: ['arrowright', 'd'], label: '向右移动' },
    interact:  { keys: ['e'],             label: '交互' },
        openMap:   { keys: ['m'],             label: '打开地图' },
        openBackpack: { keys: ['b'],          label: '打开背包' },
        pause:     { keys: ['escape'],        label: '暂停' }
};

export const SettingsManager = {
    overlay: null,
    menuView: null,       // 设置主菜单
    keybindingView: null, // 按键绑定子界面
    keybindingList: null,
    _listeningAction: null,
    _listeningBtn: null,

    /**
     * 初始化设置面板
     */
    init() {
        this.overlay = document.getElementById('settings-overlay');
        this.menuView = document.getElementById('settings-menu');
        this.keybindingView = document.getElementById('settings-keybinding');
        this.keybindingList = document.getElementById('keybinding-list');

        if (!this.overlay) {
            console.error('SettingsManager: 找不到 #settings-overlay 元素');
            return;
        }

        // 主菜单按钮委托 —— 处理子功能入口
        if (this.menuView) {
            this.menuView.addEventListener('click', (e) => {
                const btn = e.target.closest('.settings-menu-btn');
                if (!btn || btn.classList.contains('disabled')) return;

                const target = btn.dataset.target;
                if (target === 'keybinding') {
                    this._showKeybinding();
                }
            });
        }

        // 按键绑定子界面 —— 返回按钮
        const backBtn = document.getElementById('settings-back');
        if (backBtn) {
            backBtn.addEventListener('click', () => this._showMenu());
        }

        // 关闭按钮
        const closeBtn = document.getElementById('settings-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // 恢复默认按钮
        const resetBtn = document.getElementById('settings-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetDefaults());
        }

        // 点击遮罩外部区域关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // 全局键盘监听 —— 用于按键绑定修改
        document.addEventListener('keydown', (e) => this._onGlobalKeydown(e));

        console.log('SettingsManager: 初始化完成');
    },

    /**
     * 打开设置面板（默认显示主菜单）
     * @param {string} source - 来源：'main-menu' | 'pause'
     */
    open(source = 'main-menu') {
        gameState.settingsSource = source;
        this._listeningAction = null;
        this._listeningBtn = null;
        this._showMenu();
        this.overlay.style.display = 'flex';
        console.log('SettingsManager: 打开设置面板，来源:', source);
    },

    /**
     * 关闭设置面板
     */
    close() {
        this._cancelListening();
        this.overlay.style.display = 'none';

        const source = gameState.settingsSource;
        gameState.settingsSource = null;

        document.dispatchEvent(new CustomEvent('settingsClosed', {
            detail: { source: source }
        }));

        console.log('SettingsManager: 关闭设置面板，返回:', source);
    },

    /**
     * 显示设置主菜单
     */
    _showMenu() {
        this._cancelListening();
        if (this.menuView) this.menuView.style.display = 'block';
        if (this.keybindingView) this.keybindingView.style.display = 'none';
    },

    /**
     * 显示按键绑定子界面
     */
    _showKeybinding() {
        if (this.menuView) this.menuView.style.display = 'none';
        if (this.keybindingView) this.keybindingView.style.display = 'block';
        this._renderKeybindings();
    },

    /**
     * 渲染按键绑定列表
     */
    _renderKeybindings() {
        if (!this.keybindingList) return;

        this.keybindingList.innerHTML = '';

        Object.entries(gameState.keyBindings).forEach(([action, binding]) => {
            const row = document.createElement('div');
            row.className = 'keybinding-row';

            const label = document.createElement('span');
            label.className = 'keybinding-label';
            label.textContent = binding.label;

            const valueWrap = document.createElement('div');
            valueWrap.className = 'keybinding-value';

            const keyEl = document.createElement('span');
            keyEl.className = 'keybinding-key';
            keyEl.id = `keybinding-key-${action}`;
            keyEl.textContent = this._formatKeys(binding.keys);

            const rebindBtn = document.createElement('button');
            rebindBtn.className = 'keybinding-rebind';
            rebindBtn.id = `keybinding-rebind-${action}`;
            rebindBtn.textContent = '修改';
            rebindBtn.addEventListener('click', () => this._startListening(action, rebindBtn, keyEl));

            valueWrap.appendChild(keyEl);
            valueWrap.appendChild(rebindBtn);
            row.appendChild(label);
            row.appendChild(valueWrap);
            this.keybindingList.appendChild(row);
        });
    },

    /**
     * 格式化按键显示文本
     */
    _formatKeys(keys) {
        const map = {
            'arrowleft': '←', 'arrowright': '→',
            'arrowup': '↑', 'arrowdown': '↓',
            'escape': 'Esc', 'a': 'A', 'd': 'D',
            'e': 'E', 'm': 'M', 'w': 'W', 's': 'S',
            ' ': '空格'
        };
        return keys.map(k => map[k] || k.toUpperCase()).join(' / ');
    },

    /**
     * 开始监听按键绑定
     */
    _startListening(action, btn, keyEl) {
        this._cancelListening();

        this._listeningAction = action;
        this._listeningBtn = btn;
        btn.textContent = '...';
        btn.classList.add('listening');
        keyEl.classList.add('listening');
        keyEl.textContent = '请按键...';
    },

    /**
     * 取消监听
     */
    _cancelListening() {
        if (this._listeningBtn) {
            this._listeningBtn.classList.remove('listening');
            this._listeningBtn.textContent = '修改';
        }
        if (this._listeningAction) {
            const keyEl = document.getElementById(`keybinding-key-${this._listeningAction}`);
            if (keyEl) {
                keyEl.classList.remove('listening');
                const binding = gameState.keyBindings[this._listeningAction];
                if (binding) {
                    keyEl.textContent = this._formatKeys(binding.keys);
                }
            }
        }
        this._listeningAction = null;
        this._listeningBtn = null;
    },

    /**
     * 全局键盘事件 —— 用于捕获按键绑定
     */
    _onGlobalKeydown(e) {
        if (!this._listeningAction) return;

        e.preventDefault();
        e.stopPropagation();

        const key = e.key.toLowerCase();
        if (!key || key === 'undefined') return;

        // 更新绑定
        gameState.keyBindings[this._listeningAction].keys = [key];

        // 更新 UI
        const keyEl = document.getElementById(`keybinding-key-${this._listeningAction}`);
        if (keyEl) {
            keyEl.classList.remove('listening');
            keyEl.textContent = this._formatKeys([key]);
        }

        if (this._listeningBtn) {
            this._listeningBtn.classList.remove('listening');
            this._listeningBtn.textContent = '修改';
        }

        console.log('SettingsManager: 按键绑定已更新', this._listeningAction, '→', key);

        document.dispatchEvent(new CustomEvent('keybindingsChanged', {
            detail: { action: this._listeningAction, key: key }
        }));

        this._listeningAction = null;
        this._listeningBtn = null;
    },

    /**
     * 恢复默认按键绑定
     */
    resetDefaults() {
        Object.entries(DEFAULT_KEY_BINDINGS).forEach(([action, binding]) => {
            gameState.keyBindings[action] = {
                keys: [...binding.keys],
                label: binding.label
            };
        });
        this._renderKeybindings();
        document.dispatchEvent(new CustomEvent('keybindingsChanged'));
        console.log('SettingsManager: 已恢复默认按键绑定');
    }
};
