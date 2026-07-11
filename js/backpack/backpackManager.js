// ========== 背包管理器 ==========
// B 键打开/关闭，左侧物品列表（分页）+ 右侧物品描述

import { gameState } from '../common/gameState.js';
import { getItem } from './itemsData.js';

const ITEMS_PER_PAGE = 8;

export const BackpackManager = {
    overlay: null,
    itemList: null,
    pagination: null,
    detailArea: null,
    _selectedId: null,
    _page: 0,

    init() {
        this.overlay = document.getElementById('backpack-overlay');
        this.itemList = document.getElementById('backpack-item-list');
        this.pagination = document.getElementById('backpack-pagination');
        this.detailArea = document.getElementById('backpack-detail');

        if (!this.overlay) {
            console.error('BackpackManager: 找不到 #backpack-overlay');
            return;
        }

        const closeBtn = document.getElementById('backpack-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        document.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            if (gameState.isPaused || gameState.dialogueActive) return;

            if (gameState.keyBindings.openBackpack.keys.includes(key)) {
                this.toggle();
            }
        });

        document.addEventListener('returnToMenu', () => this.close());

        console.log('BackpackManager: 初始化完成');
    },

    toggle() {
        if (this.overlay.style.display === 'flex') {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        this._selectedId = null;
        this._page = 0;
        this._render();
        this.overlay.style.display = 'flex';
    },

    close() {
        this.overlay.style.display = 'none';
    },

    // ==================== 渲染 ====================

    _render() {
        this._renderItems();
        this._renderPagination();
        this._renderDetail();
    },

    _renderItems() {
        if (!this.itemList) return;

        const total = gameState.inventory.length;
        const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

        // 修正越界页码
        if (this._page >= totalPages) this._page = totalPages - 1;

        const start = this._page * ITEMS_PER_PAGE;
        const pageItems = gameState.inventory.slice(start, start + ITEMS_PER_PAGE);

        this.itemList.innerHTML = '';

        if (pageItems.length === 0) {
            const emptyEl = document.createElement('div');
            emptyEl.className = 'backpack-empty';
            emptyEl.textContent = '背包空空如也';
            this.itemList.appendChild(emptyEl);
            return;
        }

        pageItems.forEach(itemId => {
            const item = getItem(itemId);
            if (!item) return;

            const el = document.createElement('div');
            el.className = 'backpack-item';
            el.dataset.itemId = itemId;

            if (itemId === this._selectedId) {
                el.classList.add('selected');
            }

            const iconWrap = document.createElement('div');
            iconWrap.className = 'backpack-item-icon';
            if (item.img) {
                const img = document.createElement('img');
                img.src = item.img;
                img.alt = item.name;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.style.imageRendering = 'pixelated';
                iconWrap.appendChild(img);
            } else {
                iconWrap.textContent = item.icon;
            }

            const nameEl = document.createElement('span');
            nameEl.className = 'backpack-item-name';
            nameEl.textContent = item.name;

            el.appendChild(iconWrap);
            el.appendChild(nameEl);
            el.addEventListener('click', () => this._selectItem(itemId));
            this.itemList.appendChild(el);
        });
    },

    _renderPagination() {
        if (!this.pagination) return;

        const total = gameState.inventory.length;
        const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

        // 只有 1 页时隐藏分页
        if (totalPages <= 1) {
            this.pagination.style.display = 'none';
            return;
        }
        this.pagination.style.display = 'flex';

        this.pagination.innerHTML = '';

        // 上一页
        const prevBtn = document.createElement('button');
        prevBtn.className = 'backpack-page-btn';
        prevBtn.textContent = '◀';
        prevBtn.disabled = this._page <= 0;
        prevBtn.addEventListener('click', () => {
            if (this._page > 0) {
                this._page--;
                this._renderItems();
                this._renderPagination();
            }
        });

        // 页码信息
        const info = document.createElement('span');
        info.className = 'backpack-page-info';
        info.textContent = `${this._page + 1} / ${totalPages}`;

        // 下一页
        const nextBtn = document.createElement('button');
        nextBtn.className = 'backpack-page-btn';
        nextBtn.textContent = '▶';
        nextBtn.disabled = this._page >= totalPages - 1;
        nextBtn.addEventListener('click', () => {
            if (this._page < totalPages - 1) {
                this._page++;
                this._renderItems();
                this._renderPagination();
            }
        });

        this.pagination.appendChild(prevBtn);
        this.pagination.appendChild(info);
        this.pagination.appendChild(nextBtn);
    },

    _selectItem(itemId) {
        this._selectedId = itemId;
        this._renderItems();
        this._renderDetail();
    },

    _renderDetail() {
        if (!this.detailArea) return;

        if (!this._selectedId) {
            this.detailArea.innerHTML = `
                <div class="backpack-detail-placeholder">← 点击左侧物品查看详情</div>
            `;
            return;
        }

        const item = getItem(this._selectedId);
        if (!item) return;

        this.detailArea.innerHTML = `
            <div class="backpack-detail-icon">${item.img ? `<img src="${item.img}" alt="${item.name}" style="width:100%;height:100%;object-fit:contain;image-rendering:pixelated;">` : item.icon}</div>
            <div class="backpack-detail-name">${item.name}</div>
            <div class="backpack-detail-desc">${item.desc}</div>
        `;
    }
};
