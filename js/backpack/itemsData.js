// ========== 物品图鉴（所有可获取物品的定义）==========

export const ITEMS = {
    // ====== 关键物品 ======
    'jade_token': {
        id: 'jade_token',
        name: '匠人玉牌',
        icon: '📿',
        desc: '非遗寻访者的信物。玉牌表面温润，刻有古老纹路，能感应周遭匠灵的存在。林望随身携带之物。',
        type: 'key'
    },
    'map': {
        id: 'map',
        name: '浙江匠灵地图',
        icon: '🗺️',
        desc: '守村人赠与的古旧地图，以桑皮纸绘制。图上标注了三处被黑雾笼罩的古村落——丽水畲寨、东阳木雕古村、乐清渔港。边缘有小字："匠灵沉寂处，玉牌可唤之。"',
        type: 'key'
    },

    // ====== 关卡一：畲族刺绣 ======
    'indigo_herb': {
        id: 'indigo_herb',
        name: '靛蓝草',
        icon: '🌿',
        desc: '生长在畲寨山涧的染草，叶片揉碎后汁液呈深蓝色。畲族妇女世代用它染制布料，是刺绣的底色之源。',
        type: 'material'
    },
    'madder_root': {
        id: 'madder_root',
        name: '茜草根',
        icon: '🪵',
        desc: '晒干后的茜草根呈现暗红色，研磨成粉可制红染料。蓝阿婆说，这是绣嫁衣必不可少的颜色。',
        type: 'material'
    },
    'embroidery_pattern': {
        id: 'embroidery_pattern',
        name: '凤凰纹样',
        icon: '📜',
        desc: '一张泛黄的畲族刺绣图样，描绘了一只展翅的凤凰。纹样线条流畅，四周缀有如意云纹——这是畲族新娘嫁衣上的核心图案。',
        type: 'quest'
    },
    'silver_thread': {
        id: 'silver_thread',
        name: '银丝线',
        icon: '🧵',
        desc: '畲族银匠打制的细银丝，在光下泛着柔和的光泽。用来绣制凤凰的羽翼，让图案栩栩如生。',
        type: 'material'
    },

    // ====== 关卡二：东阳木雕 ======
    'carving_knife': {
        id: 'carving_knife',
        name: '雕花刻刀',
        icon: '🔪',
        desc: '马松年老师傅用了几十年的刻刀，木柄已被磨得光滑如玉。刀锋虽旧，却仍能雕出最细腻的纹路。',
        type: 'tool'
    },
    'camphor_wood': {
        id: 'camphor_wood',
        name: '樟木胚料',
        icon: '🪵',
        desc: '一块上好的樟木，纹理细密，散发着淡淡的香气。东阳木雕最常用的材料，防虫耐腐。',
        type: 'material'
    },
    'mortise_tenon': {
        id: 'mortise_tenon',
        name: '榫卯构件',
        icon: '🧩',
        desc: '一套精巧的榫卯结构模型——不用一颗钉子，仅凭木材自身的凹凸咬合便能撑起整座古宅。',
        type: 'quest'
    },

    // ====== 关卡三：细纹刻纸 ======
    'paper_cutting_knife': {
        id: 'paper_cutting_knife',
        name: '刻纸刀',
        icon: '✂️',
        desc: '乐清刻纸艺人使用的特制刀具，刀尖细如针尖。张阿海说，一把好刀能在纸上刻出头发丝般的细线。',
        type: 'tool'
    },
    'rice_paper': {
        id: 'rice_paper',
        name: '宣纸',
        icon: '📄',
        desc: '上等檀皮宣纸，薄如蝉翼却韧性十足。能在上面刻出最繁复的图案而不破损。',
        type: 'material'
    },
    'dragon_boat_pattern': {
        id: 'dragon_boat_pattern',
        name: '龙船灯图样',
        icon: '🏮',
        desc: '乐清龙船灯的传统图样，绘有盘龙、海浪和祥云。每年元宵，渔家人将刻好的纸花贴在龙船灯上，祈求风调雨顺。',
        type: 'quest'
    }
};

/**
 * 根据物品 ID 获取物品信息
 */
export function getItem(id) {
    return ITEMS[id] || null;
}
