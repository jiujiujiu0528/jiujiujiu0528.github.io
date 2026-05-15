// ========== 碎碎念模块 ==========

let whisperData = [];

const WHISPER_STORAGE_KEY = 'whisper_data';

// 加载数据
async function loadWhisperData() {
    if (typeof localforage === 'undefined') {
        console.warn('localforage 未加载，碎碎念数据无法读取');
        whisperData = [];
        return;
    }
    const saved = await localforage.getItem(WHISPER_STORAGE_KEY);
    if (saved && Array.isArray(saved)) {
        whisperData = saved;
    } else {
        whisperData = [];
    }
}

// 保存数据
async function saveWhisperData() {
    if (typeof localforage !== 'undefined') {
        await localforage.setItem(WHISPER_STORAGE_KEY, whisperData);
    }
}

// 添加一条碎碎念
async function addWhisper(text) {
    if (!text || !text.trim()) return;
    whisperData.push({
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        text: text.trim(),
        time: new Date().toISOString()
    });
    await saveWhisperData();
}

// 删除一条碎碎念
async function deleteWhisper(id) {
    whisperData = whisperData.filter(w => w.id !== id);
    await saveWhisperData();
}

// 渲染碎碎念列表
function renderWhisperList() {
    const listEl = document.getElementById('whisper-list');
    if (!listEl) return;

    if (whisperData.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center;padding:40px 20px;color:var(--text-secondary);opacity:0.6;">
                <div style="font-size:36px;margin-bottom:10px;">💭</div>
                <div style="font-size:13px;">还没有碎碎念</div>
                <div style="font-size:11px;margin-top:4px;">在这里悄悄说点什么吧</div>
            </div>`;
        return;
    }

    const sorted = [...whisperData].reverse();

    listEl.innerHTML = sorted.map(w => {
        const date = new Date(w.time);
        const timeStr = date.toLocaleDateString('zh-CN', {
            month: '2-digit', day: '2-digit'
        }) + ' ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit', minute: '2-digit'
        });
        return `
            <div class="whisper-item">
                <div class="whisper-item-time">${timeStr}</div>
                <div class="whisper-item-text">${w.text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
                <button class="whisper-item-delete" onclick="deleteWhisperAndRefresh('${w.id}')" title="删除">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>`;
    }).join('');
}

// 删除并刷新列表
window.deleteWhisperAndRefresh = async function(id) {
    if (!confirm('确定要删除这条碎碎念吗？')) return;
    await deleteWhisper(id);
    renderWhisperList();
};

// 发送碎碎念
async function sendWhisper() {
    const inputEl = document.getElementById('whisper-input');
    if (!inputEl) return;
    const text = inputEl.value.trim();
    if (!text) return;
    await addWhisper(text);
    inputEl.value = '';
    renderWhisperList();
}

// 打开碎碎念面板
window.openWhisperPanel = async function() {
    const advModal = document.getElementById('advanced-modal');
    if (advModal && typeof hideModal === 'function') {
        hideModal(advModal);
    }

    await loadWhisperData();
    renderWhisperList();

    const modal = document.getElementById('whisper-modal');
    if (modal && typeof showModal === 'function') {
        showModal(modal);
        setTimeout(() => {
            const input = document.getElementById('whisper-input');
            if (input) input.focus();
        }, 300);
    }
};

// 初始化面板 HTML
function initWhisperPanel() {
    if (document.getElementById('whisper-modal')) return;

    const panelHTML = `
        <div id="whisper-modal" class="modal" style="display:none;">
            <div class="modal-content whisper-panel" style="
                max-width:420px;
                height:80vh;
                max-height:600px;
                display:flex;
                flex-direction:column;
                padding:0;
                overflow:hidden;
            ">
                <div style="
                    display:flex;
                    align-items:center;
                    justify-content:space-between;
                    padding:16px 18px 12px;
                    border-bottom:1px solid var(--border-color);
                    flex-shrink:0;
                ">
                    <div style="display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:var(--text-primary);">
                        <span style="font-size:20px;">💭</span> 碎碎念
                    </div>
                    <button onclick="hideModal(document.getElementById('whisper-modal'))" style="
                        width:30px;height:30px;border-radius:50%;border:none;
                        background:var(--primary-bg);color:var(--text-secondary);
                        cursor:pointer;display:flex;align-items:center;justify-content:center;
                        font-size:14px;
                    ">✕</button>
                </div>

                <div id="whisper-list" style="
                    flex:1;
                    overflow-y:auto;
                    padding:12px 16px;
                "></div>

                <div style="
                    display:flex;
                    gap:8px;
                    padding:12px 16px;
                    border-top:1px solid var(--border-color);
                    flex-shrink:0;
                ">
                    <input type="text" id="whisper-input" placeholder="悄悄说点什么…" style="
                        flex:1;
                        padding:10px 14px;
                        border:1.5px solid var(--border-color);
                        border-radius:24px;
                        background:var(--primary-bg);
                        color:var(--text-primary);
                        font-size:14px;
                        font-family:var(--font-family);
                        outline:none;
                        transition:border-color 0.2s;
                    " onfocus="this.style.borderColor='var(--accent-color)'" onblur="this.style.borderColor='var(--border-color)'" onkeydown="if(event.key==='Enter')sendWhisper()">
                    <button onclick="sendWhisper()" style="
                        width:42px;height:42px;border-radius:50%;border:none;
                        background:var(--accent-color);color:#fff;
                        cursor:pointer;display:flex;align-items:center;justify-content:center;
                        flex-shrink:0;font-size:16px;
                    " title="发送">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);
}

// 页面加载时自动初始化面板
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhisperPanel);
} else {
    initWhisperPanel();
}