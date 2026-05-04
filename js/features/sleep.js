// ========== 晚安模式 v2.2（纯时间戳，防中断，含睡眠报告历史）==========

let sleepStartTime = null;
let isSleepMode = false;

const SLEEP_HISTORY_KEY = 'sleep_history';

// 读取历史记录
async function getSleepHistory() {
    if (typeof localforage === 'undefined') return [];
    const saved = await localforage.getItem(SLEEP_HISTORY_KEY);
    return saved && Array.isArray(saved) ? saved : [];
}

// 保存历史记录
async function saveSleepHistory(history) {
    if (typeof localforage !== 'undefined') {
        await localforage.setItem(SLEEP_HISTORY_KEY, history);
    }
}

// 添加一条睡眠记录
async function addSleepRecord(startTime, endTime) {
    const history = await getSleepHistory();
    history.push({
        id: Date.now(),
        start: startTime,
        end: endTime,
        duration: endTime - startTime
    });
    if (history.length > 100) {
        history.splice(0, history.length - 100);
    }
    await saveSleepHistory(history);
}

// 格式化时长
function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) {
        return `${h} 小时 ${m} 分钟`;
    }
    return `${m} 分钟`;
}

// 格式化日期
function formatDate(ts) {
    const d = new Date(ts);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    return `${month}月${day}日 ${hour}:${minute}`;
}

// 初始化悬浮窗
function initSleepWidget() {
    if (document.getElementById('sleep-mini-widget')) return;
    const widgetHTML = `
        <div id="sleep-mini-widget" style="
            position:fixed; bottom:100px; right:18px; z-index:9999;
            display:none; align-items:center; gap:8px;
            background:rgba(20,25,50,0.92); backdrop-filter:blur(16px);
            border:1px solid rgba(255,255,255,0.15); border-radius:20px;
            padding:8px 14px; color:#fff; font-size:12px;
            cursor:pointer; box-shadow:0 4px 20px rgba(0,0,0,0.3);
            font-family:var(--font-family);
        " onclick="wakeUp()">
            <span style="font-size:16px;">🌙</span>
            <span>守护中</span>
            <span style="width:6px;height:6px;border-radius:50%;background:#4cd964;animation:sleep-dot-pulse 1.5s ease-in-out infinite;"></span>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);
}

// 初始化报告面板
function initSleepReportPanel() {
    if (document.getElementById('sleep-report-modal')) return;
    const panelHTML = `
        <div id="sleep-report-modal" class="modal" style="display:none;">
            <div class="modal-content" style="
                max-width:400px; height:75vh; max-height:550px;
                display:flex; flex-direction:column; padding:0;
                border-radius:20px; overflow:hidden;
            ">
                <div style="
                    display:flex; align-items:center; justify-content:space-between;
                    padding:16px 18px 12px; border-bottom:1px solid var(--border-color);
                    flex-shrink:0;
                ">
                    <div style="display:flex; align-items:center; gap:8px; font-size:16px; font-weight:700; color:var(--text-primary);">
                        <span style="font-size:20px;">🌙</span> 睡眠报告
                    </div>
                    <button onclick="hideModal(document.getElementById('sleep-report-modal'))" style="
                        width:30px; height:30px; border-radius:50%; border:none;
                        background:var(--primary-bg); color:var(--text-secondary);
                        cursor:pointer; display:flex; align-items:center; justify-content:center;
                        font-size:14px;
                    ">✕</button>
                </div>
                <div id="sleep-report-list" style="
                    flex:1; overflow-y:auto; padding:12px 16px;
                "></div>
                <div style="
                    padding:10px 16px; border-top:1px solid var(--border-color);
                    flex-shrink:0; display:flex; gap:8px;
                ">
                    <button id="sleep-report-clear-btn" style="
                        flex:1; padding:8px; border:1px solid rgba(255,80,80,0.3);
                        border-radius:10px; background:none; color:#ff5050;
                        font-size:12px; cursor:pointer; font-family:var(--font-family);
                    ">清空记录</button>
                    <button onclick="hideModal(document.getElementById('sleep-report-modal'))" style="
                        flex:2; padding:8px; border:none; border-radius:10px;
                        background:var(--accent-color); color:#fff;
                        font-size:13px; cursor:pointer; font-family:var(--font-family);
                    ">关闭</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', panelHTML);

    const clearBtn = document.getElementById('sleep-report-clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (confirm('确定要清空所有睡眠报告记录吗？')) {
                if (typeof localforage !== 'undefined') {
                    await localforage.removeItem(SLEEP_HISTORY_KEY);
                }
                renderSleepReport();
            }
        });
    }
}

// 渲染报告列表
async function renderSleepReport() {
    const listEl = document.getElementById('sleep-report-list');
    if (!listEl) return;
    const history = await getSleepHistory();
    if (history.length === 0) {
        listEl.innerHTML = `
            <div style="text-align:center; padding:50px 20px; color:var(--text-secondary); opacity:0.6;">
                <div style="font-size:40px; margin-bottom:10px;">🌙</div>
                <div style="font-size:14px;">还没有睡眠报告</div>
                <div style="font-size:11px; margin-top:4px;">开启晚安模式后会自动记录</div>
            </div>`;
        return;
    }
    const sorted = [...history].reverse();
    listEl.innerHTML = sorted.map((record, index) => {
        const startStr = formatDate(record.start);
        const endStr = formatDate(record.end);
        const durationStr = formatDuration(record.duration);
        const isLast = index === 0;
        return `
            <div class="sleep-record-item" style="${isLast ? 'border-left:3px solid var(--accent-color);' : ''}">
                <div class="sleep-record-header">
                    <span class="sleep-record-date">${startStr} 入睡</span>
                    ${isLast ? '<span class="sleep-record-latest">最近</span>' : ''}
                </div>
                <div class="sleep-record-detail">
                    <span>⏰ ${endStr} 醒来</span>
                </div>
                <div class="sleep-record-duration">
                    💤 守护了 <strong>${durationStr}</strong>
                </div>
            </div>`;
    }).join('');
}

// 打开报告面板
window.openSleepReport = async function() {
    initSleepReportPanel();
    await renderSleepReport();
    if (typeof showModal === 'function') {
        showModal(document.getElementById('sleep-report-modal'));
    }
};

// 开始晚安
window.startSleep = function() {
    if (isSleepMode) return;
    isSleepMode = true;
    sleepStartTime = Date.now();

    const goodnightWords = (typeof customReplies !== 'undefined' && customReplies.length > 0)
        ? customReplies
        : ['晚安，做个好梦。🌙', '我在这里陪着你，安心睡吧。', '闭上眼睛，我就在旁边。'];
    const randomWord = goodnightWords[Math.floor(Math.random() * goodnightWords.length)];

    if (typeof addMessage === 'function') {
        addMessage({
            id: Date.now(),
            text: randomWord,
            timestamp: new Date(),
            type: 'system',
            sender: 'system'
        });
    }

    const widget = document.getElementById('sleep-mini-widget');
    if (widget) widget.style.display = 'flex';

    const btn = document.getElementById('sleep-btn');
    if (btn) btn.classList.add('sleeping');

    if (typeof showNotification === 'function') {
        showNotification('🌙 晚安模式已开启，他会守护你的睡眠', 'success', 3000);
    }
};

// 结束晚安
window.wakeUp = async function() {
    if (!isSleepMode) return;
    const endTime = Date.now();
    const duration = endTime - sleepStartTime;
    const durationStr = formatDuration(duration);
    await addSleepRecord(sleepStartTime, endTime);

    isSleepMode = false;
    sleepStartTime = null;

    const widget = document.getElementById('sleep-mini-widget');
    if (widget) widget.style.display = 'none';

    const btn = document.getElementById('sleep-btn');
    if (btn) btn.classList.remove('sleeping');

    if (typeof addMessage === 'function') {
        addMessage({
            id: Date.now(),
            text: `✨ 早安。他守护了你 ${durationStr}。`,
            timestamp: new Date(),
            type: 'system',
            sender: 'system'
        });
    }

    if (typeof showNotification === 'function') {
        showNotification(`早上好！他守护了你 ${durationStr}`, 'success', 5000);
    }
};

// 工具栏按钮
window.toggleSleep = function() {
    if (isSleepMode) {
        if (confirm('确定要结束晚安吗？他就不再守护了哦。')) {
            window.wakeUp();
        }
    } else {
        window.startSleep();
    }
};

// 页面加载
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initSleepWidget();
        initSleepReportPanel();
    });
} else {
    initSleepWidget();
    initSleepReportPanel();
}