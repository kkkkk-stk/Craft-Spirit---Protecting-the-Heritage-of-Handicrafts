// ========== 资源预加载器（分阶段加载） ==========
// 阶段1 critical: 所有图片 + 第一个CG视频，开局加载（~5.4MB）
// 阶段2 game:     第二个CG视频，进入游戏时过渡加载（~4.6MB）
// 阶段3 lazy:     文物/拼图等，按需加载
// 剩余CG视频在进入游戏后异步加载

// ===== 阶段1：所有图片（主菜单 + 场景 + 角色 + 行走帧） =====
const CRITICAL_LIST = [
    // 主菜单 / UI
    'assets/images/background/main-menu-bg.webp',
    'assets/images/ui/bamboo-panel.webp',
    'assets/images/ui/slot-bg.webp',
    'assets/images/ui/square-panel.webp',
    'assets/images/ui/delete-icon-clean.webp',
    // 角色
    'assets/images/protagonist_stand/character1.webp',
    'assets/images/image_npc/old_man_sprite.webp',
    'assets/images/image_npc/old_man_portrait.webp',
    'assets/images/image_npc/granny_lan_sprite.webp',
    'assets/images/image_npc/granny_lan_portrait.webp',
    // 第一关场景
    'assets/images/scences/level1/bg.webp',
    'assets/images/scences/level1/ground1.webp',
    'assets/images/scences/level1/gate_structure.webp',
    'assets/images/scences/level1/fg_tree.webp',
    'assets/images/scences/level1/fg_fence.webp',
    'assets/images/scences/level1/fg_bush.webp',
    'assets/images/scences/level1/fg_lantern.webp',
    'assets/images/scences/level1/stage.webp',
    'assets/images/scences/level1/hall.webp',
    'assets/images/scences/level1/ethnic embroidery house.webp',
    'assets/images/scences/level1/houses/house_01.webp',
    'assets/images/scences/level1/houses/house_03.webp',
    'assets/images/scences/level1/traditional Chinese village stage.webp',
];

// 主角行走动画帧 00~29
for (let i = 0; i < 30; i++) {
    CRITICAL_LIST.push(
        `assets/images/protagonist_move/protagonist_move_${String(i).padStart(2, '0')}_clean.webp`
    );
}

// ===== 阶段3：按需加载 =====
const LAZY_MAP = {
    backpack: [
        'assets/images/Cultural relic/relic_embroidery_frame.webp',
        'assets/images/Cultural relic/relic_thread_bundle.webp',
        'assets/images/Cultural relic/relic_pattern_manuscript.webp',
        'assets/images/Cultural relic/relic_plant_dye_pack.webp',
        'assets/images/Cultural relic/relic_phoenix_crown.webp',
    ],
    hexPuzzle: [
        'assets/images/game/last1_square.webp',
    ],
};

// ===== CG视频资源 =====
const VIDEO_LIST = [
    'assets/cg/1/1.mp4',       // [0] 开局加载（第1个播放：采药完成）
    'assets/cg/3/3.mp4',       // [1] 过渡加载（第2个播放：拾取文物1）
    'assets/cg/2/2222222.mp4', // [2] 异步加载（第3个播放：布给蓝婆婆）
    'assets/cg/4/4.mp4',       // [3] 异步加载（第4个播放：进入拼图）
];

// 加载提示文案（轮换显示）
const HINTS = [
    '正在唤醒沉睡的匠灵...',
    '正在编织畲族彩线...',
    '正在研磨天然染料...',
    '正在复原古老图谱...',
    '正在点亮传承之路...',
];

// 保持所有Image对象引用，防止垃圾回收清除图片内存缓存
// 避免CSS background-image渲染时缓存不命中导致延迟出现
const _imageCache = [];

/**
 * 预加载单张图片（确保下载+解码完成，避免CSS渲染时延迟出现）
 */
function loadImage(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            _imageCache.push(img); // 保持引用，防止垃圾回收清除缓存
            // 确保图片解码完成，CSS background-image 渲染时可立即显示
            if (img.decode) {
                img.decode().then(() => resolve({ src, ok: true }))
                    .catch(() => resolve({ src, ok: true }));
            } else {
                resolve({ src, ok: true });
            }
        };
        img.onerror = () => resolve({ src, ok: false });
        img.src = src;
    });
}

/**
 * 并发加载资源列表（限制并发数）
 */
async function loadList(list, onProgress) {
    const total = list.length;
    let loaded = 0;
    const failed = [];
    const CONCURRENCY = 8;
    let hintIndex = 0;

    const updateProgress = () => {
        const hint = HINTS[hintIndex % HINTS.length];
        if (loaded % Math.ceil(total / HINTS.length) === 0 && loaded > 0) {
            hintIndex++;
        }
        if (onProgress) onProgress(loaded, total, hint);
    };

    updateProgress();

    for (let i = 0; i < list.length; i += CONCURRENCY) {
        const batch = list.slice(i, i + CONCURRENCY);
        const results = await Promise.all(batch.map(loadImage));
        for (const r of results) {
            loaded++;
            if (!r.ok) failed.push(r.src);
        }
        updateProgress();
    }

    return { loaded, failed };
}

// 阶段2状态追踪（3.mp4加载状态）
let _gameReady = false;
let _gamePromise = null;

// 阶段3 lazy 缓存（避免重复加载）
const _lazyCache = {};

// 视频预加载状态
let _videoPromise = null;

// 保持所有视频元素引用，防止移除后浏览器清除视频缓存
const _videoCache = [];

/**
 * 加载单个视频（canplaythrough 时 resolve，确保可流畅播放到底）
 * @param {string} src 视频路径
 * @param {(pct:number)=>void} onProgress 进度回调（0-100）
 */
function preloadVideo(src, onProgress) {
    return new Promise(resolve => {
        const v = document.createElement('video');
        v.preload = 'auto';
        v.muted = true;
        v.src = src;
        v.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
        document.body.appendChild(v);

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            // 不移除video元素，保持引用防止浏览器清除视频缓存
            _videoCache.push(v);
            resolve();
        };

        // 下载进度回调
        if (onProgress) {
            v.addEventListener('progress', () => {
                if (done) return;
                if (v.buffered.length > 0 && v.duration > 0) {
                    const pct = Math.min(100, Math.round(
                        (v.buffered.end(v.buffered.length - 1) / v.duration) * 100
                    ));
                    onProgress(pct);
                }
            });
        }

        // canplaythrough：浏览器判断可以流畅播放到底
        v.addEventListener('canplaythrough', finish);
        v.addEventListener('error', finish);
        // 超时保护（120秒）
        setTimeout(finish, 120000);
    });
}

/**
 * 后台逐个预加载剩余视频（跳过前两个，已加载）
 */
function preloadVideos() {
    if (_videoPromise) return _videoPromise;

    _videoPromise = (async () => {
        // 跳过前两个CG视频（1.mp4开局加载，3.mp4过渡加载）
        for (let i = 2; i < VIDEO_LIST.length; i++) {
            await preloadVideo(VIDEO_LIST[i]);
        }
        console.log('Preloader: 剩余视频预加载完成');
    })();

    return _videoPromise;
}

export const Preloader = {
    /** 阶段1：加载所有图片 + 第一个CG视频（阻塞，带进度回调） */
    loadCritical(onProgress) {
        const totalSteps = CRITICAL_LIST.length + 1; // 图片 + 1个CG视频
        return loadList(CRITICAL_LIST, (loaded, total, hint) => {
            if (onProgress) onProgress(loaded, totalSteps, hint);
        }).then(({ failed }) => {
            // 图片加载完，继续加载第一个CG视频
            if (onProgress) onProgress(CRITICAL_LIST.length, totalSteps, '正在预载首章记忆...');
            return preloadVideo(VIDEO_LIST[0]).then(() => {
                if (onProgress) onProgress(totalSteps, totalSteps, '匠灵已唤醒');
                return { loaded: totalSteps, failed };
            });
        });
    },

    /** 阶段2：加载第二个CG视频（3.mp4），进入游戏时调用，带进度回调 */
    loadGame(onProgress) {
        if (_gamePromise) return _gamePromise;
        _gamePromise = preloadVideo(VIDEO_LIST[1], (pct) => {
            if (onProgress) onProgress(pct, 100);
        }).then(() => {
            _gameReady = true;
        });
        return _gamePromise;
    },

    /** 第二个CG视频是否已加载完毕 */
    isGameReady() {
        return _gameReady;
    },

    /** 等待第二个CG视频加载完毕（返回 Promise） */
    waitForGame() {
        return _gamePromise || Promise.resolve();
    },

    /** 阶段3：按需加载指定分组的资源（带缓存，避免重复加载） */
    loadLazy(key) {
        if (_lazyCache[key]) return _lazyCache[key];
        const list = LAZY_MAP[key] || [];
        _lazyCache[key] = loadList(list);
        return _lazyCache[key];
    },

    /** 后台预加载视频（逐个加载，不阻塞） */
    preloadVideos,
};
