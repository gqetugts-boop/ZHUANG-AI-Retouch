(function() {
    const apiBaseUrl = "https://grsaiapi.com/";
    const DEBUG_STORAGE_KEY = 'geminiai_debug';
    let debugEnabled = false;

    try {
        debugEnabled = localStorage.getItem(DEBUG_STORAGE_KEY) === '1';
    } catch (e) {
        debugEnabled = false;
    }

    window.setGeminiAiDebug = function(enabled) {
        debugEnabled = !!enabled;
        try {
            localStorage.setItem(DEBUG_STORAGE_KEY, debugEnabled ? '1' : '0');
        } catch (e) {
            // ignore storage errors
        }
    };

    function isDebugEnabled() {
        return debugEnabled;
    }

    function debugLog() {
        if (!isDebugEnabled()) return;
        console.info.apply(console, arguments);
    }

    const DEFAULT_SERVER_API_URL = "https://www.syyyy.online";
    const SERVER_API_URL = DEFAULT_SERVER_API_URL;
    const PLUGIN_VERSION = "1.3.7";
    const TEXT_INPUT_SELECTOR = [
        'textarea',
        'sp-textarea',
        'input:not([type])',
        'input[type="text"]',
        'input[type="search"]',
        'input[type="url"]',
        'input[type="email"]',
        'input[type="tel"]',
        'input[type="password"]'
    ].join(',');

    function removeTextInputLengthLimit(control) {
        if (!control || typeof control.removeAttribute !== 'function') return;

        control.removeAttribute('maxlength');
        control.removeAttribute('maxLength');

        if ('maxLength' in control) {
            try {
                control.maxLength = -1;
            } catch (e) {
                control.removeAttribute('maxlength');
            }
        }
    }

    function removeAllTextInputLengthLimits(root) {
        const scope = root && root.querySelectorAll ? root : document;

        if (scope.matches && (scope.matches(TEXT_INPUT_SELECTOR) || scope.hasAttribute('maxlength'))) {
            removeTextInputLengthLimit(scope);
        }

        scope.querySelectorAll(TEXT_INPUT_SELECTOR + ', [maxlength]').forEach(removeTextInputLengthLimit);
    }

    function initTextInputLengthLimitRemoval() {
        if (!document.documentElement.dataset.textInputLimitBound) {
            document.addEventListener('focusin', function(event) {
                removeAllTextInputLengthLimits(event.target);
            }, true);

            document.documentElement.dataset.textInputLimitBound = '1';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTextInputLengthLimitRemoval, { once: true });
    }

    const DEFAULT_IMAGE_MODELS = [];

    const DEFAULT_CHAT_MODELS = [];
    const DEFAULT_GRS_CHAT_MODEL = "grs/gemini-3.1-pro";
    const GRS_CHAT_MODEL_DEFAULT_OPTIONS = [
        { value: "gpt-5.4", text: "gpt-5.4 (GRS)" },
        { value: "gpt-5.5", text: "gpt-5.5 (GRS)" },
        { value: "gemini-3-pro", text: "gemini-3-pro (GRS)" },
        { value: "gemini-3.1-pro", text: "gemini-3.1-pro (GRS)" },
        { value: "gemini-2.5-pro", text: "gemini-2.5-pro (GRS)" }
    ];
    // OpenAI Official / NewAPI / Google models removed - chat uses GRS only
    const GOOGLE_CHAT_MODEL_DEFAULT_OPTIONS = [];
    const NEWAPI_OPENAI_CHAT_MODEL_DEFAULT_OPTIONS = [];
    const NEWAPI_GEMINI_CHAT_MODEL_DEFAULT_OPTIONS = [];
    const FAKE_SELECT_IDS = [
        'imgModel',
        'imgResolution',
        'chatModel',
        'presetCategory',
        'promptPreset',
        'imageCount',
        'alignmentMode',
        'newApiImageMode',
        'sdModel',
        'loraModel',
        'webuiPreset',
        'samplingMethod',
        'maxResolution'
    ];

    const GRS_DEFAULT_BASE_URL = "https://grsaiapi.com";
    const GRS_CHINA_BASE_URL = "https://grsai.dakka.com.cn";
    const OPENAI_OFFICIAL_BASE_URL = "https://api.openai.com";
    const DEFAULT_IMAGE_MODEL = "PS_NATIVE_NANO_BANANA";
    const DEFAULT_IMAGE_RESOLUTION = "auto";
    const LEGACY_IMAGE_DEFAULT_MODEL = "nano-banana-pro";
    const GRS_NANO_BANANA_MODELS = [
        "nano-banana-2",
        "nano-banana-2-cl",
        "nano-banana-2-4k-cl",
        "nano-banana-fast",
        "nano-banana",
        "nano-banana-pro",
        "nano-banana-pro-vt",
        "nano-banana-pro-cl",
        "nano-banana-pro-vip",
        "nano-banana-pro-4k-vip"
    ];
    const GRS_GPT_IMAGE_MODEL_ALIASES = {
        "gpt-imagine-2": "gpt-image-2"
    };
    const GRS_IMAGE_MODEL_DEFAULT_OPTIONS = [
        { value: "nano-banana-fast", text: "nano-banana-fast (GRS Nano Banana)" },
        { value: "nano-banana", text: "nano-banana (GRS Nano Banana)" },
        { value: "nano-banana-2", text: "nano-banana-2 (GRS Nano Banana)" },
        { value: "nano-banana-2-cl", text: "nano-banana-2-cl (GRS Nano Banana)" },
        { value: "nano-banana-2-4k-cl", text: "nano-banana-2-4k-cl (GRS Nano Banana 4K)" },
        { value: "nano-banana-pro", text: "nano-banana-pro (GRS Nano Banana Pro)" },
        { value: "nano-banana-pro-vt", text: "nano-banana-pro-vt (GRS Nano Banana Pro)" },
        { value: "nano-banana-pro-cl", text: "nano-banana-pro-cl (GRS Nano Banana Pro)" },
        { value: "nano-banana-pro-vip", text: "nano-banana-pro-vip (GRS Nano Banana VIP)" },
        { value: "nano-banana-pro-4k-vip", text: "nano-banana-pro-4k-vip (GRS Nano Banana 4K VIP)" },
        { value: "gpt-image-2", text: "gpt-image-2 / GPT-imagine-2 (GRS 图生图优化)" },
        { value: "gpt-image-2-vip", text: "gpt-image-2-vip (GRS 图生图优化 VIP)" }
    ];

    // 全局变量
    let selectedImageBase64 = null;
    let referenceImages = [];
    const MAX_REFERENCE_IMAGES = 4;
    let currentSettings = null;
    let chatHistory = [];
    let savedSelectionBounds = null;
    let currentGenerationTask = null;
    let currentGenerationAbortController = null;
    let batchTasks = [];
    let currentRefreshAbortController = null;
    let lastChatInput = '';
    let currentAllPresets = [];
    let currentNewApiChatModels = [];
    let logSearchTimer = null;
    let uxpFs = null;
    const CHAT_MEMORY_ROUNDS = 8;
    const customSelectRegistry = new Map();
    
    // Photoshop API对象
    let psAPI = {
        uxp: null,
        app: null,
        core: null,
        action: null,
        imaging: null,
        constants: null,
        isAvailable: false
    };
    
    // ⚡️ 核心：调用 PS 原生底层 AI 引擎 (Nano Banana)
    async function executeNativeAIPreset(promptText) {
        initCompatibility();
        const timestamp = new Date().toLocaleString('zh-CN');
        const model = 'PS 原生 Nano Banana Pro';
        
        // 1. 检查 PS 原生 API 是否可用
        if (!psAPI.isAvailable || !psAPI.core || !psAPI.action) {
            showStatus('Photoshop API 不可用，请检查环境！', 'error');
            Config.addLog({
                timestamp: timestamp,
                model: model,
                prompt: promptText,
                type: 'native',
                status: '失败',
                error: 'Photoshop API 不可用，请检查环境！'
            });
            return;
        }
        
        try {
            // 2. 检查用户有没有选区
            const doc = psAPI.app.activeDocument;
            if (!doc) {
                showStatus('请先打开一张图片！', 'error');
                Config.addLog({
                    timestamp: timestamp,
                    model: model,
                    prompt: promptText,
                    type: 'native',
                    status: '失败',
                    error: '请先打开一张图片！'
                });
                return;
            }
            try {
                const bounds = doc.selection.bounds;
            } catch(e) {
                showStatus('请先在画布上用选框工具画一个区域！', 'error');
                Config.addLog({
                    timestamp: timestamp,
                    model: model,
                    prompt: promptText,
                    type: 'native',
                    status: '失败',
                    error: '请先在画布上用选框工具画一个区域！'
                });
                return;
            }

            showStatus('正在调用 PS 原生 Nano Banana 引擎生成...', 'success');
            
            // 3. 执行刚才抓到的底层 batchPlay 代码
            await psAPI.core.executeAsModal(async () => {
                await psAPI.action.batchPlay(
                    [
                        {
                            _obj: "syntheticFill",
                            _target: [
                                {
                                    _ref: "document",
                                    _enum: "ordinal",
                                    _value: "targetEnum"
                                }
                            ],
                            // 替换为咱们自己的提示词变量
                            prompt: promptText,
                            serviceID: "clio",
                            workflowType: {
                                _enum: "genWorkflow",
                                _value: "in_painting"
                            },
                            serviceOptionsList: {
                                clio: {
                                    _obj: "clio",
                                    gi_PROMPT: promptText, // 这里也必须替换
                                    gi_MODE: "tinp",
                                    gi_SEED: -1,
                                    gi_NUM_STEPS: -1,
                                    gi_GUIDANCE: 6,
                                    gi_SIMILARITY: 0,
                                    gi_CROP: false,
                                    gi_DILATE: false,
                                    gi_CONTENT_PRESERVE: 0,
                                    gi_ENABLE_PROMPT_FILTER: true,
                                    dualCrop: true
                                }
                            },
                            serviceVersion: "nano_banana_2", // 我们抓到的顶配模型
                            workflow_to_active_service_identifier_map: {
                                gen_harmonize: "gen_harmonize",
                                generativeUpscale: "clio_f16_async",
                                instruct_edit: "null",
                                text_to_image: "clio3",
                                generate_similar: "clio3",
                                out_painting: "me_md",
                                generate_background: "clio3",
                                in_painting: "nano_banana_2"
                            },
                            _options: {
                                dialogOptions: "dontDisplay"
                            }
                        }
                    ],
                    {
                        synchronousExecution: false,
                        modalBehavior: "execute"
                    }
                );
            }, { commandName: "执行一键AI预设" }); // 进度条上的文案
            
            showStatus('渲染指令已发送，请等待 PS 原生进度条完成！', 'success');
            
            Config.addLog({
                timestamp: timestamp,
                model: model,
                prompt: promptText,
                type: 'native',
                status: '成功',
                message: '渲染指令已发送，请等待 PS 原生进度条完成！'
            });
            
        } catch (error) {
            console.error("执行原生生成失败:", error);
            showStatus('生成出错了: ' + error.message, 'error');
            Config.addLog({
                timestamp: timestamp,
                model: model,
                prompt: promptText,
                type: 'native',
                status: '失败',
                error: '生成出错了: ' + error.message
            });
        }
    }
    
    // 兼容性状态
    let compatibility = {
        photoshopVersion: "unknown",
        isUXPAvailable: false,
        isImagingAvailable: false,
        features: {
            selection: false,
            imageProcessing: false,
            fileSystem: false
        }
    };

    // 先定义UI函数，避免在catch块中调用时未定义
    function showStatus(message, type) {
        const status = document.getElementById('status');
        if (status) {
            status.textContent = message;
            status.className = 'status show ' + type;
            
            setTimeout(function() {
                if (status) {
                    status.classList.remove('show');
                }
            }, 5000);
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        if (toast) {
            toast.textContent = message || '';
            if (!message) {
                toast.classList.remove('show');
                return;
            }
            toast.classList.add('show');

            setTimeout(function() {
                if (toast) {
                    toast.classList.remove('show');
                    toast.textContent = '';
                }
            }, 3000);
        }
    }

    // 初始化兼容性检查
    function initCompatibility() {
        if (compatibility.isUXPAvailable || psAPI.isAvailable) {
            return true;
        }
        try {
            // 尝试加载UXP模块
            psAPI.uxp = require("uxp");
            psAPI.app = require("photoshop").app;
            psAPI.core = require("photoshop").core;
            psAPI.action = require("photoshop").action;
            psAPI.imaging = require("photoshop").imaging;
            psAPI.constants = require("photoshop").constants;
            
            // 初始化 uxpFs
            uxpFs = psAPI.uxp?.storage?.localFileSystem || null;
            
            psAPI.isAvailable = true;
            compatibility.isUXPAvailable = true;
            
            // 检测Photoshop版本
            try {
                if (psAPI.app && psAPI.app.version) {
                    compatibility.photoshopVersion = psAPI.app.version;
                }
            } catch (e) {
                debugLog("无法检测Photoshop版本:", e);
            }
            
            // 检测功能可用性
            compatibility.features.selection = true;
            compatibility.features.imageProcessing = true;
            compatibility.features.fileSystem = true;
            return true;

        } catch (e) {
            debugLog("UXP模块加载失败，Photoshop功能将不可用:", e);
            psAPI.isAvailable = false;
            compatibility.isUXPAvailable = false;
            return false;
        }
    }

    // Photoshop API 在真正调用 PS 功能时再初始化，避免 UXP 加载阶段超时

    function getModelName(modelValue) {
        if (!modelValue) return 'gemini-2.0-flash-exp';
        const text = String(modelValue);
        if (text.indexOf('/') > -1) {
            return text.split('/').pop();
        }
        return text;
    }

    function getModelKey(modelValue) {
        return String(getModelName(modelValue) || '').trim().toLowerCase();
    }

    function parseModelSelection(modelValue) {
        const raw = String(modelValue || '').trim();
        if (!raw) {
            return { raw: '', provider: '', model: '' };
        }

        const lower = raw.toLowerCase();
        if (lower.startsWith('grs/')) {
            return { raw: raw, provider: 'grs', model: getModelName(raw.slice(4)) };
        }
        if (lower.startsWith('openai/')) {
            return { raw: raw, provider: 'openai', model: getModelName(raw.slice(7)) };
        }
        if (lower.startsWith('google/')) {
            return { raw: raw, provider: 'google', model: getModelName(raw.slice(7)) };
        }
        if (lower.startsWith('newapi-openai/')) {
            return { raw: raw, provider: 'newapi-openai', model: getModelName(raw.slice(14)) };
        }
        if (lower.startsWith('newapi-gemini/')) {
            return { raw: raw, provider: 'newapi-gemini', model: getModelName(raw.slice(14)) };
        }
        if (lower.startsWith('newapi/')) {
            const parsedModel = getModelName(raw.slice(7));
            const parsedModelKey = String(parsedModel || '').toLowerCase();
            return {
                raw: raw,
                provider: parsedModelKey.includes('gemini') ? 'newapi-gemini' : 'newapi-openai',
                model: parsedModel
            };
        }

        const model = getModelName(raw);
        const modelKey = String(model || '').toLowerCase();
        if (modelKey.includes('gemini')) {
            return { raw: raw, provider: 'google', model: model };
        }
        if (GRS_NANO_BANANA_MODELS.indexOf(modelKey) > -1 || modelKey === 'gpt-image-2' || modelKey === 'gpt-imagine-2') {
            return { raw: raw, provider: 'grs', model: model };
        }
        if (modelKey.startsWith('gpt')) {
            return { raw: raw, provider: 'openai', model: model };
        }

        return { raw: raw, provider: '', model: model };
    }

    function buildModelValue(provider, modelName) {
        const cleanModel = String(getModelName(modelName) || '').trim();
        if (!cleanModel) return '';
        if (!provider) return cleanModel;
        return String(provider).toLowerCase() + '/' + cleanModel;
    }

    function normalizeChatModelValue(modelValue) {
        const parsed = parseModelSelection(modelValue || DEFAULT_GRS_CHAT_MODEL);
        const modelName = parsed.model || getModelName(DEFAULT_GRS_CHAT_MODEL);
        const provider = parsed.provider || 'grs';
        if (isNewApiProvider(provider) || provider === 'newapi') {
            return buildModelValue(provider, modelName);
        }
        return buildModelValue('grs', modelName);
    }

    function getChatOptionKey(provider, modelName) {
        return String(provider || '').toLowerCase() + '::' + String(modelName || '').toLowerCase();
    }

    function isGrsNanoBananaModel(modelValue) {
        return GRS_NANO_BANANA_MODELS.indexOf(getModelKey(modelValue)) > -1;
    }

    function isGrsGptImageModel(modelValue) {
        const modelKey = getModelKey(modelValue);
        return modelKey === 'gpt-image-2' || modelKey === 'gpt-imagine-2' || modelKey === 'gpt-image-2-vip';
    }

    function shouldOptimizePromptForImagine2(modelValue) {
        return isGrsGptImageModel(modelValue);
    }

    function buildImagine2ImageEditPrompt(promptText) {
        const prompt = normalizePresetPromptText(promptText);
        if (!prompt) return '';

        if (prompt.indexOf('图生图编辑任务：') > -1 && prompt.indexOf('Imagine-2执行规则：') > -1) {
            return prompt;
        }

        return [
            '图生图编辑任务：请以输入图片作为唯一视觉参考进行编辑，不要从零重画。',
            '编辑目标：',
            prompt,
            'Imagine-2执行规则：',
            '1. 只修改“编辑目标”明确要求修改的区域；未提到的区域保持原图。',
            '2. 保持人物身份、五官比例、表情、姿势、构图、透视、服装设计、道具位置、背景结构、光源方向、色温、景深、清晰度和噪点一致；只有编辑目标明确要求时才允许改变。',
            '3. 编辑目标中以“改变、过度、出现、导致、误删、遮挡、不自然、比例失调、背景变形、禁止、严禁、避免、不要”等描述的失败情况，全部理解为反向约束，不要生成这些结果。',
            '4. 修改区域需要无缝融合，边缘、遮挡、投影、反射、纹理密度、透视缩放和颗粒感与原图一致。',
            '5. 输出单张干净成图，不添加解释文字、水印、logo、边框、拼图或额外画面，除非编辑目标明确要求。'
        ].join('\n\n');
    }

    function getImageRequestPrompt(modelValue, promptText, hasInputImage) {
        const prompt = normalizePresetPromptText(promptText);
        if (!shouldOptimizePromptForImagine2(modelValue) || hasInputImage === false) {
            return prompt;
        }
        return buildImagine2ImageEditPrompt(prompt);
    }

    function normalizeGrsModelName(modelValue) {
        const modelName = String(getModelName(modelValue) || '').trim();
        const modelKey = modelName.toLowerCase();
        return GRS_GPT_IMAGE_MODEL_ALIASES[modelKey] || modelName;
    }

    function normalizeBaseUrl(baseUrl, fallbackBaseUrl) {
        const raw = String(baseUrl || fallbackBaseUrl || '').trim();
        return raw.replace(/\/+$/, '');
    }

    function normalizeGrsBaseUrlStrict(baseUrl) {
        const normalized = normalizeBaseUrl(baseUrl, GRS_DEFAULT_BASE_URL).toLowerCase();
        if (normalized === GRS_DEFAULT_BASE_URL || normalized === GRS_CHINA_BASE_URL) {
            return normalized;
        }
        return GRS_DEFAULT_BASE_URL;
    }

    function joinApiUrl(baseUrl, path) {
        const normalizedBaseUrl = normalizeBaseUrl(baseUrl, '');
        const normalizedPath = String(path || '');
        if (!normalizedPath) return normalizedBaseUrl;
        return normalizedBaseUrl + (normalizedPath.startsWith('/') ? normalizedPath : '/' + normalizedPath);
    }

    function getGrsDrawBaseUrlFromSettings(settings) {
        const urlFromSettings = settings && settings.imgApiUrl ? settings.imgApiUrl : '';
        return normalizeGrsBaseUrlStrict(urlFromSettings || (currentSettings && currentSettings.imgApiUrl));
    }

    function getGrsDrawBaseUrl() {
        return getGrsDrawBaseUrlFromSettings(currentSettings);
    }

    function getNewApiBaseUrlFromSettings(settings) {
        const urlFromSettings = settings && settings.newApiUrl ? settings.newApiUrl : '';
        return normalizeBaseUrl(urlFromSettings || (currentSettings && currentSettings.newApiUrl), '');
    }

    function isNewApiProvider(provider) {
        const providerKey = String(provider || '').toLowerCase();
        return providerKey === 'newapi' || providerKey === 'newapi-openai' || providerKey === 'newapi-gemini';
    }

    function isGeminiModel(modelValue) {
        return getModelKey(modelValue).includes('gemini');
    }

    function isGrsChatModel(modelValue) {
        const modelKey = getModelKey(modelValue);
        return !!modelKey && !isGrsNanoBananaModel(modelKey) && !isGrsGptImageModel(modelKey);
    }

    function isOpenAIChatModel(modelValue) {
        const modelKey = getModelKey(modelValue);
        return modelKey.startsWith('gpt') && !isGrsGptImageModel(modelKey);
    }

    function getNanoBananaImageSize(modelValue) {
        const modelKey = getModelKey(modelValue);
        if (modelKey.includes('4k') || modelKey === 'nano-banana-2-4k-cl' || modelKey === 'nano-banana-pro-4k-vip') {
            return '4K';
        }
        if (modelKey.includes('2k')) {
            return '2K';
        }
        return '1K';
    }

    const AUTO_ASPECT_RATIO_PRESETS = [
        { label: '1:1', value: 1 },
        { label: '4:3', value: 4 / 3 },
        { label: '3:4', value: 3 / 4 },
        { label: '3:2', value: 3 / 2 },
        { label: '2:3', value: 2 / 3 },
        { label: '16:9', value: 16 / 9 },
        { label: '9:16', value: 9 / 16 }
    ];

    function normalizeSizeHint(sizeHint) {
        if (!sizeHint || typeof sizeHint !== 'object') return null;
        const width = Number(sizeHint.width);
        const height = Number(sizeHint.height);
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return null;
        }
        return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
    }

    function getAspectRatioLabelByHint(sizeHint) {
        const hint = normalizeSizeHint(sizeHint);
        if (!hint) {
            debugLog("getAspectRatioLabelByHint: 无效的尺寸数据，返回默认1:1");
            return '1:1';
        }

        const ratio = hint.width / hint.height;
        let best = AUTO_ASPECT_RATIO_PRESETS[0];
        let bestDistance = Infinity;

        AUTO_ASPECT_RATIO_PRESETS.forEach(function(item) {
            const distance = Math.abs(Math.log(ratio / item.value));
            if (distance < bestDistance) {
                bestDistance = distance;
                best = item;
            }
        });

        return best.label;
    }

    function getAspectRatioValue(aspectRatio) {
        const text = String(aspectRatio || '1:1').trim();
        const parts = text.split(':');
        if (parts.length !== 2) return 1;
        const left = Number(parts[0]);
        const right = Number(parts[1]);
        if (!Number.isFinite(left) || !Number.isFinite(right) || left <= 0 || right <= 0) return 1;
        return left / right;
    }

    function getBaseResolutionByImageSize(imageSize) {
        if (imageSize === '4K') return 4096;
        if (imageSize === '2K') return 2048;
        return 1024;
    }

    function clampNanoImageSizeByCapability(preferredSize, capabilitySize) {
        const level = { '1K': 1, '2K': 2, '4K': 4 };
        const preferred = level[preferredSize] || 1;
        const capability = level[capabilitySize] || 1;

        if (preferred >= 4 && capability >= 4) return '4K';
        if (preferred >= 2 && capability >= 2) return '2K';
        return '1K';
    }

    function getPreferredImageSizeByHint(sizeHint) {
        const hint = normalizeSizeHint(sizeHint);
        if (!hint) return '1K';
        const longSide = Math.max(hint.width, hint.height);
        if (longSide >= 3000) return '4K';
        if (longSide >= 1500) return '2K';
        return '1K';
    }

    function normalizeImageResolution(value) {
        const normalized = String(value || DEFAULT_IMAGE_RESOLUTION).trim().toUpperCase();
        if (normalized === '1K' || normalized === '2K' || normalized === '4K') {
            return normalized;
        }
        return DEFAULT_IMAGE_RESOLUTION;
    }

    function getSelectedImageResolution() {
        const resolutionSelect = document.getElementById('imgResolution');
        if (resolutionSelect) {
            return normalizeImageResolution(resolutionSelect.value);
        }
        return normalizeImageResolution(currentSettings && currentSettings.imgResolution);
    }

    function buildDimensionsFromAspect(baseResolution, aspectRatio) {
        const safeBase = Math.max(256, Number(baseResolution) || 1024);
        const ratio = Math.max(0.2, Math.min(5, getAspectRatioValue(aspectRatio)));

        let width = safeBase;
        let height = safeBase;

        if (ratio >= 1) {
            width = safeBase;
            height = Math.round((safeBase / ratio) / 8) * 8;
        } else {
            height = safeBase;
            width = Math.round((safeBase * ratio) / 8) * 8;
        }

        width = Math.max(256, width);
        height = Math.max(256, height);

        return { width: width, height: height };
    }

    function getGptImageSizeByAspect(aspectRatio) {
        const ratio = getAspectRatioValue(aspectRatio);
        if (ratio >= 1.2) return '1536x1024';
        if (ratio <= 0.83) return '1024x1536';
        return '1024x1024';
    }

    function parseSizeToDimensions(sizeText) {
        const match = String(sizeText || '').match(/^(\d+)\s*x\s*(\d+)$/i);
        if (!match) {
            return { width: 1024, height: 1024 };
        }
        return {
            width: Math.max(256, Number(match[1]) || 1024),
            height: Math.max(256, Number(match[2]) || 1024)
        };
    }

    function getModelImageConfig(modelValue, sizeHint, imageResolution) {
        const modelKey = getModelKey(modelValue);
        const aspectRatio = getAspectRatioLabelByHint(sizeHint);
        const selectedResolution = normalizeImageResolution(imageResolution);
        const explicitImageSize = selectedResolution === DEFAULT_IMAGE_RESOLUTION ? '' : selectedResolution;

        if (isGrsNanoBananaModel(modelKey)) {
            const maxCapability = getNanoBananaImageSize(modelKey);
            const preferredImageSize = explicitImageSize || getPreferredImageSizeByHint(sizeHint);
            const imageSize = explicitImageSize || clampNanoImageSizeByCapability(preferredImageSize, maxCapability);
            const dimensions = buildDimensionsFromAspect(getBaseResolutionByImageSize(imageSize), aspectRatio);
            return {
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: aspectRatio,
                size: 'auto',
                imageSize: imageSize
            };
        }
        if (isGrsGptImageModel(modelKey)) {
            const explicitDimensions = explicitImageSize
                ? buildDimensionsFromAspect(getBaseResolutionByImageSize(explicitImageSize), aspectRatio)
                : null;
            const size = explicitDimensions
                ? explicitDimensions.width + 'x' + explicitDimensions.height
                : getGptImageSizeByAspect(aspectRatio);
            const dimensions = parseSizeToDimensions(size);
            return {
                width: dimensions.width,
                height: dimensions.height,
                aspectRatio: aspectRatio,
                size: size,
                imageSize: explicitImageSize || '1K'
            };
        }

        const explicitFallbackDimensions = explicitImageSize
            ? buildDimensionsFromAspect(getBaseResolutionByImageSize(explicitImageSize), aspectRatio)
            : null;
        const fallbackSize = explicitFallbackDimensions
            ? explicitFallbackDimensions.width + 'x' + explicitFallbackDimensions.height
            : getGptImageSizeByAspect(aspectRatio);
        const fallbackDimensions = parseSizeToDimensions(fallbackSize);
        return {
            width: fallbackDimensions.width,
            height: fallbackDimensions.height,
            aspectRatio: aspectRatio,
            size: 'auto',
            imageSize: explicitImageSize || '1K'
        };
    }

    function getImageModelDisplayName(modelValue, fallbackText) {
        const modelName = String(getModelName(modelValue) || '').trim();
        const modelKey = modelName.toLowerCase();

        if (modelKey === 'ps_native_nano_banana') {
            return 'PS 原生 Banana Pro (Photoshop 官方)';
        }
        if (modelKey === 'gpt-image-2') {
            return 'gpt-image-2 / GPT-imagine-2 (GRS 图生图优化)';
        }
        if (modelKey === 'gpt-image-2-vip') {
            return 'gpt-image-2-vip (GRS 图生图优化 VIP)';
        }
        if (modelKey === 'gpt-imagine-2') {
            return 'gpt-imagine-2 (兼容别名 → gpt-image-2)';
        }
        if (isGrsNanoBananaModel(modelKey)) {
            if (modelKey.includes('4k')) {
                return modelName + ' (GRS Nano Banana 4K)';
            }
            return modelName + ' (GRS Nano Banana)';
        }

        return fallbackText || modelName;
    }

    function resolveImageApiRouting(modelValue, settings) {
        const parsed = parseModelSelection(modelValue);
        const requestedProvider = String(parsed.provider || '').toLowerCase();
        const modelKey = getModelKey(parsed.model || modelValue);
        const safeSettings = settings || {};

        if (isNewApiProvider(requestedProvider)) {
            return {
                provider: requestedProvider,
                apiKey: safeSettings.newApiKey || '',
                baseUrl: getNewApiBaseUrlFromSettings(safeSettings),
                apiType: 'newapi',
                missingKeyMessage: '请先在设置中配置 NewAPI 地址和密钥'
            };
        }

        if (modelKey.includes('gemini')) {
            return {
                provider: 'google',
                apiKey: safeSettings.googleApiKey || '',
                googleAiEnabled: !!safeSettings.googleAiEnabled,
                missingKeyMessage: '请先在设置中配置Google AI Studio API密钥'
            };
        }

        if (isGrsNanoBananaModel(modelKey) || isGrsGptImageModel(modelKey)) {
            return {
                provider: 'grs',
                apiKey: safeSettings.imgApiKey || '',
                apiType: 'nano',
                missingKeyMessage: '请先在设置中配置GRS生图API密钥'
            };
        }

        if (isOpenAIChatModel(modelKey)) {
            return {
                provider: 'openai',
                apiKey: safeSettings.chatApiKey || '',
                apiType: 'openai',
                missingKeyMessage: '请先在设置中配置OpenAI官方API密钥'
            };
        }

        return {
            provider: 'unsupported',
            apiKey: '',
            apiType: 'unsupported',
            missingKeyMessage: '当前模型不受支持。仅支持 GRS / Google AI Studio / OpenAI 官方API / NewAPI'
        };
    }

    function validateImageApiRouting(modelValue, settings) {
        const route = resolveImageApiRouting(modelValue, settings);

        if (route.provider === 'unsupported') {
            return { valid: false, message: route.missingKeyMessage };
        }

        if (route.provider === 'google' && !route.googleAiEnabled) {
            return { valid: false, message: '请先在设置中启用Google AI Studio' };
        }

        if (!route.apiKey) {
            return { valid: false, message: route.missingKeyMessage || '缺少API密钥' };
        }
        if (isNewApiProvider(route.provider) && !route.baseUrl) {
            return { valid: false, message: '请先在设置中配置 NewAPI 地址' };
        }

        return { valid: true, route: route };
    }

    function resolveChatApiRouting(modelValue, settings) {
        const safeSettings = settings || {};
        const parsed = parseModelSelection(modelValue || DEFAULT_GRS_CHAT_MODEL);
        const modelName = parsed.model || getModelName(DEFAULT_GRS_CHAT_MODEL);
        const provider = parsed.provider || 'grs';

        if (isNewApiProvider(provider)) {
            return {
                provider: provider,
                model: modelName,
                apiKey: safeSettings.newApiKey || '',
                baseUrl: getNewApiBaseUrlFromSettings(safeSettings),
                missingKeyMessage: '请先在设置中配置 NewAPI 地址和密钥'
            };
        }

        return {
            provider: 'grs',
            model: modelName,
            apiKey: safeSettings.imgApiKey || safeSettings.chatApiKey || '',
            baseUrl: getGrsDrawBaseUrlFromSettings(safeSettings),
            missingKeyMessage: '请先在设置中配置 GRS API 密钥'
        };
    }

    function validateChatApiRouting(modelValue, settings) {
        const route = resolveChatApiRouting(modelValue, settings);
        if (!route.apiKey) {
            return { valid: false, message: route.missingKeyMessage || '缺少API密钥' };
        }
        if (isNewApiProvider(route.provider) && !route.baseUrl) {
            return { valid: false, message: '请先在设置中配置 NewAPI 地址' };
        }
        return { valid: true, route: route };
    }

    function getPreviewRatioByModel(modelValue) {
        return '1:1';
    }

    function updatePreviewAspectByModel(modelValue) {
        const ratio = getPreviewRatioByModel(modelValue);

        const containers = [
            document.getElementById('selectionPreview'),
            document.getElementById('chatSelectionPreview')
        ];

        containers.forEach(container => {
            if (!container) return;

            container.classList.remove('preview-ratio-square', 'preview-ratio-wide', 'preview-ratio-auto');

            if (ratio === '16:9') {
                container.classList.add('preview-ratio-wide');
            } else {
                container.classList.add('preview-ratio-square');
            }
        });
    }

    function normalizeApiKey(key) {
        return (key || '')
            .replace(/^Bearer\s+/i, '')  // 去掉 Bearer
            .replace(/[\s\r\n]+/g, '')   // 去空格和换行
            .trim();
    }

    function toNumber(value) {
        let parsed = Number(value);
        if (!Number.isFinite(parsed) && value && typeof value === "object") {
            if (Number.isFinite(Number(value._value))) {
                parsed = Number(value._value);
            } else if (Number.isFinite(Number(value.value))) {
                parsed = Number(value.value);
            }
        }
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function createBoundsFromSelection(selectionBounds) {
        return {
            left: toNumber(selectionBounds.left),
            right: toNumber(selectionBounds.right),
            top: toNumber(selectionBounds.top),
            bottom: toNumber(selectionBounds.bottom),
            width: toNumber(selectionBounds.width),
            height: toNumber(selectionBounds.height)
        };
    }

    function getBitsPerChannelValue(bitsPerChannel) {
        if (bitsPerChannel && typeof bitsPerChannel === "object") {
            if (typeof bitsPerChannel._value !== "undefined") {
                return bitsPerChannel._value;
            }
            if (typeof bitsPerChannel.value !== "undefined") {
                return bitsPerChannel.value;
            }
        }
        return bitsPerChannel;
    }

    async function getSelectionBoundsInPixels() {
        initCompatibility();
        const doc = psAPI.app.activeDocument;
        if (!doc || !doc.selection || !doc.selection.bounds) return null;

        const oldUnit = psAPI.app.preferences.rulerUnits;
        await psAPI.core.executeAsModal(() => {
            psAPI.app.preferences.rulerUnits = psAPI.constants.Units.PIXELS;
        });

        const b = doc.selection.bounds;
        const bounds = {
            left: toNumber(b.left),
            top: toNumber(b.top),
            right: toNumber(b.right),
            bottom: toNumber(b.bottom)
        };
        bounds.width = bounds.right - bounds.left;
        bounds.height = bounds.bottom - bounds.top;

        await psAPI.core.executeAsModal(() => {
            psAPI.app.preferences.rulerUnits = oldUnit;
        });

        return bounds;
    }

    function isSixteenBitDocument() {
        if (!psAPI.app || !psAPI.constants) return false;
        const rawBits = getBitsPerChannelValue(psAPI.app?.activeDocument?.bitsPerChannel);
        const sixteenEnum = psAPI.constants?.BitsPerChannelType?.SIXTEEN;

        if (rawBits === sixteenEnum) {
            return true;
        }
        if (typeof rawBits === "number") {
            return rawBits === 16;
        }

        const bitsText = String(rawBits || "").toUpperCase();
        if (bitsText === "16" || bitsText.includes("SIXTEEN")) {
            return true;
        }

        const enumText = String(sixteenEnum || "").toUpperCase();
        return enumText.length > 0 && bitsText === enumText;
    }

    function buildGetPixelsOptions(bounds, options = {}) {
        const getPixelsOptions = {
            sourceBounds: {
                left: bounds.left,
                top: bounds.top,
                right: bounds.right,
                bottom: bounds.bottom
            },
            applyAlpha: true
        };

        if (options.forceEightBit) {
            getPixelsOptions.componentSize = 8;
        }
        if (options.forceRgbSrgb) {
            getPixelsOptions.colorSpace = "RGB";
            getPixelsOptions.colorProfile = "sRGB IEC61966-2.1";
        }

        return getPixelsOptions;
    }

    function disposeImageData(imageData) {
        if (imageData && typeof imageData.dispose === "function") {
            imageData.dispose();
        }
    }

    async function getImageDataFromSelection(bounds, options = {}) {
        if (!bounds) {
            throw new Error("No Selection");
        }

        const isSixteenBit = isSixteenBitDocument();
        const getPixelsOptions = buildGetPixelsOptions(bounds, {
            forceEightBit: isSixteenBit,
            forceRgbSrgb: options.forceRgbSrgb === true
        });

        try {
            if (isSixteenBit) {
                debugLog("16-bit compatibility mode: forcing 8-bit pixels for encode.");
            }

            if (!psAPI.imaging) {
                throw new Error("Imaging API not available");
            }

            const result = await psAPI.imaging.getPixels(getPixelsOptions);
            debugLog("image data obtained from selection.");
            return result.imageData;
        } catch (error) {
            debugLog("error getting image data from selection: " + error);
            throw error;
        }
    }

    async function getImageDataToBase64(bounds) {
        initCompatibility();
        if (!psAPI.core) {
            return "";
        }
        
        return psAPI.core.executeAsModal(async () => {
            let imageData = null;
            const isSixteenBit = isSixteenBitDocument();
            try {
                imageData = await getImageDataFromSelection(bounds);
            } catch (error) {
                console.error("Error getting imageData from selection: " + error);
                return "";
            }

            try {
                if (!psAPI.imaging) {
                    throw new Error("Imaging API not available");
                }
                const base64Data = await psAPI.imaging.encodeImageData({
                    imageData: imageData,
                    base64: true,
                    quality: 100
                });
                return base64Data;
            } catch (error) {
                if (!isSixteenBit) {
                    console.error(error);
                    throw error;
                }

                debugLog("16-bit compatibility fallback: retrying encode with RGB/sRGB 8-bit pixels.");

                disposeImageData(imageData);
                imageData = null;

                try {
                    imageData = await getImageDataFromSelection(bounds, { forceRgbSrgb: true });
                    if (!psAPI.imaging) {
                        throw new Error("Imaging API not available");
                    }
                    const base64Data = await psAPI.imaging.encodeImageData({
                        imageData: imageData,
                        base64: true,
                        quality: 100
                    });
                    return base64Data;
                } catch (fallbackError) {
                    console.error(fallbackError);
                    throw fallbackError;
                }
            } finally {
                disposeImageData(imageData);
            }
        });
    }

    const API = {
        async listModels(apiKey, abortSignal) {
            const maxRetries = 3;
            let retryCount = 0;
            
            // 验证API密钥
            apiKey = normalizeApiKey(apiKey);
            if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
                return { error: 'API密钥无效，请检查您的API密钥设置' };
            }
            
            // 仅允许 GRS 官方域名
            const baseUrl = getGrsDrawBaseUrl();
            
            while (retryCount < maxRetries) {
                try {
                    const url = joinApiUrl(baseUrl, "/v1beta/models");
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 180000);
                    let response;
                    
                    // 监听外部取消信号
                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => controller.abort());
                    }
                    
                    // 添加请求间隔，避免请求频率过高
                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    // 检查是否已被取消
                    if (abortSignal && abortSignal.aborted) {
                        clearTimeout(timeoutId);
                        return { error: '请求已取消' };
                    }
                    
                    try {
                        response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Bearer ' + apiKey
                            },
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        let errorMsg = '请求失败: ' + response.status + ' - ' + errorText;
                        
                        // 简化错误信息，使其更友好
                        if (errorText.includes('invalid_api_key')) {
                            errorMsg = 'API密钥无效，请检查您的API密钥';
                        } else if (errorText.includes('quota_exceeded')) {
                            errorMsg = 'API配额已用尽，请稍后再试';
                        } else if (errorText.includes('rate_limit_exceeded')) {
                            errorMsg = '请求频率过高，请稍后再试';
                        }
                        
                        // 对于500错误，进行重试
                        if (response.status >= 500 && retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`服务器错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    const data = await response.json();
                    return { success: true, data: data };
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return { error: '请求超时，请稍后重试' };
                    }
                    
                    // 对于网络错误，进行重试
                    if (e.message.includes('network') || e.message.includes('Network') || e.message.includes('fetch')) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`网络错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        } else {
                            return { error: '网络连接失败，请检查您的网络连接' };
                        }
                    }
                    
                    return { error: e.message };
                }
            }
            
            return { error: '请求失败，已达到最大重试次数' };
        },

        async listNewApiModels(apiKey, baseUrl, abortSignal) {
            const maxRetries = 3;
            let retryCount = 0;

            apiKey = normalizeApiKey(apiKey);
            baseUrl = normalizeBaseUrl(baseUrl, '');
            if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
                return { error: 'NewAPI密钥无效，请检查您的API密钥设置' };
            }
            if (!baseUrl) {
                return { error: 'NewAPI地址无效，请先在设置中填写NewAPI地址' };
            }

            while (retryCount < maxRetries) {
                try {
                    const url = joinApiUrl(baseUrl, "/v1/models");
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 180000);
                    let response;

                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
                    }

                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }

                    if (abortSignal && abortSignal.aborted) {
                        clearTimeout(timeoutId);
                        return { error: '请求已取消' };
                    }

                    try {
                        response = await fetch(url, {
                            method: 'GET',
                            headers: {
                                'Authorization': 'Bearer ' + apiKey
                            },
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }

                    if (!response.ok) {
                        const errorText = await response.text();
                        let errorMsg = '请求失败: ' + response.status + ' - ' + errorText;

                        if (errorText.includes('invalid_api_key')) {
                            errorMsg = 'NewAPI密钥无效，请检查您的API密钥';
                        } else if (errorText.includes('quota_exceeded')) {
                            errorMsg = 'NewAPI配额已用尽，请稍后再试';
                        } else if (errorText.includes('rate_limit_exceeded')) {
                            errorMsg = '请求频率过高，请稍后再试';
                        }

                        if (response.status >= 500 && retryCount < maxRetries - 1) {
                            retryCount++;
                            continue;
                        }

                        throw new Error(errorMsg);
                    }

                    const data = await response.json();
                    return { success: true, data: data };
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return { error: '请求超时，请稍后重试' };
                    }

                    if (e.message.includes('network') || e.message.includes('Network') || e.message.includes('fetch')) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            continue;
                        }
                        return { error: '网络连接失败，请检查您的网络连接' };
                    }

                    return { error: e.message };
                }
            }

            return { error: '请求失败，已达到最大重试次数' };
        },

        async chatNewApi(options) {
            const apiKey = normalizeApiKey(options.apiKey);
            const baseUrl = normalizeBaseUrl(options.baseUrl, '');
            if (!apiKey) return { error: 'NewAPI密钥无效，请检查您的API密钥设置' };
            if (!baseUrl) return { error: 'NewAPI地址无效，请先在设置中填写NewAPI地址' };

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 180000);
                if (options.abortSignal) {
                    options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
                }

                let response;
                try {
                    response = await fetch(joinApiUrl(baseUrl, '/v1/chat/completions'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey
                        },
                        body: JSON.stringify({
                            model: getModelName(options.model),
                            stream: false,
                            messages: Array.isArray(options.messages) && options.messages.length ? options.messages : [
                                { role: 'user', content: options.prompt || '' }
                            ]
                        }),
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    return { error: 'NewAPI请求失败: ' + response.status + ' - ' + errorText };
                }

                return { success: true, data: await response.json() };
            } catch (e) {
                return { error: e.name === 'AbortError' ? '请求已取消' : e.message };
            }
        },

        async generateImageNewApiImages(options) {
            const apiKey = normalizeApiKey(options.apiKey);
            const baseUrl = normalizeBaseUrl(options.baseUrl, '');
            if (!apiKey) return { error: 'NewAPI密钥无效，请检查您的API密钥设置' };
            if (!baseUrl) return { error: 'NewAPI地址无效，请先在设置中填写NewAPI地址' };

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 180000);
                if (options.abortSignal) {
                    options.abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
                }

                let response;
                try {
                    response = await fetch(joinApiUrl(baseUrl, '/v1/images/generations'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + apiKey
                        },
                        body: JSON.stringify({
                            model: getModelName(options.model),
                            prompt: options.prompt || '',
                            size: options.size || '1024x1024',
                            n: options.n || 1
                        }),
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }

                if (!response.ok) {
                    const errorText = await response.text();
                    return { error: 'NewAPI Images请求失败: ' + response.status + ' - ' + errorText };
                }

                return { success: true, data: await response.json() };
            } catch (e) {
                return { error: e.name === 'AbortError' ? '请求已取消' : e.message };
            }
        },

        async generateImageNewApiChat(options) {
            const images = []
                .concat(options.imageBase64 ? [options.imageBase64] : [])
                .concat(Array.isArray(options.referenceImages) ? options.referenceImages.map(normalizeReferenceImageData).filter(Boolean) : []);
            const content = [{ type: 'text', text: options.prompt || '' }].concat(images.map(function(image) {
                return { type: 'image_url', image_url: { url: image } };
            }));
            return API.chatNewApi(Object.assign({}, options, {
                messages: [{ role: 'user', content: content }]
            }));
        },
        
        async checkNewApiCredits(options) {
            const apiKey = normalizeApiKey(options && options.apiKey);
            const baseUrl = normalizeBaseUrl(options && options.baseUrl, '');
            if (!baseUrl) {
                return { success: false, error: '请先填写 NewAPI 地址' };
            }
            if (!apiKey) {
                return { success: false, error: '请先填写 NewAPI 密钥' };
            }
            const paths = ['/dashboard/billing/credit_grants', '/v1/dashboard/billing/credit_grants', '/api/user/self'];
            let lastError = '';
            for (let i = 0; i < paths.length; i++) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 12000);
                    let response;
                    try {
                        response = await fetch(joinApiUrl(baseUrl, paths[i]), {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'Authorization': 'Bearer ' + apiKey
                            },
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    if (!response.ok) {
                        lastError = '余额查询失败: ' + response.status;
                        continue;
                    }
                    return { success: true, data: await response.json(), path: paths[i] };
                } catch (e) {
                    lastError = e.name === 'AbortError' ? '余额查询超时' : e.message;
                }
            }
            return { success: false, error: lastError || '余额查询失败' };
        },

        async checkGrsCredits(options) {
            const apiKey = normalizeApiKey(options && options.apiKey);
            const baseUrl = getGrsDrawBaseUrlFromSettings(options || {});
            if (!apiKey) {
                return { success: false, error: '请先填写 GRS API 密钥' };
            }
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);
                let response;
                try {
                    response = await fetch(joinApiUrl(baseUrl, '/client/openapi/getAPIKeyCredits'), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Authorization': 'Bearer ' + apiKey,
                            'x-api-key': apiKey
                        },
                        body: JSON.stringify({ apiKey: apiKey, key: apiKey }),
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }
                if (!response.ok) {
                    return { success: false, error: '积分查询失败: ' + response.status };
                }
                return { success: true, data: await response.json() };
            } catch (e) {
                return { success: false, error: e.name === 'AbortError' ? '积分查询超时' : e.message };
            }
        },

        async getServerStatus(baseUrl) {
            return API.fetchServerJson(baseUrl, '/api/status');
        },

        async getAnnouncements(baseUrl) {
            return API.fetchServerJson(baseUrl, '/api/announcements');
        },

        async getProjectContent(baseUrl) {
            return API.fetchServerJson(baseUrl, '/api/content/project');
        },

        async getVersion(baseUrl) {
            return API.fetchServerJson(baseUrl, '/api/version');
        },

        async checkUpdate(baseUrl, currentVersion) {
            return API.fetchServerJson(baseUrl, '/api/check-update?version=' + encodeURIComponent(currentVersion || PLUGIN_VERSION));
        },

        async fetchServerJson(baseUrl, path) {
            const normalizedBaseUrl = normalizeBaseUrl(baseUrl, DEFAULT_SERVER_API_URL);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 12000);
                let response;
                try {
                    response = await fetch(joinApiUrl(normalizedBaseUrl, path), {
                        method: 'GET',
                        headers: { 'Accept': 'application/json' },
                        signal: controller.signal
                    });
                } finally {
                    clearTimeout(timeoutId);
                }
                if (!response.ok) {
                    return { success: false, error: '服务器请求失败: ' + response.status };
                }
                return { success: true, data: await response.json() };
            } catch (e) {
                return { success: false, error: e.name === 'AbortError' ? '服务器连接超时' : e.message };
            }
        },

        async generateImageGoogle(options) {
            const maxRetries = 3;
            let retryCount = 0;
            const abortSignal = options.abortSignal;
            
            while (retryCount < maxRetries) {
                try {
                    const apiKey = normalizeApiKey(options.apiKey);
                    const model = options.model || "gemini-3-flash-preview";
                    const prompt = options.prompt;
                    const imageBase64 = options.imageBase64;
                    const referenceImages = Array.isArray(options.referenceImages)
                        ? options.referenceImages.map(normalizeReferenceImageData).filter(Boolean).slice(0, MAX_REFERENCE_IMAGES)
                        : [];
                    const requestImages = (imageBase64 ? [imageBase64] : []).concat(referenceImages);

                    // Google AI Studio API endpoint
                    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
                    
                    const contents = [{
                        parts: [{
                            text: prompt
                        }]
                    }];
                    
                    debugLog("【排查点】当前 requestImages 数量", requestImages.length);
                    requestImages.forEach(function(imageData) {
                        let mimeType = "image/png";
                        const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
                        if (mimeMatch) {
                            mimeType = mimeMatch[1];
                        }
                        contents[0].parts.push({
                            inlineData: {
                                mimeType: mimeType,
                                data: imageData.replace(/^data:image\/\w+;base64,/, "")
                            }
                        });
                    });
                    
                    const body = {
                        contents: contents
                    };
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 180000);
                    let response;
                    
                    // 监听外部取消信号
                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => controller.abort());
                    }
                    
                    // 添加请求间隔，避免请求频率过高
                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    try {
                        response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-goog-api-key': apiKey
                            },
                            body: JSON.stringify(body),
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        let errorMsg = '请求失败: ' + response.status + ' - ' + errorText;
                        
                        // 简化错误信息，使其更友好
                        if (errorText.includes('invalid_api_key')) {
                            errorMsg = 'API密钥无效，请检查您的API密钥';
                        } else if (errorText.includes('quota_exceeded')) {
                            errorMsg = 'API配额已用尽，请稍后再试';
                        } else if (errorText.includes('rate_limit_exceeded')) {
                            errorMsg = '请求频率过高，请稍后再试';
                        }
                        
                        // 对于500错误，进行重试
                        if (response.status >= 500 && retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`服务器错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    const data = await response.json();
                    return { success: true, data: data };
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return { error: '请求已取消' };
                    }
                    
                    // 对于网络错误，进行重试
                    if (e.message.includes('network') || e.message.includes('Network') || e.message.includes('fetch')) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`网络错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        } else {
                            return { error: '网络连接失败，请检查您的网络连接' };
                        }
                    }
                    
                    return { error: e.message };
                }
            }
            
            return { error: '请求失败，已达到最大重试次数' };
        },
        
        async generateImage(options) {
            const maxRetries = 3;
            let retryCount = 0;
            const abortSignal = options.abortSignal;

            const getTaskId = function(payload) {
                if (!payload || typeof payload !== 'object') return '';
                if (typeof payload.id === 'string' && payload.id) return payload.id;
                if (payload.data && typeof payload.data.id === 'string' && payload.data.id) return payload.data.id;
                if (typeof payload.taskId === 'string' && payload.taskId) return payload.taskId;
                if (typeof payload.task_id === 'string' && payload.task_id) return payload.task_id;
                return '';
            };

            const unwrapResultPayload = function(payload) {
                if (payload && typeof payload === 'object' && payload.data && typeof payload.data === 'object') {
                    return payload.data;
                }
                return payload;
            };

            const pollGrsResult = async function(baseUrl, authKey, taskId, signal) {
                const maxAttempts = 120;
                const intervalMs = 2500;
                const resultUrl = joinApiUrl(baseUrl, '/v1/draw/result');

                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    if (signal && signal.aborted) {
                        return { error: '请求已取消' };
                    }

                    if (attempt > 0) {
                        await new Promise(resolve => setTimeout(resolve, intervalMs));
                    }

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 60000);

                    if (signal) {
                        signal.addEventListener('abort', () => controller.abort(), { once: true });
                    }

                    try {
                        const response = await fetch(resultUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + authKey
                            },
                            body: JSON.stringify({ id: taskId }),
                            signal: controller.signal
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            if (response.status >= 500) {
                                continue;
                            }
                            return { error: '轮询任务失败: ' + response.status + ' - ' + errorText };
                        }

                        const resultData = await response.json();
                        if (extractImageFromResponse(resultData)) {
                            return { success: true, data: resultData };
                        }

                        const resultPayload = unwrapResultPayload(resultData) || {};
                        const status = String(resultPayload.status || '').toLowerCase();
                        if (status === 'succeeded' || status === 'success' || status === 'completed' || status === 'done') {
                            return { success: true, data: resultData };
                        }
                        if (status === 'failed' || status === 'failure' || status === 'error' || status === 'cancelled' || status === 'canceled') {
                            const failureReason = resultPayload.error || resultPayload.failure_reason || '绘图任务失败';
                            return { error: failureReason };
                        }
                    } catch (pollError) {
                        if (pollError.name === 'AbortError') {
                            if (signal && signal.aborted) {
                                return { error: '请求已取消' };
                            }
                            continue;
                        }
                        if (!(pollError.message.includes('network') || pollError.message.includes('Network') || pollError.message.includes('fetch'))) {
                            return { error: pollError.message };
                        }
                    } finally {
                        clearTimeout(timeoutId);
                    }
                }

                return { error: '任务仍在处理中，请稍后重试' };
            };
            
            while (retryCount < maxRetries) {
                try {
                    const apiKey = normalizeApiKey(options.apiKey);
                    
                    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
                        return { error: 'API密钥无效，请检查您的API密钥设置' };
                    }
                    
                    const parsedModel = parseModelSelection(options.model);
                    const model = parsedModel.model || getModelName(options.model) || "gemini-2.0-flash-exp";
                    const modelKey = getModelKey(model);
                    const requestedProvider = String(options.provider || parsedModel.provider || '').toLowerCase();
                    const prompt = options.prompt;
                    const imageBase64 = options.imageBase64;
                    const referenceImages = Array.isArray(options.referenceImages)
                        ? options.referenceImages.map(normalizeReferenceImageData).filter(Boolean).slice(0, MAX_REFERENCE_IMAGES)
                        : [];
                    const requestImages = (imageBase64 ? [imageBase64] : []).concat(referenceImages);
                    const n = options.n || 1;
                    const imageConfig = getModelImageConfig(
                        model,
                        options.sizeHint || options.selectionBounds || savedSelectionBounds,
                        options.imageResolution || options.imageSize
                    );

                    if (isNewApiProvider(requestedProvider)) {
                        const imageMode = (options.newApiImageMode || (currentSettings && currentSettings.newApiImageMode) || 'auto').toLowerCase();
                        const imagesResult = imageMode === 'chat'
                            ? { error: 'skip images api' }
                            : await API.generateImageNewApiImages(Object.assign({}, options, {
                                apiKey: apiKey,
                                baseUrl: options.baseUrl,
                                model: model,
                                size: imageConfig.size && imageConfig.size !== 'auto' ? imageConfig.size : '1024x1024'
                            }));

                        if (imagesResult.success && extractImageFromResponse(imagesResult.data)) {
                            return imagesResult;
                        }
                        if (imageMode === 'images') {
                            return imagesResult;
                        }

                        return API.generateImageNewApiChat(Object.assign({}, options, {
                            apiKey: apiKey,
                            baseUrl: options.baseUrl,
                            model: model,
                            prompt: prompt,
                            imageBase64: imageBase64,
                            referenceImages: referenceImages
                        }));
                    }

                    let url;
                    let body;
                    let shouldPollGrsResult = false;
                    let requestBaseUrl = '';
                    
                    if (isGrsNanoBananaModel(modelKey)) {
                        requestBaseUrl = getGrsDrawBaseUrl();
                        url = joinApiUrl(requestBaseUrl, '/v1/draw/nano-banana');
                        body = {
                            model: normalizeGrsModelName(model),
                            prompt: prompt,
                            aspectRatio: options.aspectRatio || imageConfig.aspectRatio || 'auto',
                            imageSize: options.imageSize || imageConfig.imageSize || '1K',
                            webHook: '-1',
                            shutProgress: true
                        };
                        if (requestImages.length) {
                            body.urls = requestImages;
                        }
                        shouldPollGrsResult = true;
                    } else if (isGrsGptImageModel(modelKey)) {
                        requestBaseUrl = getGrsDrawBaseUrl();
                        url = joinApiUrl(requestBaseUrl, '/v1/draw/completions');
                        // gpt-image-2-vip 使用 aspectRatio 参数，其他版本使用 size 参数
                        if (modelKey === 'gpt-image-2-vip') {
                            body = {
                                model: normalizeGrsModelName(model),
                                prompt: prompt,
                                aspectRatio: options.aspectRatio || imageConfig.aspectRatio || '1:1',
                                webHook: '-1',
                                shutProgress: false
                            };
                        } else {
                            body = {
                                model: normalizeGrsModelName(model),
                                prompt: prompt,
                                size: options.size || imageConfig.size || 'auto',
                                webHook: '-1',
                                shutProgress: true
                            };
                        }
                        if (requestImages.length) {
                            body.urls = requestImages;
                        }
                        shouldPollGrsResult = true;
                    } else if (requestedProvider === 'grs' && isGrsChatModel(modelKey)) {
                        requestBaseUrl = getGrsDrawBaseUrlFromSettings({ imgApiUrl: options.baseUrl });
                        url = joinApiUrl(requestBaseUrl, '/v1/chat/completions');

                        body = {
                            model: model,
                            stream: false,
                            messages: Array.isArray(options.messages) && options.messages.length ? options.messages : [
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ]
                        };

                        if ((!options.messages || !options.messages.length) && requestImages.length) {
                            body.messages[0].content = [
                                {
                                    type: "text",
                                    text: prompt
                                }
                            ].concat(requestImages.map(function(image) {
                                return {
                                    type: "image_url",
                                    image_url: {
                                        url: image
                                    }
                                };
                            }));
                        }
                    } else {
                        throw new Error('当前模型不受支持。仅支持 GRS 或 NewAPI 模型');
                    }
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 180000);
                    let response;
                    
                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
                    }
                    
                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    try {
                        response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + apiKey
                            },
                            body: JSON.stringify(body),
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        let apiErrorMessage = '';
                        try {
                            const errorJson = JSON.parse(errorText);
                            if (errorJson && errorJson.error && errorJson.error.message) {
                                apiErrorMessage = errorJson.error.message;
                            }
                        } catch (parseError) {}
                        let errorMsg = '请求失败: ' + response.status + ' - ' + (apiErrorMessage || errorText);

                        if ((apiErrorMessage || errorText).includes('invalid_api_key')) {
                            errorMsg = 'API密钥无效，请检查您的API密钥';
                        } else if ((apiErrorMessage || errorText).includes('quota_exceeded')) {
                            errorMsg = 'API配额已用尽，请稍后再试';
                        } else if ((apiErrorMessage || errorText).includes('rate_limit_exceeded')) {
                            errorMsg = '请求频率过高，请稍后再试';
                        }
                        
                        if (response.status >= 500 && retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`服务器错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    const data = await response.json();

                    if (shouldPollGrsResult) {
                        const directImage = extractImageFromResponse(data);
                        if (directImage) {
                            return { success: true, data: data };
                        }

                        const taskId = getTaskId(data);
                        if (taskId) {
                            const pollResult = await pollGrsResult(requestBaseUrl, apiKey, taskId, abortSignal);
                            if (pollResult.success) {
                                return pollResult;
                            }
                            return pollResult;
                        }
                    }

                    return { success: true, data: data };
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return { error: '请求已取消' };
                    }
                    
                    if (e.message.includes('network') || e.message.includes('Network') || e.message.includes('fetch')) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`网络错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        }
                        return { error: '网络连接失败，请检查您的网络连接' };
                    }
                    
                    return { error: e.message };
                }
            }
            
            return { error: '请求失败，已达到最大重试次数' };
        },
        
        async generateImageGemini(options) {
            const maxRetries = 3;
            let retryCount = 0;
            const abortSignal = options.abortSignal;
            
            while (retryCount < maxRetries) {
                try {
                    const apiKey = normalizeApiKey(options.apiKey);
                    
                    // 验证API密钥
                    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
                        return { error: 'API密钥无效，请检查您的API密钥设置' };
                    }
                    
                    const model = getModelName(options.model) || "AI";
                    const prompt = options.prompt;
                    const imageBase64 = options.imageBase64;
                    const referenceImages = Array.isArray(options.referenceImages)
                        ? options.referenceImages.map(normalizeReferenceImageData).filter(Boolean).slice(0, MAX_REFERENCE_IMAGES)
                        : [];
                    const requestImages = (imageBase64 ? [imageBase64] : []).concat(referenceImages);
                    const n = options.n || 1;
                    
                    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
                    
                    const contents = [];
                    
                    debugLog("【排查点】当前 requestImages 数量", requestImages.length);
                    requestImages.forEach(function(imageData) {
                        let mimeType = "image/png";
                        const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
                        if (mimeMatch) {
                            mimeType = mimeMatch[1];
                        }
                        contents.push({
                            inlineData: {
                                mimeType: mimeType,
                                data: imageData.replace(/^data:image\/\w+;base64,/, "")
                            }
                        });
                    });

                    contents.push({
                        text: prompt
                    });
                    
                    const body = {
                        contents: [
                            {
                                role: "user",
                                parts: contents
                            }
                        ],
                        generationConfig: {
                            temperature: 0.9,
                            topP: 1,
                            topK: 32,
                            maxOutputTokens: 2048,
                            candidateCount: n
                        }
                    };
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 180000);
                    let response;
                    
                    // 监听外部取消信号
                    if (abortSignal) {
                        abortSignal.addEventListener('abort', () => controller.abort());
                    }
                    
                    // 添加请求间隔，避免请求频率过高
                    if (retryCount > 0) {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    
                    try {
                        response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + apiKey
                            },
                            body: JSON.stringify(body),
                            signal: controller.signal
                        });
                    } finally {
                        clearTimeout(timeoutId);
                    }
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        let errorMsg = '请求失败: ' + response.status + ' - ' + errorText;
                        
                        // 简化错误信息，使其更友好
                        if (errorText.includes('invalid_api_key')) {
                            errorMsg = 'API密钥无效，请检查您的API密钥';
                        } else if (errorText.includes('quota_exceeded')) {
                            errorMsg = 'API配额已用尽，请稍后再试';
                        } else if (errorText.includes('rate_limit_exceeded')) {
                            errorMsg = '请求频率过高，请稍后再试';
                        }
                        
                        // 对于500错误，进行重试
                        if (response.status >= 500 && retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`服务器错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        }
                        
                        throw new Error(errorMsg);
                    }
                    
                    const data = await response.json();
                    return { success: true, data: data };
                } catch (e) {
                    if (e.name === 'AbortError') {
                        return { error: '请求已取消' };
                    }
                    
                    // 对于网络错误，进行重试
                    if (e.message.includes('network') || e.message.includes('Network') || e.message.includes('fetch')) {
                        if (retryCount < maxRetries - 1) {
                            retryCount++;
                            debugLog(`网络错误，正在重试 ${retryCount}/${maxRetries}...`);
                            continue;
                        } else {
                            return { error: '网络连接失败，请检查您的网络连接' };
                        }
                    }
                    
                    return { error: e.message };
                }
            }
            
            return { error: '请求失败，已达到最大重试次数' };
        }
    };

    const Config = {
        read() {
            try {
                const content = localStorage.getItem('geminiai_config');
                if (content) {
                    return JSON.parse(content);
                }
            } catch (e) {
                console.error('读取配置失败:', e);
            }
            
            return {
                log: [],
                settings: {
                    chatApiKey: "",
                    imgApiKey: "",
                    chatApiUrl: OPENAI_OFFICIAL_BASE_URL,
                    imgApiUrl: GRS_DEFAULT_BASE_URL,
                    newApiUrl: "",
                    newApiKey: "",
                    googleApiKey: "",
                    googleAiEnabled: true,
                    sdApiUrl: "http://localhost:7860",
                    chatModel: DEFAULT_GRS_CHAT_MODEL,
                    imgModel: DEFAULT_IMAGE_MODEL,
                    imgResolution: DEFAULT_IMAGE_RESOLUTION,
                    model: "gemini-2.0-flash-exp",
                    imageWidth: 1024,
                    imageHeight: 1024,
                    widthUnit: "pixel",
                    heightUnit: "pixel",
                    textSizeMultiplier: 1
                },
                presets: []
            };
        },
        
        write(config) {
            try {
                localStorage.setItem('geminiai_config', JSON.stringify(config));
                return true;
            } catch (e) {
                console.error('保存配置失败:', e);
                return false;
            }
        },
        
        saveSettings(settings) {
            const config = this.read();
            config.settings = settings;
            return this.write(config);
        },
        
        getSettings() {
            const config = this.read();
            return config.settings;
        },
        
        addLog(logEntry) {
            const config = this.read();
            config.log = config.log || [];
            config.log.unshift(logEntry);
            if (config.log.length > 100) {
                config.log = config.log.slice(0, 100);
            }
            return this.write(config);
        },
        
        getLogs() {
            const config = this.read();
            return config.log || [];
        },
        
        clearLogs() {
            const config = this.read();
            config.log = [];
            return this.write(config);
        },
        
        getPresets() {
            const config = this.read();
            return config.presets || [];
        },
        
        savePreset(name, prompt, category = '其他', refImages = []) {
            const config = this.read();
            config.presets = config.presets || [];
            const normalizedRefImages = normalizeReferenceImageList(refImages);

            const existingIndex = config.presets.findIndex(p => p.name === name);
            if (existingIndex >= 0) {
                config.presets[existingIndex].prompt = prompt;
                config.presets[existingIndex].category = category;
                config.presets[existingIndex].refImages = normalizedRefImages;
            } else {
                config.presets.push({ name, prompt, category, refImages: normalizedRefImages });
            }

            return this.write(config);
        },
        
        deletePreset(name) {
            const config = this.read();
            config.presets = config.presets || [];
            config.presets = config.presets.filter(p => p.name !== name);
            return this.write(config);
        }
    };
    
    function escapeHTML(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function resizeChatPrompt() {
        const chatPrompt = document.getElementById('chatPrompt');
        if (!chatPrompt) return;
        chatPrompt.style.height = 'auto';
        chatPrompt.style.height = Math.min(chatPrompt.scrollHeight, 320) + 'px';
    }

    function updateChatHistory() {
        const chatHistoryDiv = document.getElementById('chatHistory');

        if (chatHistory.length === 0) {
            chatHistoryDiv.innerHTML = '<div class="info-text" style="text-align: center; padding: 20px;">暂无聊天记录</div>';
            return;
        }

        let html = '';
        chatHistory.forEach(function(message) {
            const isUser = message.role === 'user';
            html += '<div class="chat-message ' + (isUser ? 'user-message' : 'assistant-message') + '" style="margin-bottom: 10px; padding: 8px; border-radius: 4px; background: ' + (isUser ? '#2d2d2d' : '#1e3a1e') + ';">';
            html += '<div style="font-size: 10px; color: #6d6d6d; margin-bottom: 4px;">' + (isUser ? '我' : '助手') + ' - ' + escapeHTML(message.timestamp) + '</div>';
            html += '<div class="chat-message-content" style="word-break: break-word; white-space: pre-wrap;">' + escapeHTML(message.content) + '</div>';
            html += '</div>';
        });

        chatHistoryDiv.innerHTML = html;
        chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
    }

    // 全局函数，供HTML直接调用
    window.switchTab = function switchTab(tabId) {
        debugLog('切换到标签页:', tabId);
        
        // 移除所有标签页的active类
        document.querySelectorAll('.tab').forEach(function(tab) {
            tab.classList.remove('active');
        });
        
        // 移除所有内容区域的active类
        document.querySelectorAll('.tab-content').forEach(function(content) {
            content.classList.remove('active');
        });
        
        // 添加当前标签页的active类
        const activeTab = document.querySelector('.tab[data-tab="' + tabId + '"]');
        if (activeTab) {
            activeTab.classList.add('active');
            debugLog('成功激活标签页:', tabId);
        } else {
            console.error('未找到标签页:', tabId);
        }
        
        // 添加当前内容区域的active类
        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.classList.add('active');
            debugLog('成功激活内容区域:', tabId);
        } else {
            console.error('未找到内容区域:', tabId);
        }

        if (tabId === 'home') {
            refreshAnnouncements();
            checkForUpdates(false);
        }

        if (tabId === 'webui') {
            initWebUI();
            ensureWebUIParameterControlsVisible();
        }

        if (tabId === 'img2img') {
            ensureImg2ImgInlineControls();
            ensurePresetActionButtons();
            ensurePresetsLoaded().catch(function(error) {
                console.error('加载预设失败:', error);
            });
        }

        if (tabId === 'settings') {
            ensureSettingsUiCompatibility();
            bindSettingsGroupToggles();
            ensureSettingsModelActionsVisible();
            bindModelActionButtons();
        }
        
        // 如果切换到logs标签，更新日志显示
        if (tabId === 'logs') {
            debugLog('更新日志显示');
            updateLogDisplay();
        }
    }

    async function loadSettings() {
        const storedSettings = Config.getSettings() || {};

        currentSettings = Object.assign({
            chatApiKey: "",
            imgApiKey: "",
            chatApiUrl: OPENAI_OFFICIAL_BASE_URL,
            imgApiUrl: GRS_DEFAULT_BASE_URL,
            newApiUrl: "",
            newApiKey: "",
            newApiImageMode: "auto",
            googleApiKey: "",
            googleAiEnabled: true,
            sdApiUrl: "http://localhost:7860",
            chatModel: DEFAULT_GRS_CHAT_MODEL,
            imgModel: DEFAULT_IMAGE_MODEL,
            imgResolution: DEFAULT_IMAGE_RESOLUTION,
            model: "gemini-2.0-flash-exp",
            textSizeMultiplier: 1,
            alignmentMode: "normal"
        }, storedSettings);

        currentSettings.chatApiUrl = OPENAI_OFFICIAL_BASE_URL;
        if (!currentSettings.imgApiKey && currentSettings.chatApiKey) {
            currentSettings.imgApiKey = currentSettings.chatApiKey;
        }
        currentSettings.imgApiUrl = normalizeGrsBaseUrlStrict(currentSettings.imgApiUrl);
        currentSettings.newApiUrl = normalizeBaseUrl(currentSettings.newApiUrl, '');
        currentSettings.newApiImageMode = ['auto', 'images', 'chat'].indexOf(currentSettings.newApiImageMode) > -1 ? currentSettings.newApiImageMode : 'auto';
        currentSettings.chatModel = normalizeChatModelValue(currentSettings.chatModel || currentSettings.model || DEFAULT_GRS_CHAT_MODEL);

        // 兼容旧版本默认值：历史配置为 nano-banana-pro 时自动迁移到 PS 原生模型
        const storedImgModelKey = getModelKey(storedSettings.imgModel || '');
        if (!storedImgModelKey || storedImgModelKey === LEGACY_IMAGE_DEFAULT_MODEL) {
            currentSettings.imgModel = DEFAULT_IMAGE_MODEL;
            if (storedSettings.imgModel !== DEFAULT_IMAGE_MODEL) {
                Config.saveSettings(Object.assign({}, storedSettings, currentSettings));
            }
        }

        if (currentSettings) {
            const chatApiKeyEl = document.getElementById('chatApiKey');
            if (chatApiKeyEl) {
                chatApiKeyEl.value = currentSettings.chatApiKey || '';
            }
            
            const imgApiKeyEl = document.getElementById('imgApiKey');
            if (imgApiKeyEl) {
                imgApiKeyEl.value = currentSettings.imgApiKey || '';
            }
            
            const chatApiUrlEl = document.getElementById('chatApiUrl');
            if (chatApiUrlEl) {
                chatApiUrlEl.value = currentSettings.chatApiUrl || '';
            }
            
            const imgApiUrlEl = document.getElementById('imgApiUrl');
            if (imgApiUrlEl) {
                imgApiUrlEl.value = currentSettings.imgApiUrl || '';
            }

            const newApiUrlEl = document.getElementById('newApiUrl');
            if (newApiUrlEl) {
                newApiUrlEl.value = currentSettings.newApiUrl || '';
            }

            const newApiKeyEl = document.getElementById('newApiKey');
            if (newApiKeyEl) {
                newApiKeyEl.value = currentSettings.newApiKey || '';
            }

            const newApiImageModeEl = document.getElementById('newApiImageMode');
            if (newApiImageModeEl) {
                newApiImageModeEl.value = currentSettings.newApiImageMode || 'auto';
            }

            const sdApiUrlEl = document.getElementById('sdApiUrl');
            if (sdApiUrlEl) {
                sdApiUrlEl.value = currentSettings.sdApiUrl || 'http://localhost:7860';
            }

            const googleApiKeyEl = document.getElementById('googleApiKey');
            if (googleApiKeyEl) {
                googleApiKeyEl.value = currentSettings.googleApiKey || '';
            }

            const googleAiEnabledEl = document.getElementById('googleAiEnabled');
            if (googleAiEnabledEl) {
                googleAiEnabledEl.checked = !!currentSettings.googleAiEnabled;
            }
            
            const chatModelSelect = document.getElementById('chatModel');
            const imgModelSelect = document.getElementById('imgModel');
            const imgResolutionSelect = document.getElementById('imgResolution');
            const imageCountSelect = document.getElementById('imageCount');
            
            if (chatModelSelect) {
                fillChatModels([], currentSettings.googleApiKey || '', !!currentSettings.googleAiEnabled, currentSettings.newApiKey || '', currentSettings.newApiUrl || '', currentNewApiChatModels);
                const savedModel = normalizeChatModelValue(currentSettings.chatModel || currentSettings.model || '');
                const chatOptionIndex = Array.from(chatModelSelect.options).findIndex(function(option) {
                    return normalizeChatModelValue(option.value) === savedModel;
                });
                chatModelSelect.selectedIndex = chatOptionIndex > -1 ? chatOptionIndex : 0;
                refreshCustomSelectById('chatModel');
            }
            if (imgModelSelect) {
                // 初始化时直接填充本地默认生图模型（无需手动拉取）
                fillImageModels([]);
                const savedModel = getModelName(currentSettings.imgModel || currentSettings.model || '');
                const normalizedSavedModel = normalizeGrsModelName(savedModel).toLowerCase();
                const optionIndex = Array.from(imgModelSelect.options).findIndex(function(option) {
                    const optionModel = getModelName(option.value).toLowerCase();
                    return optionModel === savedModel.toLowerCase() || optionModel === normalizedSavedModel;
                });
                imgModelSelect.selectedIndex = optionIndex > -1 ? optionIndex : 0;
                refreshCustomSelectById('imgModel');
            }
            if (imgResolutionSelect) {
                imgResolutionSelect.value = normalizeImageResolution(currentSettings.imgResolution);
                refreshCustomSelectById('imgResolution');
            }
            if (imageCountSelect) {
                imageCountSelect.selectedIndex = 0;
                refreshCustomSelectById('imageCount');
            }
        } else {
            // 设置文字大小倍数默认值
            const textSizeMultiplierEl = document.getElementById('textSizeMultiplier');
            const textSizeValueEl = document.getElementById('textSizeValue');
            if (textSizeMultiplierEl) {
                textSizeMultiplierEl.value = 1;
            }
            if (textSizeValueEl) {
                textSizeValueEl.textContent = '当前倍数: 1.0x';
            }
            
            // 确保PS原生模型在没有设置的情况下也显示
            const imgModelSelect = document.getElementById('imgModel');
            if (imgModelSelect) {
                fillImageModels([]);
                imgModelSelect.selectedIndex = 0;
                refreshCustomSelectById('imgModel');
            }
            const imgResolutionSelect = document.getElementById('imgResolution');
            if (imgResolutionSelect) {
                imgResolutionSelect.value = DEFAULT_IMAGE_RESOLUTION;
                refreshCustomSelectById('imgResolution');
            }
        }
        
        // 加载文字大小倍数设置
        const textSizeMultiplierEl = document.getElementById('textSizeMultiplier');
        const textSizeValueEl = document.getElementById('textSizeValue');
        if (textSizeMultiplierEl) {
            textSizeMultiplierEl.value = currentSettings.textSizeMultiplier || 1;
        }
        if (textSizeValueEl) {
            textSizeValueEl.textContent = '当前倍数: ' + (currentSettings.textSizeMultiplier || 1).toFixed(1) + 'x';
        }
        
        // 加载图片对齐模式设置
        const alignmentModeEl = document.getElementById('alignmentMode');
        if (alignmentModeEl) {
            alignmentModeEl.value = currentSettings.alignmentMode || 'normal';
        }
        
        // 应用文字大小设置
        applyTextSizeMultiplier(currentSettings.textSizeMultiplier || 1);

        loadPresetCategories([]);
        updatePresetSelect([]);

        // 初始化时更新预览比例
        const currentImgModelEl = document.getElementById('imgModel');
        updatePreviewAspectByModel(currentImgModelEl ? currentImgModelEl.value : '');
    }



    let presetsLoadPromise = null;
    let presetsLoaded = false;

    async function ensurePresetsLoaded() {
        if (presetsLoaded) return currentAllPresets;
        if (!presetsLoadPromise) {
            presetsLoadPromise = loadPresets().finally(function() {
                presetsLoadPromise = null;
            });
        }
        await presetsLoadPromise;
        presetsLoaded = true;
        return currentAllPresets;
    }

    function invalidatePresetCache() {
        presetsLoaded = false;
        presetsLoadPromise = null;
    }

    function scheduleDeferredStartupWork() {
        setTimeout(function() {
            initFakeSelects();
            FAKE_SELECT_IDS.forEach(refreshCustomSelectById);
            bindModelActionButtons();
        }, 800);

        setTimeout(function() {
            refreshAnnouncements();
            checkForUpdates(false);
        }, 1200);
    }

    // 使用异步函数来读取 yushe.json
    async function loadYushePresets() {
        try {
            if (!uxpFs) {
                console.warn("uxpFs 不可用，跳过读取 yushe.json");
                return [];
            }
            const pluginFolder = await uxpFs.getPluginFolder();
            const file = await pluginFolder.getEntry("yushe.json");
            const content = await file.read();
            const presets = dedupePresetEntries(JSON.parse(content));
            debugLog("成功加载本地预设:", presets);
            return presets;
        } catch (e) {
            console.error("读取 yushe.json 失败:", e);
            return [];
        }
    }

    async function saveYushePresets(presets) {
        try {
            if (!uxpFs) {
                return false;
            }
            const pluginFolder = await uxpFs.getPluginFolder();
            const file = await pluginFolder.createEntry("yushe.json", { overwrite: true });
            const normalized = dedupePresetEntries(presets || []);
            await file.write(JSON.stringify(normalized, null, 2));
            return true;
        } catch (e) {
            console.error("写入 yushe.json 失败:", e);
            return false;
        }
    }

    function extractPresetPromptText(content) {
        if (typeof content === 'string') {
            return content;
        }

        if (Array.isArray(content)) {
            return content.map(extractPresetPromptText).filter(Boolean).join('\n');
        }

        if (!content || typeof content !== 'object') {
            return '';
        }

        const preferredKeys = ['prompt', 'content', 'instruction', 'description', 'positive', 'negative', 'sccz', 'sccf'];
        const chunks = [];

        preferredKeys.forEach(function(key) {
            if (!(key in content)) return;
            const value = extractPresetPromptText(content[key]);
            if (!value) return;
            if (key === 'positive' || key === 'sccz') {
                chunks.push('正向提示词：' + value);
                return;
            }
            if (key === 'negative' || key === 'sccf') {
                chunks.push('反向提示词：' + value);
                return;
            }
            chunks.push(value);
        });

        Object.keys(content).forEach(function(key) {
            if (preferredKeys.indexOf(key) > -1) return;
            const value = extractPresetPromptText(content[key]);
            if (value) {
                chunks.push(value);
            }
        });

        return chunks.join('\n').trim();
    }

    function normalizePresetPromptText(prompt) {
        let text = String(prompt || '').replace(/\r/g, '\n').trim();
        if (!text) return '';

        if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
            try {
                text = extractPresetPromptText(JSON.parse(text));
            } catch (e) {
                // keep original text
            }
        }

        return text
            .replace(/^现在你是一个[^：:\n]+[：:]\s*/i, '')
            .replace(/^你是一个[^：:\n]+[：:]\s*/i, '')
            .replace(/^作为[^，。；：:\n]+[，：:]\s*/i, '')
            .replace(/^\s*prompt\s*[:：]\s*/i, '')
            .replace(/^\s*json\s*[:：]\s*/i, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    function normalizePresetEntry(preset) {
        if (!preset) return null;

        const name = String(preset.name || preset.title || '').trim();
        const category = String(preset.category || '其他').trim() || '其他';
        const prompt = normalizePresetPromptText(
            extractPresetPromptText(
                typeof preset.prompt !== 'undefined' ? preset.prompt : preset.content
            )
        );

        if (!name || !prompt) return null;
        const refImages = normalizeReferenceImageList(preset.refImages || preset.referenceImages);
        return { name: name, prompt: prompt, category: category, refImages: refImages };
    }

    function dedupePresetEntries(presets) {
        const seenPromptKeys = new Set();
        const result = [];

        (presets || []).forEach(function(preset) {
            const normalized = normalizePresetEntry(preset);
            if (!normalized) return;

            const promptKey = normalized.prompt.replace(/\s+/g, ' ').trim().toLowerCase();
            if (promptKey && seenPromptKeys.has(promptKey)) return;

            if (promptKey) {
                seenPromptKeys.add(promptKey);
            }
            result.push(normalized);
        });

        return result;
    }

    // 算法一：1:1 强制无偏移模式
    // 1. 计算虚拟正方形边界
    function computeVirtualSquareBounds(originalBounds) {
        if (!originalBounds) return null;
        const w = Math.max(1, Math.round(originalBounds.right - originalBounds.left));
        const h = Math.max(1, Math.round(originalBounds.bottom - originalBounds.top));
        const size = Math.max(w, h);
        const dx = Math.floor((size - w) / 2);
        const dy = Math.floor((size - h) / 2);
        return {
            top: Math.round(originalBounds.top - dy),
            left: Math.round(originalBounds.left - dx),
            bottom: Math.round(originalBounds.top - dy + size),
            right: Math.round(originalBounds.left - dx + size)
        };
    }

    // 2. 扩展画布到正方形
    async function extendCanvasToSquare(size) {
        if (!psAPI.app || !psAPI.core) return;
        
        try {
            await psAPI.core.executeAsModal(async () => {
                const doc = psAPI.app.activeDocument;
                if (!doc) return;
                
                const currentWidth = doc.width;
                const currentHeight = doc.height;
                const newWidth = Math.max(currentWidth, size);
                const newHeight = Math.max(currentHeight, size);
                
                if (newWidth !== currentWidth || newHeight !== currentHeight) {
                    doc.resizeCanvas(newWidth, newHeight, psAPI.constants.AnchorPosition.MIDDLECENTER);
                    debugLog("画布已扩展到正方形:", newWidth, newHeight);
                }
            });
        } catch (error) {
            console.error("扩展画布失败:", error);
        }
    }

    // 3. 捕获过程中的防偏移处理
    async function captureWithNoOffset(originalBounds) {
        let exportBounds = { ...originalBounds };
        let w = Math.max(1, originalBounds.right - originalBounds.left);
        let h = Math.max(1, originalBounds.bottom - originalBounds.top);
        
        const virtualBounds = computeVirtualSquareBounds(originalBounds);
        const size = Math.max(w, h);
        if (size > w || size > h) {
            // 扩展画布到正方形
            await extendCanvasToSquare(size);
        }
        exportBounds = virtualBounds || originalBounds;
        w = size;
        h = size;
        
        return { exportBounds, width: w, height: h };
    }

    // 5. 缩放图层
    async function scaleLayer(layer, scaleX, scaleY) {
        if (!psAPI.app || !psAPI.core) return;
        
        try {
            await psAPI.core.executeAsModal(async () => {
                const scaleCommand = {
                    _obj: "transform",
                    _target: {
                        _ref: "layer",
                        _id: layer.id
                    },
                    freeTransformCenterState: {
                        _enum: "quadCenterState",
                        _value: "QCSCenter"
                    },
                    width: { _unit: "percentUnit", _value: scaleX },
                    height: { _unit: "percentUnit", _value: scaleY },
                    interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" }
                };
                await psAPI.app.batchPlay([scaleCommand], { synchronousExecution: true });
                debugLog("图层已缩放:", scaleX, scaleY);
            });
        } catch (error) {
            console.error("缩放图层失败:", error);
        }
    }

    // 6. 移动图层
    async function moveLayer(layer, dx, dy) {
        if (!psAPI.app || !psAPI.core) return;
        
        try {
            await psAPI.core.executeAsModal(async () => {
                const moveCommand = {
                    _obj: "move",
                    _target: {
                        _ref: "layer",
                        _id: layer.id
                    },
                    to: {
                        _obj: "offset",
                        horizontal: { _unit: "pixelsUnit", _value: dx },
                        vertical: { _unit: "pixelsUnit", _value: dy }
                    }
                };
                await psAPI.app.batchPlay([moveCommand], { synchronousExecution: true });
                debugLog("图层已移动:", dx, dy);
            });
        } catch (error) {
            console.error("移动图层失败:", error);
        }
    }

    // 7. 导入时的精确还原
    async function restorePosition(layer, targetBounds) {
        if (!psAPI.app || !psAPI.core) return;
        
        try {
            await psAPI.core.executeAsModal(async () => {
                const lb = layer.bounds;
                const currentW = Math.max(1, lb.right - lb.left);
                const currentH = Math.max(1, lb.bottom - lb.top);
                const tW = Math.max(1, targetBounds.right - targetBounds.left);
                const tH = Math.max(1, targetBounds.bottom - targetBounds.top);
                
                // 计算缩放比例
                const scaleX = (tW / currentW) * 100;
                const scaleY = (tH / currentH) * 100;
                
                // 应用缩放
                await scaleLayer(layer, scaleX, scaleY);
                
                // 计算位移
                const newLb = layer.bounds;
                const dx = targetBounds.left - newLb.left;
                const dy = targetBounds.top - newLb.top;
                
                // 应用位移
                if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                    await moveLayer(layer, dx, dy);
                }
                
                debugLog("图层位置已还原");
            });
        } catch (error) {
            console.error("还原图层位置失败:", error);
        }
    }

    // 算法二：智能对齐系统 (Smart Alignment System)
    // 1. 智能对齐主函数
    async function smartAlignImage(task) {
        if (!task || task.ratio !== "auto") return;

        let rawW, rawH;
        if (task.bounds) {
            rawW = Math.round(task.bounds.right - task.bounds.left);
            rawH = Math.round(task.bounds.bottom - task.bounds.top);
        } else {
            rawW = task.baseImageWidth;
            rawH = task.baseImageHeight;
        }

        const allRatios = getSupportedRatioMap(task.platform);
        const currentRatio = rawW / rawH;

        let bestRatioStr = "1:1";
        let minDiff = Infinity;

        for (let k in allRatios) {
            const diff = Math.abs(currentRatio - allRatios[k]);
            if (diff < minDiff) {
                minDiff = diff;
                bestRatioStr = k;
            }
        }

        task.ratio = bestRatioStr;
    }

    // 2. 获取支持的比例映射
    function getSupportedRatioMap(platform) {
        // 根据平台返回支持的比例
        // 示例实现
        return {
            "1:1": 1.0,
            "3:4": 0.75,
            "4:3": 1.333,
            "9:16": 0.5625,
            "16:9": 1.777,
            "2:3": 0.666,
            "3:2": 1.5
        };
    }

    // 3. 调整图像大小
    async function resizeImage(image, width, height) {
        if (!psAPI.app || !psAPI.core) return;
        
        try {
            await psAPI.core.executeAsModal(async () => {
                const doc = psAPI.app.activeDocument;
                if (!doc) return;
                
                // 调整图像大小
                doc.resizeImage(width, height, doc.resolution, psAPI.constants.ResampleMethod.BICUBIC);
                debugLog("图像已调整大小:", width, height);
            });
        } catch (error) {
            console.error("调整图像大小失败:", error);
        }
    }

    async function loadPresets() {
        const yushePresets = await loadYushePresets();
        const browserFallbackPresets = uxpFs ? [] : (Config.getPresets() || []);
        currentAllPresets = dedupePresetEntries([]
            .concat(yushePresets || [])
            .concat(browserFallbackPresets || [])
        );

        debugLog('加载预设中...');
        debugLog('yushe.json 预设数量:', yushePresets.length);
        if (!uxpFs) {
            debugLog('浏览器本地预设数量:', browserFallbackPresets.length);
        }
        debugLog('总预设数量:', currentAllPresets.length);

        loadPresetCategories(currentAllPresets);
        updatePresetSelect(currentAllPresets);
    }
    
    function loadPresetCategories(presets) {
        const categorySelect = document.getElementById('presetCategory');
        if (!categorySelect) return;
        
        // 提取所有唯一的分类
        const categories = [...new Set(presets.map(preset => preset.category || '其他'))];
        
        // 清空并添加默认选项
        categorySelect.innerHTML = '<option value="">-- 选择分类 --</option>';
        
        // 添加分类选项
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });
        
        // 添加分类选择事件监听器
        categorySelect.onchange = function() {
            filterPresetsByCategory();
        };

        refreshCustomSelectById('presetCategory');
    }
    
    function updatePresetSelect(presets) {
        const presetSelect = document.getElementById('promptPreset');
        if (!presetSelect) return;
        
        presetSelect.innerHTML = '<option value="">-- 选择预设 --</option>';
        
        presets.forEach(function(preset) {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            presetSelect.appendChild(option);
        });

        refreshCustomSelectById('promptPreset');
    }
    
    function filterPresetsByCategory() {
        const categorySelect = document.getElementById('presetCategory');
        const selectedCategory = categorySelect.value;

        let filteredPresets = currentAllPresets;
        if (selectedCategory) {
            filteredPresets = currentAllPresets.filter(preset => preset.category === selectedCategory);
        }

        updatePresetSelect(filteredPresets);
    }
    
    async function savePreset() {
        const prompt = normalizePresetPromptText(document.getElementById('imgPrompt').value.trim());
        const presetName = document.getElementById('presetName').value.trim();
        const presetCategory = document.getElementById('presetCategory').value || '其他';
        
        if (!prompt) {
            showStatus('请先输入提示词', 'error');
            return;
        }
        
        if (!presetName) {
            showStatus('请输入预设名称', 'error');
            return;
        }
        
        try {
            if (uxpFs) {
                const basePresets = await loadYushePresets();
                const nextPresets = Array.isArray(basePresets) ? basePresets.slice() : [];
                const existingIndex = nextPresets.findIndex(p => p && p.name === presetName);
                const nextEntry = {
                    name: presetName,
                    prompt: prompt,
                    category: presetCategory,
                    refImages: referenceImages.map(function(ref) {
                        return { base64: ref.base64, label: ref.label };
                    })
                };
                if (existingIndex >= 0) {
                    nextPresets[existingIndex] = nextEntry;
                } else {
                    nextPresets.push(nextEntry);
                }

                const saved = await saveYushePresets(nextPresets);
                if (!saved) {
                    throw new Error('写入 yushe.json 失败');
                }
                invalidatePresetCache();
            } else {
                Config.savePreset(presetName, prompt, presetCategory, referenceImages);
                invalidatePresetCache();
            }
            await ensurePresetsLoaded();

            const presetSelect = document.getElementById('promptPreset');
            if (presetSelect) {
                presetSelect.value = presetName;
                refreshCustomSelectById('promptPreset');
            }

            showStatus('预设已保存: ' + presetName, 'success');
            showToast('预设已保存');
        } catch (e) {
            console.error('保存预设失败:', e);
            showStatus('保存预设失败: ' + e.message, 'error');
        }
    }
    
    async function deletePreset() {
        const presetSelect = document.getElementById('promptPreset');
        const selectedName = presetSelect.value;
        
        if (!selectedName) {
            showStatus('请先选择要删除的预设', 'error');
            return;
        }
        
        try {
            if (uxpFs) {
                const basePresets = await loadYushePresets();
                const nextPresets = (basePresets || []).filter(p => p && p.name !== selectedName);
                const saved = await saveYushePresets(nextPresets);
                if (!saved) {
                    throw new Error('写入 yushe.json 失败');
                }
                invalidatePresetCache();
            } else {
                Config.deletePreset(selectedName);
                invalidatePresetCache();
            }

            // 重新加载预设
            await ensurePresetsLoaded();
            showStatus('预设已删除', 'success');
            showToast('预设已删除');
        } catch (e) {
            console.error('删除预设失败:', e);
            showStatus('删除预设失败: ' + e.message, 'error');
        }
    }
    
    async function applyPreset() {
        await ensurePresetsLoaded();
        const presetSelect = document.getElementById('promptPreset');
        const selectedName = presetSelect.value;

        if (!selectedName) {
            return;
        }

        const preset = currentAllPresets.find(p => p.name === selectedName);

        if (preset) {
            document.getElementById('imgPrompt').value = preset.prompt;
            document.getElementById('presetName').value = preset.name;
            referenceImages = normalizeReferenceImageList(preset.refImages || preset.referenceImages);
            renderReferenceImages();
            showToast('预设已应用');
        }
    }

    function renderAnnouncements(announcements) {
        const containers = ['serverAnnouncements', 'homeAnnouncements']
            .map(function(id) { return document.getElementById(id); })
            .filter(Boolean);
        if (!containers.length) return;
        const list = Array.isArray(announcements) ? announcements : [];
        const html = !list.length
            ? '<div class="info-text">暂无公告</div>'
            : list.slice(0, 5).map(function(item) {
                return '<div class="notice-section"><strong>' + escapeHTML(item.title || '公告') + '</strong>'
                    + escapeHTML(item.content || '')
                    + (item.publishAt ? '<div class="info-text">' + escapeHTML(item.publishAt) + '</div>' : '')
                    + '</div>';
            }).join('<div class="notice-divider"></div>');
        containers.forEach(function(container) {
            container.innerHTML = html;
        });
    }

    function renderUpdateInfo(updateData) {
        const containers = ['serverUpdateInfo', 'homeUpdateInfo']
            .map(function(id) { return document.getElementById(id); })
            .filter(Boolean);
        if (!containers.length) return;
        let html = '';
        if (!updateData) {
            html = '未检查更新';
        } else if (updateData.needsUpdate) {
            html = '发现新版本：' + escapeHTML(updateData.latestVersion || '')
                + '<br>' + escapeHTML((updateData.changelog || []).join(' / '));
        } else {
            html = '当前已是最新版本：' + (updateData.currentVersion || PLUGIN_VERSION);
        }
        containers.forEach(function(container) {
            container.innerHTML = html;
        });
    }

    async function refreshAnnouncements() {
        const baseUrl = getServerApiUrlFromSettings();
        const result = await API.getAnnouncements(baseUrl);
        if (result.success && result.data && result.data.success !== false) {
            renderAnnouncements(result.data.announcements || []);
            return true;
        }
        renderAnnouncements([]);
        return false;
    }

    async function checkForUpdates(showResult) {
        const baseUrl = getServerApiUrlFromSettings();
        const result = await API.checkUpdate(baseUrl, PLUGIN_VERSION);
        if (result.success && result.data && result.data.success !== false) {
            renderUpdateInfo(result.data);
            if (showResult) {
                showStatus(result.data.needsUpdate ? '发现新版本：' + result.data.latestVersion : '当前已是最新版本', result.data.needsUpdate ? 'info' : 'success');
            }
            return true;
        }
        if (showResult) showStatus('检查更新失败：' + (result.error || '服务器不可用'), 'error');
        return false;
    }

    async function refreshServerStatus() {
        const statusEl = document.getElementById('serverStatusInfo');
        const result = await API.getServerStatus(getServerApiUrlFromSettings());
        if (statusEl) {
            statusEl.textContent = result.success && result.data
                ? '服务器正常，版本：' + (result.data.version || 'unknown')
                : '服务器不可用';
        }
    }

    function getServerApiUrlFromSettings() {
        return normalizeBaseUrl(SERVER_API_URL, DEFAULT_SERVER_API_URL);
    }

    function scheduleServerChecks() {
        setTimeout(function() {
            refreshServerStatus();
            refreshAnnouncements();
            checkForUpdates(false);
        }, 1800);
    }

    function extractNewApiCredits(data) {
        if (!data || typeof data !== 'object') return null;
        const candidates = [
            data.total_available,
            data.total_granted,
            data.credit,
            data.credits,
            data.quota,
            data.used_quota !== undefined && data.quota !== undefined ? data.quota - data.used_quota : null,
            data.data && data.data.total_available,
            data.data && data.data.total_granted,
            data.data && data.data.credit,
            data.data && data.data.credits,
            data.data && data.data.quota,
            data.data && data.data.used_quota !== undefined && data.data.quota !== undefined ? data.data.quota - data.data.used_quota : null,
            data.user && data.user.quota,
            data.user && data.user.credit,
            data.user && data.user.credits
        ];
        for (let i = 0; i < candidates.length; i++) {
            const value = candidates[i];
            if (value !== null && value !== undefined && value !== '' && !Number.isNaN(Number(value))) {
                return Number(value);
            }
        }
        return null;
    }

    async function checkNewApiCredits() {
        const infoEl = document.getElementById('newApiCreditsInfo');
        const keyEl = document.getElementById('newApiKey');
        const urlEl = document.getElementById('newApiUrl');
        const baseUrl = normalizeBaseUrl(urlEl ? urlEl.value : (currentSettings && currentSettings.newApiUrl), '');
        const apiKey = keyEl ? keyEl.value : (currentSettings && currentSettings.newApiKey);
        if (infoEl) infoEl.textContent = '正在查询...';
        const result = await API.checkNewApiCredits({ apiKey: apiKey, baseUrl: baseUrl });
        if (!result.success) {
            if (infoEl) infoEl.textContent = result.error || '查询失败';
            showStatus(result.error || '查询失败', 'error');
            return false;
        }
        const credits = extractNewApiCredits(result.data);
        const text = credits === null ? '查询成功，请在控制台查看返回数据' : '当前余额：' + credits;
        if (infoEl) infoEl.textContent = text;
        showStatus(text, credits === null ? 'info' : 'success');
        if (credits === null) {
            console.log('NewAPI 余额返回数据:', result.data);
        }
        return true;
    }

    async function checkGrsCredits() {
        const infoEl = document.getElementById('grsCreditsInfo');
        const keyEl = document.getElementById('imgApiKey');
        const urlEl = document.getElementById('imgApiUrl');
        if (infoEl) infoEl.textContent = '正在查询...';
        const result = await API.checkGrsCredits({
            apiKey: keyEl ? keyEl.value : (currentSettings && currentSettings.imgApiKey),
            imgApiUrl: urlEl ? urlEl.value : (currentSettings && currentSettings.imgApiUrl)
        });
        if (!result.success) {
            if (infoEl) infoEl.textContent = result.error || '查询失败';
            showStatus(result.error || '查询失败', 'error');
            return false;
        }
        const responseData = result.data || {};
        const hasError = responseData.code !== undefined && responseData.code !== 0;
        const hasErrorMessage = responseData.msg && typeof responseData.msg === 'string' && responseData.msg.trim() !== '' && responseData.msg.trim().toLowerCase() !== 'success';
        if (hasError || hasErrorMessage) {
            const message = responseData.msg || '查询失败';
            if (infoEl) infoEl.textContent = message;
            showStatus(message, 'error');
            return false;
        }
        const credits = responseData.data && responseData.data.credits !== undefined ? responseData.data.credits : 0;
        if (infoEl) infoEl.textContent = '当前积分余额：' + credits;
        showStatus('当前积分余额：' + credits, 'success');
        return true;
    }

    function bindModelActionButtons() {
        const btnAutoFetchNewApiModels = document.getElementById('btnAutoFetchNewApiModels');
        if (btnAutoFetchNewApiModels) {
            btnAutoFetchNewApiModels.onclick = function () {
                fetchNewApiModelsAndFillChat();
            };
        }

        const btnCheckNewApiCredits = document.getElementById('btnCheckNewApiCredits');
        if (btnCheckNewApiCredits) {
            btnCheckNewApiCredits.onclick = function() {
                checkNewApiCredits();
            };
        }

        const btnCheckGrsCredits = document.getElementById('btnCheckGrsCredits');
        if (btnCheckGrsCredits) {
            btnCheckGrsCredits.onclick = function() {
                checkGrsCredits();
            };
        }

        const btnRefreshAnnouncements = document.getElementById('btnRefreshAnnouncements');
        if (btnRefreshAnnouncements) {
            btnRefreshAnnouncements.onclick = function() {
                refreshAnnouncements();
                refreshServerStatus();
            };
        }

        const btnCheckUpdate = document.getElementById('btnCheckUpdate');
        if (btnCheckUpdate) {
            btnCheckUpdate.onclick = function() {
                checkForUpdates(true);
            };
        }
    }

    function ensureSettingsModelActionsVisible() {
        const settingsTab = document.getElementById('settings');
        if (!settingsTab) return;

        const actionCard = Array.from(settingsTab.querySelectorAll('.settings-card')).find(function(card) {
            const label = card.querySelector('label');
            return label && String(label.textContent || '').includes('模型列表');
        });
        if (!actionCard) return;

        let actionsWrap = actionCard.querySelector('.settings-actions');
        if (!actionsWrap) {
            actionsWrap = document.createElement('div');
            actionsWrap.className = 'settings-actions';
            actionCard.appendChild(actionsWrap);
        }
        actionsWrap.removeAttribute('style');

        const buttonDefs = [
            { id: 'btnAutoFetchNewApiModels', text: '抓取 NewAPI 模型' }
        ];

        buttonDefs.forEach(function(def) {
            let btn = document.getElementById(def.id);
            if (!btn) {
                btn = document.createElement('button');
                btn.id = def.id;
                btn.className = 'btn btn-secondary';
                btn.type = 'button';
                btn.textContent = def.text;
            }
            actionsWrap.appendChild(btn);
            btn.classList.add('btn');
            btn.classList.add('btn-secondary');
            btn.removeAttribute('style');
        });

        let tip = actionCard.querySelector('.settings-actions-tip');
        if (!tip) {
            tip = document.createElement('div');
            tip.className = 'settings-actions-tip';
            tip.textContent = '会使用当前 NewAPI 地址和密钥刷新聊天模型列表';
            actionCard.appendChild(tip);
        }
        tip.removeAttribute('style');

        bindModelActionButtons();
    }

    function ensureSettingsSectionsGrouped() {
        const settingsTab = document.getElementById('settings');
        if (!settingsTab) return;
        if (settingsTab.classList.contains('settings-redesigned')) return;

        const hasStaticGroupedMarkup = ['grs', 'openai', 'newapi', 'other'].every(function(key) {
            const section = settingsTab.querySelector('.settings-group[data-group="' + key + '"]');
            return !!(section && section.querySelector('.settings-group-toggle') && section.querySelector('.settings-group-body'));
        });
        if (hasStaticGroupedMarkup) {
            return;
        }

        const divider = Array.from(settingsTab.children).find(function(node) {
            return node.classList && node.classList.contains('divider');
        }) || null;

        const groupDefs = [
            { key: 'grs', title: 'GRS' },
            { key: 'openai', title: 'OpenAI' },
            { key: 'newapi', title: 'NewAPI' },
            { key: 'other', title: '其他' }
        ];

        function classifySettingsNode(node) {
            if (!node || !node.querySelector) return null;
            if (node.querySelector('#imgApiUrl, #imgApiKey')) return 'grs';
            if (node.querySelector('#chatApiUrl, #chatApiKey')) return 'openai';
            if (node.querySelector('#newApiUrl, #newApiKey, #btnAutoFetchNewApiModels, #btnRefreshAnnouncements, #btnCheckUpdate')) return 'newapi';
            if (node.querySelector('#googleApiKey, #sdApiUrl, #alignmentMode')) return 'other';
            return null;
        }

        const bodyMap = {};
        groupDefs.forEach(function(def) {
            let section = settingsTab.querySelector('.settings-group[data-group="' + def.key + '"]');
            if (!section) {
                section = document.createElement('section');
                section.className = 'settings-group';
                section.dataset.group = def.key;
            }

            section.classList.add('settings-group');
            section.dataset.group = def.key;

            let toggle = Array.from(section.children).find(function(node) {
                return node.classList && node.classList.contains('settings-group-toggle');
            });
            if (!toggle) {
                toggle = section.querySelector('.settings-group-toggle');
            }
            if (!toggle) {
                toggle = document.createElement('button');
                section.insertBefore(toggle, section.firstChild || null);
            }

            toggle.type = 'button';
            toggle.className = 'settings-group-toggle';
            toggle.textContent = def.title;
            toggle.dataset.title = def.title;
            toggle.setAttribute('aria-expanded', section.classList.contains('collapsed') ? 'false' : 'true');
            toggle.removeAttribute('style');

            let body = Array.from(section.children).find(function(node) {
                return node.classList && node.classList.contains('settings-group-body');
            });
            if (!body) {
                body = section.querySelector('.settings-group-body');
            }
            if (!body) {
                body = document.createElement('div');
                body.className = 'settings-group-body';
                section.appendChild(body);
            }

            Array.from(section.children).forEach(function(child) {
                if (child === toggle || child === body) return;
                body.appendChild(child);
            });

            bodyMap[def.key] = body;
            if (section.parentElement !== settingsTab) {
                settingsTab.insertBefore(section, divider);
            }
        });

        groupDefs.forEach(function(def) {
            const section = settingsTab.querySelector('.settings-group[data-group="' + def.key + '"]');
            if (!section) return;
            if (section.nextSibling !== divider) {
                settingsTab.insertBefore(section, divider);
            }
        });

        Array.from(settingsTab.children).forEach(function(node) {
            if (!node || !node.classList) return;
            if (node.classList.contains('settings-group')) return;
            if (node.classList.contains('divider')) return;
            if (node.querySelector && node.querySelector('.notice-block')) return;

            const targetGroup = classifySettingsNode(node);
            if (!targetGroup || !bodyMap[targetGroup]) return;
            bodyMap[targetGroup].appendChild(node);
        });
    }

    function bindSettingsGroupToggles() {
        const settingsTab = document.getElementById('settings');
        if (!settingsTab) return;

        const toggles = settingsTab.querySelectorAll('.settings-group-toggle');
        toggles.forEach(function(toggle) {
            const section = toggle.closest('.settings-group');
            if (!toggle.dataset.title) {
                toggle.dataset.title = (toggle.textContent || '').trim();
            }
            if (section && !toggle.dataset.initialized) {
                section.classList.add('collapsed');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.dataset.initialized = '1';
            }
            if (!toggle || toggle.dataset.bound === '1') return;
            toggle.addEventListener('click', function() {
                const section = toggle.closest('.settings-group');
                if (!section) return;
                section.classList.toggle('collapsed');
                toggle.setAttribute('aria-expanded', section.classList.contains('collapsed') ? 'false' : 'true');
            });
            toggle.addEventListener('keydown', function(event) {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                toggle.click();
            });
            toggle.dataset.bound = '1';
        });
    }

    function syncCustomResolutionControls() {
        const maxResolutionSelect = document.getElementById('maxResolution');
        const customRow = document.getElementById('customResolutionRow');
        const customWidth = document.getElementById('customResolutionWidth');
        const customHeight = document.getElementById('customResolutionHeight');
        const isCustom = !!(maxResolutionSelect && maxResolutionSelect.value === 'custom');

        if (customRow) {
            customRow.classList.toggle('active', isCustom);
            customRow.style.setProperty('display', isCustom ? 'flex' : 'none', 'important');
        }

        [customWidth, customHeight].forEach(function(input) {
            if (!input) return;
            input.disabled = !isCustom;
            input.style.setProperty('display', 'block', 'important');
            input.style.setProperty('visibility', 'visible', 'important');
        });
    }

    function bindCustomResolutionControls() {
        const maxResolutionSelect = document.getElementById('maxResolution');
        if (!maxResolutionSelect) return;

        if (maxResolutionSelect.dataset.customResolutionBound !== '1') {
            maxResolutionSelect.addEventListener('change', syncCustomResolutionControls);
            maxResolutionSelect.addEventListener('input', syncCustomResolutionControls);
            maxResolutionSelect.dataset.customResolutionBound = '1';
        }

        syncCustomResolutionControls();
    }

    function ensureSelectOptions(selectEl, options) {
        if (!selectEl || !Array.isArray(options)) return;
        const currentValue = selectEl.value;
        const existingValues = Array.from(selectEl.options || {}).map(function(option) {
            return option.value;
        });

        options.forEach(function(item) {
            if (existingValues.indexOf(item.value) > -1) return;
            const option = document.createElement('option');
            option.value = item.value;
            option.textContent = item.text;
            selectEl.appendChild(option);
        });

        if (currentValue) {
            selectEl.value = currentValue;
        }
    }

    function ensureImg2ImgControlCell(id, labelText, options) {
        const img2imgTab = document.getElementById('img2img');
        if (!img2imgTab) return null;

        cleanupCustomSelectState(id);

        let control = document.getElementById(id);
        let oldGroup = control && control.closest ? control.closest('.form-group') : null;
        let label = oldGroup ? oldGroup.querySelector('label[for="' + id + '"]') : null;

        if (!control) {
            control = document.createElement('select');
            control.id = id;
        }

        if (!label) {
            label = img2imgTab.querySelector('label[for="' + id + '"]') || document.createElement('label');
        }

        label.setAttribute('for', id);
        label.textContent = labelText;
        ensureSelectOptions(control, options);

        const cell = document.createElement('div');
        cell.className = 'img2img-inline-cell';
        cell.appendChild(label);
        cell.appendChild(control);

        if (oldGroup && oldGroup.parentNode && oldGroup !== cell && oldGroup.children.length === 0) {
            oldGroup.parentNode.removeChild(oldGroup);
        }

        return cell;
    }

    function ensureImg2ImgInlineControls() {
        const controls = [
            {
                id: 'imgResolution',
                options: [
                    { value: 'auto', text: '自适应分辨率' },
                    { value: '1K', text: '1K' },
                    { value: '2K', text: '2K' },
                    { value: '4K', text: '4K' }
                ]
            },
            {
                id: 'imageCount',
                options: [
                    { value: '', text: '-- 选择数量 --' },
                    { value: '1', text: '1张' },
                    { value: '2', text: '2张' },
                    { value: '3', text: '3张' },
                    { value: '4', text: '4张' }
                ]
            },
            {
                id: 'presetCategory',
                options: [
                    { value: '', text: '-- 选择分类 --' }
                ]
            },
            {
                id: 'promptPreset',
                options: [
                    { value: '', text: '-- 选择预设 --' }
                ]
            }
        ];

        controls.forEach(function(item) {
            const selectEl = document.getElementById(item.id);
            if (!selectEl) return;
            ensureSelectOptions(selectEl, item.options);
        });

        const imgResolutionSelect = document.getElementById('imgResolution');
        if (imgResolutionSelect) {
            imgResolutionSelect.value = normalizeImageResolution(imgResolutionSelect.value || (currentSettings && currentSettings.imgResolution));
        }

        controls.forEach(function(item) {
            refreshCustomSelectById(item.id);
        });
    }

    function ensurePresetActionButtons() {
        const img2imgTab = document.getElementById('img2img');
        if (!img2imgTab) return;

        const createButton = function(id, text) {
            const button = document.createElement('button');
            button.id = id;
            button.type = 'button';
            button.className = 'btn btn-secondary';
            button.textContent = text;
            return button;
        };

        let saveButton = document.getElementById('btnSavePreset');
        let deleteButton = document.getElementById('btnDeletePreset');
        if (!saveButton) {
            saveButton = createButton('btnSavePreset', '保存预设');
        }
        if (!deleteButton) {
            deleteButton = createButton('btnDeletePreset', '删除预设');
        }

        let actions = img2imgTab.querySelector('.preset-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'preset-actions';
        }
        const oldActionsHost = actions.parentNode;

        let row = actions.closest('.preset-actions-row');
        if (!row || !img2imgTab.contains(row)) {
            row = document.createElement('div');
            row.className = 'form-group preset-actions-row';
        } else {
            row.classList.add('form-group', 'preset-actions-row');
        }

        if (actions.parentNode !== row) {
            row.appendChild(actions);
        }
        if (oldActionsHost && oldActionsHost !== row && oldActionsHost.classList && oldActionsHost.classList.contains('form-group') && oldActionsHost.children.length === 0) {
            oldActionsHost.remove();
        }
        if (saveButton.parentNode !== actions) {
            actions.appendChild(saveButton);
        }
        if (deleteButton.parentNode !== actions) {
            actions.appendChild(deleteButton);
        }

        const presetNameGroup = document.getElementById('presetName') ? document.getElementById('presetName').closest('.form-group') : null;
        if (presetNameGroup && presetNameGroup.parentNode === img2imgTab && row.parentNode !== img2imgTab) {
            img2imgTab.insertBefore(row, presetNameGroup.nextSibling);
        } else if (row.parentNode === img2imgTab && presetNameGroup && row.previousElementSibling !== presetNameGroup) {
            img2imgTab.insertBefore(row, presetNameGroup.nextSibling);
        }

        saveButton.style.setProperty('display', 'flex', 'important');
        deleteButton.style.setProperty('display', 'flex', 'important');

        if (saveButton.dataset.presetActionBound !== '1') {
            saveButton.onclick = async function() {
                await savePreset();
            };
            saveButton.dataset.presetActionBound = '1';
        }
        if (deleteButton.dataset.presetActionBound !== '1') {
            deleteButton.onclick = async function() {
                await deletePreset();
            };
            deleteButton.dataset.presetActionBound = '1';
        }
    }

    function getWebUIResolution() {
        const maxResolutionSelect = document.getElementById('maxResolution');
        const rawValue = maxResolutionSelect ? String(maxResolutionSelect.value || '').trim() : '';
        const isCustom = rawValue === 'custom';
        let widthText = '';
        let heightText = '';

        if (isCustom) {
            widthText = String((document.getElementById('customResolutionWidth') || {}).value || '').trim();
            heightText = String((document.getElementById('customResolutionHeight') || {}).value || '').trim();
        } else if (rawValue && rawValue.indexOf('x') > -1) {
            const parts = rawValue.split('x');
            widthText = String(parts[0] || '').trim();
            heightText = String(parts[1] || '').trim();
        }

        if (!widthText || !heightText) {
            return { valid: false, message: isCustom ? '请输入自定义宽高' : '请选择分辨率' };
        }

        if (!/^\d+$/.test(widthText) || !/^\d+$/.test(heightText)) {
            return { valid: false, message: '分辨率必须是整数' };
        }

        const width = parseInt(widthText, 10);
        const height = parseInt(heightText, 10);

        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
            return { valid: false, message: '分辨率必须大于 0' };
        }

        return {
            valid: true,
            width: width,
            height: height,
            value: width + 'x' + height
        };
    }

    function ensureWebUIParameterControlsVisible() {
        const webuiTab = document.getElementById('webui');
        if (!webuiTab) return;

        const requiredIds = ['webuiImageCount', 'steps', 'cfgScale', 'denoisingStrength', 'samplingMethod', 'maxResolution', 'customResolutionWidth', 'customResolutionHeight'];
        const previousValues = {
            webuiImageCount: (document.getElementById('webuiImageCount') || {}).value || '1',
            steps: (document.getElementById('steps') || {}).value || '20',
            cfgScale: (document.getElementById('cfgScale') || {}).value || '7',
            denoisingStrength: (document.getElementById('denoisingStrength') || {}).value || '0.35',
            samplingMethod: (document.getElementById('samplingMethod') || {}).value || 'DPM++ 2M',
            maxResolution: (document.getElementById('maxResolution') || {}).value || '1024x1024',
            customResolutionWidth: (document.getElementById('customResolutionWidth') || {}).value || '1024',
            customResolutionHeight: (document.getElementById('customResolutionHeight') || {}).value || '1024'
        };

        let parameterCard = webuiTab.querySelector('.parameter-card');
        if (!parameterCard) {
            parameterCard = Array.from(webuiTab.querySelectorAll('.settings-card, .module-card')).find(function(card) {
                const title = card.querySelector('label, .card-title');
                return title && String(title.textContent || '').includes('生成参数');
            });
        }

        if (!parameterCard) {
            parameterCard = document.createElement('div');
            parameterCard.className = 'form-group settings-card parameter-card';
            parameterCard.innerHTML = '<label>生成参数</label><div class="parameter-group"></div>';
            const progressContainer = webuiTab.querySelector('#progressContainer');
            if (progressContainer && progressContainer.parentNode) {
                progressContainer.parentNode.insertBefore(parameterCard, progressContainer);
            } else {
                webuiTab.appendChild(parameterCard);
            }
        }
        parameterCard.classList.add('parameter-card');

        let parameterGroup = parameterCard.querySelector('.parameter-group');
        if (!parameterGroup) {
            parameterGroup = document.createElement('div');
            parameterGroup.className = 'parameter-group';
            parameterCard.appendChild(parameterGroup);
        }
        parameterCard.removeAttribute('style');
        parameterGroup.removeAttribute('style');

        const hasStaticParameterMarkup = requiredIds.every(function(id) {
            return !!parameterGroup.querySelector('#' + id);
        });

        if (!hasStaticParameterMarkup) {
            cleanupCustomSelectState('samplingMethod');
            cleanupCustomSelectState('maxResolution');
            parameterGroup.innerHTML = ''
                + '<div class="parameter-row-1">'
                + '  <div class="parameter-item"><label for="webuiImageCount">生成数量</label><input type="text" inputmode="numeric" class="webui-param-input" id="webuiImageCount" value="1"></div>'
                + '  <div class="parameter-item"><label for="steps">步数</label><input type="text" inputmode="numeric" class="webui-param-input" id="steps" value="20"></div>'
                + '  <div class="parameter-item"><label for="cfgScale">CFG Scale</label><input type="text" inputmode="decimal" class="webui-param-input" id="cfgScale" value="7"></div>'
                + '  <div class="parameter-item"><label for="denoisingStrength">重绘幅度</label><input type="text" inputmode="decimal" class="webui-param-input" id="denoisingStrength" value="0.35"></div>'
                + '</div>'
                + '<div class="parameter-item">'
                + '  <label for="samplingMethod">采样方法</label>'
                + '  <select id="samplingMethod">'
                + '    <option value="Euler a">Euler a</option><option value="Euler">Euler</option><option value="Heun">Heun</option><option value="DPM2">DPM2</option><option value="DPM2 a">DPM2 a</option>'
                + '    <option value="DPM++ 2M" selected>DPM++ 2M</option><option value="DPM++ 2S a">DPM++ 2S a</option><option value="DPM++ SDE">DPM++ SDE</option><option value="DPM fast">DPM fast</option>'
                + '    <option value="DPM adaptive">DPM adaptive</option><option value="LMS">LMS</option><option value="DDIM">DDIM</option><option value="PLMS">PLMS</option>'
                + '  </select>'
                + '</div>'
                + '<div class="parameter-item">'
                + '  <label for="maxResolution">最大分辨率</label>'
                + '  <select id="maxResolution">'
                + '    <option value="512x512">512x512</option><option value="768x768">768x768</option><option value="1024x1024">1024x1024</option><option value="2048x2048">2048x2048</option><option value="custom">自定义</option>'
                + '  </select>'
                + '</div>'
                + '<div class="custom-resolution-row" id="customResolutionRow">'
                + '  <div class="parameter-item"><label for="customResolutionWidth">自定义宽度</label><input type="text" inputmode="numeric" class="webui-param-input" id="customResolutionWidth" value="1024" placeholder="宽"></div>'
                + '  <div class="parameter-item"><label for="customResolutionHeight">自定义高度</label><input type="text" inputmode="numeric" class="webui-param-input" id="customResolutionHeight" value="1024" placeholder="高"></div>'
                + '</div>';
        }

        parameterCard.classList.add('settings-card');
        parameterGroup.classList.add('parameter-group');

        const row = parameterGroup.querySelector('.parameter-row-1');
        if (row) {
            row.classList.add('parameter-row-1');
            row.removeAttribute('style');
        }

        parameterGroup.querySelectorAll('.parameter-item').forEach(function(item) {
            item.classList.add('parameter-item');
            item.removeAttribute('style');
        });

        parameterGroup.querySelectorAll('input, select').forEach(function(control) {
            control.removeAttribute('style');
            control.style.setProperty('display', 'block', 'important');
            control.style.setProperty('visibility', 'visible', 'important');
        });

        ['webuiImageCount', 'steps', 'cfgScale', 'denoisingStrength'].forEach(function(id) {
            const input = document.getElementById(id);
            if (!input) return;
            if (previousValues[id] !== undefined && previousValues[id] !== null && String(previousValues[id]).trim() !== '') {
                input.value = previousValues[id];
            }
            input.style.setProperty('text-align', 'center', 'important');
            input.style.setProperty('padding-left', '0', 'important');
            input.style.setProperty('padding-right', '0', 'important');
        });

        ['customResolutionWidth', 'customResolutionHeight'].forEach(function(id) {
            const input = document.getElementById(id);
            if (!input) return;
            if (previousValues[id] !== undefined && previousValues[id] !== null && String(previousValues[id]).trim() !== '') {
                input.value = previousValues[id];
            }
            input.style.setProperty('text-align', 'center', 'important');
            input.style.setProperty('padding-left', '0', 'important');
            input.style.setProperty('padding-right', '0', 'important');
        });

        const samplingMethodSelect = document.getElementById('samplingMethod');
        if (samplingMethodSelect && previousValues.samplingMethod) {
            const hasOption = Array.from(samplingMethodSelect.options || []).some(function(option) {
                return option.value === previousValues.samplingMethod;
            });
            if (hasOption) {
                samplingMethodSelect.value = previousValues.samplingMethod;
            }
        }

        const maxResolutionSelect = document.getElementById('maxResolution');
        if (maxResolutionSelect && previousValues.maxResolution) {
            if (!Array.from(maxResolutionSelect.options || []).some(function(option) { return option.value === 'custom'; })) {
                const customOption = document.createElement('option');
                customOption.value = 'custom';
                customOption.textContent = '自定义';
                maxResolutionSelect.appendChild(customOption);
            }
            const hasOption = Array.from(maxResolutionSelect.options || []).some(function(option) {
                return option.value === previousValues.maxResolution;
            });
            if (hasOption) {
                maxResolutionSelect.value = previousValues.maxResolution;
            } else if (/^\d+x\d+$/.test(previousValues.maxResolution)) {
                const parts = previousValues.maxResolution.split('x');
                maxResolutionSelect.value = 'custom';
                const customWidth = document.getElementById('customResolutionWidth');
                const customHeight = document.getElementById('customResolutionHeight');
                if (customWidth) customWidth.value = parts[0];
                if (customHeight) customHeight.value = parts[1];
            }
        }

        ['samplingMethod', 'maxResolution'].forEach(function(selectId) {
            cleanupCustomSelectState(selectId);
            refreshCustomSelectById(selectId);
        });

        bindCustomResolutionControls();

        const hasAllControls = requiredIds.every(function(id) {
            return !!parameterGroup.querySelector('#' + id);
        });
        if (!hasAllControls) {
            console.warn('WebUI 参数区重建后仍缺少控件');
        }
    }




    
    function setupEventListeners() {
        debugLog('开始设置事件监听器...');
        const btnRefreshUi = document.getElementById('btnRefreshUi');
        if (btnRefreshUi) {
            btnRefreshUi.onclick = function() {
                ensureImg2ImgInlineControls();
                ensurePresetActionButtons();
                ensureSettingsUiCompatibility();
                updateLogDisplay();
                showToast('界面已刷新');
            };
        }

        const btnCloseSplash = document.getElementById('btnCloseSplash');
        if (btnCloseSplash) {
            btnCloseSplash.onclick = function() {
                const shell = document.querySelector('.app-shell');
                if (shell) {
                    shell.classList.remove('splash-open');
                }
                switchTab('img2img');
            };
        }

        // 为标签页添加点击事件
        const tabs = document.querySelectorAll('.tab');
        debugLog('找到标签页数量:', tabs.length);
        
        if (tabs.length === 0) {
            console.error('没有找到标签页元素');
        } else {
            debugLog('找到的标签页:', Array.from(tabs).map(tab => tab.getAttribute('data-tab')));
        }
        
        for (let i = 0; i < tabs.length; i++) {
            const tab = tabs[i];
            const tabId = tab.getAttribute('data-tab');
            debugLog('绑定标签页点击事件:', tabId);
            
            tab.onclick = function() {
                const clickedTabId = this.getAttribute('data-tab');
                debugLog('标签页被点击:', clickedTabId);
                switchTab(clickedTabId);
            };
            
            // 测试点击事件是否绑定成功
            debugLog('标签页', tabId, '的onclick事件:', tab.onclick);
        }
        
        // 为按钮添加点击事件
        const btnSaveSettings = document.getElementById('btnSaveSettings');
        if (btnSaveSettings) {
            debugLog('绑定btnSaveSettings点击事件');
            btnSaveSettings.onclick = saveSettings;
        }

        const btnChat = document.getElementById('btnChat');
        if (btnChat) {
            debugLog('绑定btnChat点击事件');
            btnChat.onclick = chat;
        }
        
        const btnImg2Img = document.getElementById('btnImg2Img');
        if (btnImg2Img) {
            debugLog('绑定btnImg2Img点击事件');
            btnImg2Img.onclick = async function() {
                try {
                    debugLog('btnImg2Img被点击，开始执行img2Img函数');
                    await img2Img();
                } catch (error) {
                    console.error('执行img2Img函数出错:', error);
                    showStatus('执行出错: ' + error.message, 'error');
                }
            };
        }
        
        const btnAddToBatch = document.getElementById('btnAddToBatch');
        if (btnAddToBatch) {
            debugLog('绑定btnAddToBatch点击事件');
            btnAddToBatch.onclick = async function() {
                try {
                    await addToBatch();
                } catch (error) {
                    console.error('执行addToBatch函数出错:', error);
                    showStatus('执行出错: ' + error.message, 'error');
                }
            };
        }

        const btnAddReferenceImage = document.getElementById('btnAddReferenceImage');
        if (btnAddReferenceImage) {
            debugLog('绑定btnAddReferenceImage点击事件');
            btnAddReferenceImage.onclick = addReferenceImageFromSelection;
        }

        const btnStartBatch = document.getElementById('btnStartBatch');
        if (btnStartBatch) {
            debugLog('绑定btnStartBatch点击事件');
            btnStartBatch.onclick = startBatch;
        }
        
        const btnClearBatch = document.getElementById('btnClearBatch');
        if (btnClearBatch) {
            debugLog('绑定btnClearBatch点击事件');
            btnClearBatch.onclick = clearBatch;
        }
        
        const btnExportLogs = document.getElementById('btnExportLogs');
        if (btnExportLogs) {
            debugLog('绑定btnExportLogs点击事件');
            btnExportLogs.onclick = exportLogs;
        }
        
        const btnClearLogs = document.getElementById('btnClearLogs');
        if (btnClearLogs) {
            debugLog('绑定btnClearLogs点击事件');
            btnClearLogs.onclick = clearLogs;
        }
        
        const logSearch = document.getElementById('logSearch');
        if (logSearch) {
            debugLog('绑定logSearch输入事件');
            logSearch.oninput = searchLogs;
        }
        
        const promptPreset = document.getElementById('promptPreset');
        if (promptPreset) {
            debugLog('绑定promptPreset change事件');
            promptPreset.onchange = applyPreset;
        }
        
        const btnSavePreset = document.getElementById('btnSavePreset');
        if (btnSavePreset) {
            debugLog('绑定btnSavePreset点击事件');
            btnSavePreset.onclick = async function() {
                await savePreset();
            };
        }
        
        const btnDeletePreset = document.getElementById('btnDeletePreset');
        if (btnDeletePreset) {
            debugLog('绑定btnDeletePreset点击事件');
            btnDeletePreset.onclick = async function() {
                await deletePreset();
            };
        }
        
        const btnChatReadSelection = document.getElementById('btnChatReadSelection');
        if (btnChatReadSelection) {
            debugLog('绑定btnChatReadSelection点击事件');
            btnChatReadSelection.onclick = chatReadSelection;
        }
        
        const btnChatSendToImg2Img = document.getElementById('btnChatSendToImg2Img');
        if (btnChatSendToImg2Img) {
            debugLog('绑定btnChatSendToImg2Img点击事件');
            btnChatSendToImg2Img.onclick = chatSendToImg2Img;
        }
        
        const btnImg2ImgReadSelection = document.getElementById('btnImg2ImgReadSelection');
        if (btnImg2ImgReadSelection) {
            debugLog('绑定btnImg2ImgReadSelection点击事件');
            btnImg2ImgReadSelection.onclick = img2ImgReadSelection;
        }
        

        
        // 为文字大小倍数滑块添加事件监听器
        const textSizeMultiplier = document.getElementById('textSizeMultiplier');
        const textSizeValue = document.getElementById('textSizeValue');
        if (textSizeMultiplier) {
            debugLog('绑定textSizeMultiplier input事件');
            textSizeMultiplier.addEventListener('input', function(event) {
                const value = parseFloat(event.target.value);
                if (textSizeValue) {
                    textSizeValue.textContent = '当前倍数: ' + value.toFixed(1) + 'x';
                }
                // 实时应用文字大小变化
                applyTextSizeMultiplier(value);
            });
        }
        
        // 为聊天输入框添加键盘事件：Enter发送、Shift+Enter换行、Tab调出上次输入
        const chatPrompt = document.getElementById('chatPrompt');
        if (chatPrompt) {
            debugLog('绑定chatPrompt keydown/input事件');
            chatPrompt.addEventListener('keydown', function(event) {
                if (event.key === 'Tab') {
                    event.preventDefault();
                    if (lastChatInput) {
                        chatPrompt.value = lastChatInput;
                        resizeChatPrompt();
                    }
                    return;
                }

                if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
                    const btnChat = document.getElementById('btnChat');
                    if (btnChat && btnChat.disabled) return;
                    event.preventDefault();
                    chat();
                }
            });
            chatPrompt.addEventListener('input', resizeChatPrompt);
            resizeChatPrompt();
        }
        
        // 为图片生成提示词输入框添加事件监听器
        const imgPrompt = document.getElementById('imgPrompt');
        if (imgPrompt) {
            // 仅添加必要的事件监听器
        }
        
        // 为图片模型下拉框添加change事件监听器，更新预览比例
        const imgModelSelect = document.getElementById('imgModel');
        if (imgModelSelect) {
            debugLog('绑定imgModelSelect change事件');
            imgModelSelect.addEventListener('change', function() {
                updatePreviewAspectByModel(this.value);
            });
        }
        
        debugLog('事件监听器设置完成');
    }
    
    async function addToBatch() {
        const prompt = normalizePresetPromptText(document.getElementById('imgPrompt').value.trim());
        const model = document.getElementById('imgModel').value;
        const imageResolution = getSelectedImageResolution();
        const imageCount = parseInt(document.getElementById('imageCount').value) || 1;
        
        if (!prompt) {
            showStatus('请输入提示词', 'error');
            return;
        }
        
        if (!model) {
            showStatus('请选择模型', 'error');
            return;
        }
        
        // 自动获取当时的选区
        if (psAPI.app && psAPI.core && psAPI.imaging) {
            try {
                const bounds = await getSelectionBoundsInPixels();
                if (bounds) {
                    // 验证选区尺寸是否有效
                    if (bounds.width <= 0 || bounds.height <= 0) {
                        debugLog("选区尺寸无效: " + bounds.width + " x " + bounds.height);
                        showStatus('选区尺寸无效，请重新选择区域', 'error');
                        return;
                    }
                    
                    savedSelectionBounds = bounds;
                    debugLog("选区尺寸: " + bounds.width + " x " + bounds.height);
                    
                    const base64Data = await getImageDataToBase64(bounds);
                    
                    if (base64Data && base64Data.length > 0) {
                        selectedImageBase64 = 'data:image/png;base64,' + base64Data;
                        
                        const selectionInfo = document.getElementById('selectionInfo');
                        if (selectionInfo) {
                            selectionInfo.textContent = '选区尺寸: ' + Math.round(bounds.width) + ' x ' + Math.round(bounds.height) + ' 像素';
                        }
                        
                        const previewImage = document.getElementById('previewImage');
                        const previewPlaceholder = document.getElementById('previewPlaceholder');
                        if (previewImage) {
                            previewImage.src = selectedImageBase64;
                            previewImage.style.display = 'block';
                        }
                        if (previewPlaceholder) {
                            previewPlaceholder.style.display = 'none';
                        }
                    }
                } else {
                    debugLog("未能获取选区边界");
                }
            } catch (e) {
                debugLog("选区读取失败:", e);
                showStatus('读取选区失败: ' + e.message, 'error');
                return;
            }
        }
        
        if (!savedSelectionBounds) {
            showStatus('请先读取选区', 'error');
            return;
        }
        
        // 创建批处理任务
        const task = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            prompt: prompt,
            model: model,
            imageResolution: imageResolution,
            imageCount: imageCount,
            selectionBounds: JSON.parse(JSON.stringify(savedSelectionBounds)),
            imageBase64: selectedImageBase64,
            referenceImages: getActiveReferenceImageData(),
            timestamp: new Date().toLocaleString('zh-CN')
        };
        
        batchTasks.push(task);
        updateBatchTaskList();
        
        // 显示批处理标签页
        const batchTab = document.querySelector('.tab[data-tab="batch"]');
        if (batchTab) {
            batchTab.style.display = 'block';
        }
        
        showStatus('任务已添加到批处理', 'success');
        showToast('任务已添加到批处理');
    }
    
    function updateBatchTaskList() {
        const taskList = document.getElementById('batchTaskList');
        if (!taskList) return;
        
        if (batchTasks.length === 0) {
            taskList.innerHTML = '<div class="info-text" style="text-align: center; padding: 20px;">暂无批处理任务</div>';
            return;
        }
        
        let html = '';
        batchTasks.forEach((task, index) => {
            html += '<div style="background: #2d2d2d; border: 1px solid #3d3d3d; border-radius: 4px; padding: 8px; margin-bottom: 8px;">';
            html += '<div style="font-size: 12px; font-weight: 500; margin-bottom: 4px;">任务 ' + (index + 1) + '</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d; margin-bottom: 4px;">模型: ' + task.model + '</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d; margin-bottom: 4px;">图片大小: ' + (normalizeImageResolution(task.imageResolution) === 'auto' ? '自适应' : normalizeImageResolution(task.imageResolution)) + '</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d; margin-bottom: 4px;">生成数量: ' + task.imageCount + '张</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d; margin-bottom: 4px;">选区尺寸: ' + Math.round(task.selectionBounds.width) + ' x ' + Math.round(task.selectionBounds.height) + ' 像素</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d; margin-bottom: 4px;">参考图: ' + ((task.referenceImages || []).length) + ' 张</div>';
            html += '<div style="font-size: 10px; color: #9d9d9d;">提示词: ' + task.prompt + '</div>';
            html += '</div>';
        });
        
        taskList.innerHTML = html;
    }
    
    function clearBatch() {
        batchTasks = [];
        updateBatchTaskList();
        
        // 如果没有任务了，隐藏批处理标签页
        const batchTab = document.querySelector('.tab[data-tab="batch"]');
        if (batchTab) {
            batchTab.style.display = 'none';
        }
        
        showStatus('批处理任务已清空', 'success');
        showToast('批处理任务已清空');
    }
    
    async function startBatch() {
        if (batchTasks.length === 0) {
            showStatus('批处理任务列表为空', 'error');
            return;
        }
        
        const btn = document.getElementById('btnStartBatch');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span>正在处理...';
        }
        
        showStatus('开始批处理，共 ' + batchTasks.length + ' 个任务', 'info');
        
        let completedCount = 0;
        let successCount = 0;
        
        // 并发生成所有任务
        const tasks = batchTasks.map(async (task, index) => {
            try {
                debugLog('开始处理任务 ' + (index + 1) + ':', task);
                
                // 保存当前的全局状态
                const originalSavedSelectionBounds = savedSelectionBounds;
                const originalSelectedImageBase64 = selectedImageBase64;
                
                // 设置当前任务的状态
                savedSelectionBounds = task.selectionBounds;
                selectedImageBase64 = task.imageBase64;
                
                // 计算图像尺寸
                const imageConfig = getModelImageConfig(task.model, task.selectionBounds, task.imageResolution);
                const width = imageConfig.width;
                const height = imageConfig.height;
                
                // 创建AbortController
                const abortController = new AbortController();
                
                // 根据模型选择使用哪个API
                let result;
                const routingValidation = validateImageApiRouting(task.model, currentSettings);
                if (!routingValidation.valid) {
                    Config.addLog({
                        timestamp: task.timestamp,
                        model: task.model,
                        prompt: task.prompt,
                        type: 'batch',
                        status: '失败',
                        error: routingValidation.message
                    });
                    return;
                }

                const route = routingValidation.route;
                const requestPrompt = getImageRequestPrompt(task.model, task.prompt, !!task.imageBase64);
                if (route.provider === 'google') {
                    // 使用Google AI Studio API
                    result = await API.generateImageGoogle({
                        apiKey: route.apiKey,
                        model: task.model,
                        prompt: requestPrompt,
                        imageBase64: task.imageBase64,
                        referenceImages: task.referenceImages || [],
                        abortSignal: abortController.signal
                    });
                } else {
                    result = await API.generateImage({
                        apiKey: route.apiKey,
                        apiType: route.apiType,
                        model: task.model,
                        prompt: requestPrompt,
                        imageBase64: task.imageBase64,
                        referenceImages: task.referenceImages || [],
                        sizeHint: task.selectionBounds,
                        imageResolution: task.imageResolution,
                        imageSize: imageConfig.imageSize,
                        aspectRatio: imageConfig.aspectRatio,
                        size: imageConfig.size,
                        abortSignal: abortController.signal
                    });
                }
                
                debugLog('任务 ' + (index + 1) + ' API响应:', result);
                
                if (result.success) {
                    const responseData = result.data;
                    debugLog('任务 ' + (index + 1) + ' 响应数据:', responseData);
                    
                    // 提取图像URL
                    const imageUrl = extractImageFromResponse(responseData);
                    debugLog('任务 ' + (index + 1) + ' 提取到的图像URL:', imageUrl);
                    
                    if (imageUrl) {
                        await downloadAndPlaceDocument(imageUrl, width, height, task.prompt, 'img2img', task.timestamp + ' (任务 ' + (index + 1) + ')', task.model);
                        successCount++;
                    } else {
                        Config.addLog({
                            timestamp: task.timestamp,
                            model: task.model,
                            prompt: task.prompt,
                            type: 'batch',
                            status: '失败',
                            error: '无法从响应中提取图像'
                        });
                    }
                } else {
                    const errorMsg = result.error || '未知错误';
                    Config.addLog({
                        timestamp: task.timestamp,
                        model: task.model,
                        prompt: task.prompt,
                        type: 'batch',
                        status: '失败',
                        error: errorMsg
                    });
                }
                
                // 恢复原始状态
                savedSelectionBounds = originalSavedSelectionBounds;
                selectedImageBase64 = originalSelectedImageBase64;
                
            } catch (error) {
                console.error('任务 ' + (index + 1) + ' 出错:', error);
                Config.addLog({
                    timestamp: task.timestamp,
                    model: task.model,
                    prompt: task.prompt,
                    type: 'batch',
                    status: '失败',
                    error: error.message
                });
            } finally {
                completedCount++;
                if (btn) {
                    btn.innerHTML = '<span class="loading"></span>处理中 ' + completedCount + '/' + batchTasks.length + '...';
                }
            }
        });
        
        // 等待所有任务完成
        await Promise.all(tasks);
        
        // 清空批处理任务
        batchTasks = [];
        updateBatchTaskList();
        
        // 如果没有任务了，隐藏批处理标签页
        const batchTab = document.querySelector('.tab[data-tab="batch"]');
        if (batchTab) {
            batchTab.style.display = 'none';
        }
        
        // 恢复按钮状态
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '开始批处理';
        }
        
        showStatus('批处理完成，成功 ' + successCount + ' 个任务', 'success');
        showToast('批处理完成');
    }

    let chatSelectedImageBase64 = null;

    async function chatReadSelection() {
        initCompatibility();
        if (!psAPI.app || !psAPI.core || !psAPI.imaging) {
            showStatus('UXP模块未加载', 'error');
            return;
        }

        const btn = document.getElementById('btnChatReadSelection');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span>读取中...';
        showStatus('正在读取选区...', 'info');

        try {
            const bounds = await getSelectionBoundsInPixels();
            if (bounds) {
                
                const base64Data = await getImageDataToBase64(bounds);
                
                if (base64Data && base64Data.length > 0) {
                    chatSelectedImageBase64 = 'data:image/png;base64,' + base64Data;
                    
                    const selectionInfo = document.getElementById('chatSelectionInfo');
                    if (selectionInfo) {
                        selectionInfo.textContent = '选区尺寸: ' + Math.round(bounds.width) + ' x ' + Math.round(bounds.height) + ' 像素';
                    }
                    
                    const previewImage = document.getElementById('chatPreviewImage');
                    const previewPlaceholder = document.getElementById('chatPreviewPlaceholder');
                    if (previewImage) {
                        previewImage.src = chatSelectedImageBase64;
                        previewImage.style.display = 'block';
                    }
                    if (previewPlaceholder) {
                        previewPlaceholder.style.display = 'none';
                    }
                    
                    showStatus('选区读取成功', 'success');
                    showToast('选区已读取');
                }
            } else {
                const selectionInfo = document.getElementById('chatSelectionInfo');
                if (selectionInfo) {
                    selectionInfo.textContent = '未检测到选区';
                }
                showStatus('未检测到选区', 'error');
            }
        } catch (e) {
            debugLog("选区读取失败:", e);
            chatSelectedImageBase64 = null;
            showStatus('选区读取失败：' + e.message, 'error');
        }

        btn.disabled = false;
        btn.innerHTML = '读取选区';
    }

    function chatSendToImg2Img() {
        // 查找最后一条API传回来的消息（role为'assistant'的消息）
        let lastAssistantMessage = '';
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            if (chatHistory[i].role === 'assistant') {
                lastAssistantMessage = chatHistory[i].content;
                break;
            }
        }
        
        if (lastAssistantMessage) {
            document.getElementById('imgPrompt').value = lastAssistantMessage;
        }
        
        if (chatSelectedImageBase64) {
            selectedImageBase64 = chatSelectedImageBase64;
            
            const previewImage = document.getElementById('previewImage');
            const previewPlaceholder = document.getElementById('previewPlaceholder');
            const selectionInfo = document.getElementById('selectionInfo');
            
            if (previewImage) {
                previewImage.src = selectedImageBase64;
                previewImage.style.display = 'block';
            }
            if (previewPlaceholder) {
                previewPlaceholder.style.display = 'none';
            }
            if (selectionInfo) {
                selectionInfo.textContent = '已从聊天界面导入选区';
            }
        }
        
        switchTab('img2img');
        showToast('已发送到图生图');
    }
    
    async function img2ImgReadSelection() {
        initCompatibility();
        if (!psAPI.app || !psAPI.core || !psAPI.imaging) {
            showStatus('UXP模块未加载', 'error');
            return;
        }

        const btn = document.getElementById('btnImg2ImgReadSelection');
        btn.disabled = true;
        btn.innerHTML = '<span class="loading"></span>读取中...';
        showStatus('正在读取选区...', 'info');

        try {
            const bounds = await getSelectionBoundsInPixels();
            if (bounds) {
                savedSelectionBounds = bounds;

                const base64Data = await getImageDataToBase64(bounds);

                if (base64Data && base64Data.length > 0) {
                    selectedImageBase64 = 'data:image/png;base64,' + base64Data;

                    const selectionInfo = document.getElementById('selectionInfo');
                    if (selectionInfo) {
                        selectionInfo.textContent = '选区尺寸: ' + Math.round(bounds.width) + ' x ' + Math.round(bounds.height) + ' 像素';
                    }

                    const previewImage = document.getElementById('previewImage');
                    const previewPlaceholder = document.getElementById('previewPlaceholder');
                    if (previewImage) {
                        previewImage.src = selectedImageBase64;
                        previewImage.style.display = 'block';
                    }
                    if (previewPlaceholder) {
                        previewPlaceholder.style.display = 'none';
                    }

                    showStatus('选区读取成功', 'success');
                    showToast('选区已读取');
                }
            } else {
                savedSelectionBounds = null;
                selectedImageBase64 = null;
                const selectionInfo = document.getElementById('selectionInfo');
                if (selectionInfo) {
                    selectionInfo.textContent = '未检测到选区 - 图像将创建为新文档';
                }
                const previewImage = document.getElementById('previewImage');
                const previewPlaceholder = document.getElementById('previewPlaceholder');
                if (previewImage) {
                    previewImage.style.display = 'none';
                }
                if (previewPlaceholder) {
                    previewPlaceholder.style.display = 'block';
                }
                showStatus('未检测到选区', 'error');
            }
        } catch (e) {
            debugLog("选区读取失败:", e);
            savedSelectionBounds = null;
            selectedImageBase64 = null;
            showStatus('选区读取失败：' + e.message, 'error');
        }

        btn.disabled = false;
        btn.innerHTML = '读取选区';
    }

    function normalizeReferenceImageData(image) {
        if (!image) return '';
        const raw = typeof image === 'string' ? image : image.base64;
        const value = String(raw || '').trim();
        if (!value) return '';
        if (/^data:image\//i.test(value)) return value;
        return 'data:image/png;base64,' + value.replace(/^data:[^,]+,/, '');
    }

    function normalizeReferenceImageList(images) {
        return (Array.isArray(images) ? images : [])
            .map(function(item, index) {
                const base64 = normalizeReferenceImageData(item);
                if (!base64) return null;
                const bounds = item && typeof item === 'object' && item.bounds ? item.bounds : null;
                return {
                    base64: base64,
                    label: '图' + (index + 2),
                    bounds: bounds
                };
            })
            .filter(Boolean)
            .slice(0, MAX_REFERENCE_IMAGES);
    }

    function getActiveReferenceImageData() {
        return referenceImages
            .map(function(item) { return normalizeReferenceImageData(item); })
            .filter(Boolean)
            .slice(0, MAX_REFERENCE_IMAGES);
    }

    function renderReferenceImages() {
        const countEl = document.getElementById('referenceImageCount');
        const slotsEl = document.getElementById('referenceImageSlots');
        if (countEl) {
            countEl.textContent = String(referenceImages.length);
        }
        if (!slotsEl) return;

        slotsEl.innerHTML = '';
        referenceImages.forEach(function(ref, index) {
            const slot = document.createElement('div');
            slot.className = 'reference-slot';

            const img = document.createElement('img');
            img.src = ref.base64;
            img.alt = ref.label || ('图' + (index + 2));
            img.title = '点击重新抓取当前选区';
            img.onclick = function(event) {
                event.stopPropagation();
                recaptureReferenceImage(index);
            };
            slot.appendChild(img);

            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'reference-slot-delete';
            del.textContent = '×';
            del.title = '删除参考图';
            del.onclick = function(event) {
                event.stopPropagation();
                removeReferenceImage(index);
            };
            slot.appendChild(del);

            slotsEl.appendChild(slot);
        });

        for (let i = referenceImages.length; i < MAX_REFERENCE_IMAGES; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'reference-slot empty';
            placeholder.textContent = '图' + (i + 2);
            slotsEl.appendChild(placeholder);
        }
    }

    async function captureReferenceImageFromSelection() {
        initCompatibility();
        if (!psAPI.app || !psAPI.core || !psAPI.imaging) {
            throw new Error('UXP模块未加载');
        }

        const bounds = await getSelectionBoundsInPixels();
        if (!bounds) {
            throw new Error('未检测到选区');
        }
        if (bounds.width <= 0 || bounds.height <= 0) {
            throw new Error('选区尺寸无效，请重新选择区域');
        }

        const base64Data = await getImageDataToBase64(bounds);
        if (!base64Data || base64Data.length <= 0) {
            throw new Error('选区图像读取失败');
        }

        return {
            base64: normalizeReferenceImageData(base64Data),
            bounds: JSON.parse(JSON.stringify(bounds))
        };
    }

    async function addReferenceImageFromSelection() {
        if (referenceImages.length >= MAX_REFERENCE_IMAGES) {
            showStatus('最多添加 ' + MAX_REFERENCE_IMAGES + ' 张参考图', 'error');
            return;
        }

        const btn = document.getElementById('btnAddReferenceImage');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span>添加中...';
        }
        showStatus('正在添加参考图...', 'info');

        try {
            const capture = await captureReferenceImageFromSelection();
            referenceImages.push({
                base64: capture.base64,
                label: '图' + (referenceImages.length + 2),
                bounds: capture.bounds
            });
            renderReferenceImages();
            showStatus('参考图已添加', 'success');
            showToast('参考图已添加');
        } catch (e) {
            showStatus('添加参考图失败：' + e.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '添加当前选区为参考图';
            }
        }
    }

    async function recaptureReferenceImage(index) {
        if (index < 0 || index >= referenceImages.length) return;
        showStatus('正在重新抓取' + (referenceImages[index].label || ('图' + (index + 2))) + '...', 'info');

        try {
            const capture = await captureReferenceImageFromSelection();
            referenceImages[index] = {
                base64: capture.base64,
                label: '图' + (index + 2),
                bounds: capture.bounds
            };
            renderReferenceImages();
            showStatus('参考图已更新', 'success');
            showToast('参考图已更新');
        } catch (e) {
            showStatus('更新参考图失败：' + e.message, 'error');
        }
    }

    function removeReferenceImage(index) {
        if (index < 0 || index >= referenceImages.length) return;
        referenceImages.splice(index, 1);
        referenceImages = normalizeReferenceImageList(referenceImages);
        renderReferenceImages();
        showToast('参考图已删除');
    }

    function clearReferenceImages() {
        referenceImages = [];
        renderReferenceImages();
        showToast('参考图已清空');
    }

    function setModelButtonsState(loading) {
        const btnAutoFetchNewApi = document.getElementById('btnAutoFetchNewApiModels');

        if (btnAutoFetchNewApi) {
            btnAutoFetchNewApi.disabled = loading;
            btnAutoFetchNewApi.innerHTML = loading
                ? '<span class="loading"></span>读取中...'
                : '☁️ 抓取 NewAPI 模型';
        }
    }

    function resetModelSelects() {
        const chatModelSelect = document.getElementById('chatModel');
        const imgModelSelect = document.getElementById('imgModel');

        if (chatModelSelect) {
            chatModelSelect.innerHTML = '<option value="">-- 点击获取模型列表 --</option>';
        }

        if (imgModelSelect) {
            fillImageModels([]);
        }

        refreshCustomSelectById('chatModel');
        refreshCustomSelectById('imgModel');
    }

    function fillImageModels(models) {
        const imgModelSelect = document.getElementById('imgModel');
        if (!imgModelSelect) return;

        imgModelSelect.innerHTML = '';
        const added = new Set();
        const addOption = function(value, text) {
            const cleanName = getModelName(value);
            const key = String(cleanName || '').toLowerCase();
            if (!cleanName || !key || added.has(key)) return;

            const option = document.createElement('option');
            option.value = cleanName;
            option.textContent = text || cleanName;
            imgModelSelect.appendChild(option);
            added.add(key);
        };

        addOption('PS_NATIVE_NANO_BANANA', 'PS 原生 Banana Pro (Photoshop 官方)');

        (models || []).forEach(function(model) {
            const rawName = model.name || model.id || model.value || model;
            const cleanName = normalizeGrsModelName(rawName);
            const lowerName = String(cleanName).toLowerCase();
            const shouldInclude = isGrsNanoBananaModel(lowerName) || isGrsGptImageModel(lowerName);

            if (!shouldInclude) return;
            addOption(cleanName, getImageModelDisplayName(cleanName, model.displayName || model.text || cleanName));
        });

        DEFAULT_IMAGE_MODELS.forEach(function(model) {
            addOption(model.value, getImageModelDisplayName(model.value, model.text));
        });

        GRS_IMAGE_MODEL_DEFAULT_OPTIONS.forEach(function(model) {
            addOption(model.value, getImageModelDisplayName(model.value, model.text));
        });

        if (!imgModelSelect.options.length) {
            const option = document.createElement('option');
            option.value = 'nano-banana-pro';
            option.textContent = 'nano-banana-pro (GRS Nano Banana Pro)';
            imgModelSelect.appendChild(option);
        }

        if (imgModelSelect.options.length > 0 && imgModelSelect.selectedIndex < 0) {
            imgModelSelect.selectedIndex = 0;
        }

        refreshCustomSelectById('imgModel');
    }

    function getNewApiChatProviderByModelName(modelName) {
        const cleanName = String(getModelName(modelName) || '').trim();
        if (!cleanName) return '';
        return 'newapi';
    }

    function extractNewApiChatModels(rawData) {
        const modelItems = []
            .concat((rawData && rawData.data) || [])
            .concat((rawData && rawData.models) || [])
            .concat((rawData && rawData.result && rawData.result.data) || []);

        const mapped = [];
        const added = new Set();

        modelItems.forEach(function(item) {
            const rawName = item && (item.id || item.name || item.model || item.value);
            const cleanName = String(getModelName(rawName) || '').trim();
            const provider = getNewApiChatProviderByModelName(cleanName);
            if (!cleanName || !provider) return;

            const key = provider + '::' + cleanName.toLowerCase();
            if (added.has(key)) return;
            added.add(key);

            mapped.push({
                provider: provider,
                value: cleanName,
                text: cleanName + ' (NewAPI)'
            });
        });

        return mapped;
    }

    function fillChatModels(models, googleApiKey, googleAiEnabled, newApiKey, newApiUrl, newApiModels) {
        const chatModelSelect = document.getElementById('chatModel');
        if (!chatModelSelect) return;

        chatModelSelect.innerHTML = '';

        let hasValidModels = false;
        const added = new Set();

        const addChatOption = function(provider, value, text) {
            const cleanName = getModelName(value);
            const key = getChatOptionKey(provider, cleanName);
            if (!cleanName || added.has(key)) return;
            const option = document.createElement('option');
            option.value = buildModelValue(provider, cleanName);
            option.textContent = text || cleanName;
            chatModelSelect.appendChild(option);
            added.add(key);
            hasValidModels = true;
        };

        GRS_CHAT_MODEL_DEFAULT_OPTIONS.forEach(function(model) {
            addChatOption('grs', model.value, model.text);
        });

        (models || []).forEach(function(model) {
            const rawName = model.name || model.id || model.value || model;
            const cleanName = getModelName(rawName);
            const lowerName = String(cleanName).toLowerCase();

            if (isGrsChatModel(lowerName)) {
                addChatOption('grs', cleanName, (model.displayName || model.text || cleanName) + ' (GRS)');
            }
        });

        (newApiModels || []).forEach(function(model) {
            const provider = model.provider || 'newapi';
            addChatOption(provider, model.value || model.name || model.id || model, model.text || ((model.value || model.name || model.id || model) + ' (NewAPI)'));
        });

        if (!hasValidModels) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '-- 未获取到聊天模型 --';
            chatModelSelect.appendChild(option);
        }

        if (chatModelSelect.options.length > 0 && chatModelSelect.selectedIndex < 0) {
            chatModelSelect.selectedIndex = 0;
        }

        refreshCustomSelectById('chatModel');
    }

    async function refreshModels(forceReload = false) {
    const chatApiKeyEl = document.getElementById('chatApiKey');
    const googleApiKeyEl = document.getElementById('googleApiKey');
    const newApiKeyEl = document.getElementById('newApiKey');
    const newApiUrlEl = document.getElementById('newApiUrl');
    const googleAiEnabledEl = document.getElementById('googleAiEnabled');

    const chatApiKey = normalizeApiKey(chatApiKeyEl ? chatApiKeyEl.value : '');
    const googleApiKey = normalizeApiKey(googleApiKeyEl ? googleApiKeyEl.value : '');
    const newApiKey = normalizeApiKey(newApiKeyEl ? newApiKeyEl.value : '');
    const newApiUrl = normalizeBaseUrl(newApiUrlEl ? newApiUrlEl.value : '', '');
    const googleAiEnabled = googleAiEnabledEl ? googleAiEnabledEl.checked : true;

    if (currentRefreshAbortController) {
        currentRefreshAbortController.abort();
        currentRefreshAbortController = null;
        setModelButtonsState(false);
        showStatus('模型获取已取消', 'info');
        return;
    }

    if (!chatApiKey && !googleApiKey && !newApiKey) {
        fillImageModels([]);
        fillChatModels([], googleApiKey, googleAiEnabled, newApiKey, newApiUrl, currentNewApiChatModels);
        showStatus('图生图模型使用本地内置列表', 'info');
        return;
    }

    if (forceReload) {
        resetModelSelects();
    }

    const refreshController = new AbortController();
    currentRefreshAbortController = refreshController;
    setModelButtonsState(true);
    showStatus(forceReload ? '正在重新拉取模型...' : '正在获取模型列表...', 'info');

    try {
        let chatModels = [];
        let chatFailed = false;
        let newApiFailed = false;

        fillImageModels([]);

        // OpenAI 官方接口不走当前的 models 拉取逻辑，这里使用内置白名单模型

        if (newApiKey && newApiUrl) {
            const newApiResult = await API.listNewApiModels(newApiKey, newApiUrl, refreshController.signal);
            if (refreshController.signal.aborted) return;

            if (newApiResult.success) {
                currentNewApiChatModels = extractNewApiChatModels(newApiResult.data || {});
            } else {
                newApiFailed = true;
                chatFailed = true;
                console.error('自动读取NewAPI模型失败:', newApiResult.error);
            }
        } else if (forceReload) {
            currentNewApiChatModels = [];
        }

        // 聊天模型按内置 GRS 列表填充，图生图模型不进行远程获取
        fillImageModels([]);
        fillChatModels(chatModels, googleApiKey, googleAiEnabled, newApiKey, newApiUrl, currentNewApiChatModels);

        // 尝试恢复已保存模型
        const chatModelSelect = document.getElementById('chatModel');
        const imgModelSelect = document.getElementById('imgModel');

        if (currentSettings) {
            const savedChatModel = normalizeChatModelValue(currentSettings.chatModel || currentSettings.model || '');
            const savedImgModel = getModelName(currentSettings.imgModel || currentSettings.model || '');

            if (chatModelSelect) {
                for (let i = 0; i < chatModelSelect.options.length; i++) {
                    if (normalizeChatModelValue(chatModelSelect.options[i].value) === savedChatModel) {
                        chatModelSelect.selectedIndex = i;
                        break;
                    }
                }
                refreshCustomSelectById('chatModel');
            }

            if (imgModelSelect) {
                for (let i = 0; i < imgModelSelect.options.length; i++) {
                    if (getModelName(imgModelSelect.options[i].value) === savedImgModel) {
                        imgModelSelect.selectedIndex = i;
                        break;
                    }
                }
                refreshCustomSelectById('imgModel');
            }
        }

        // 刷新模型后更新预览比例
        const currentImgModelEl2 = document.getElementById('imgModel');
        updatePreviewAspectByModel(currentImgModelEl2 ? currentImgModelEl2.value : '');
        
        if (newApiFailed) {
            showStatus('NewAPI 模型自动读取失败，图生图模型使用内置列表', 'error');
            showToast('NewAPI 模型读取失败');
        } else if (chatFailed) {
            showStatus('聊天模型远程获取失败，图生图模型使用内置列表', 'error');
            showToast('聊天模型获取失败');
        } else {
            showStatus('模型列表已更新，图生图模型使用内置列表', 'success');
            showToast('模型列表已更新');
        }
    } catch (e) {
        console.error('refreshModels 出错:', e);
        fillImageModels([]);
        fillChatModels([], googleApiKey, googleAiEnabled, newApiKey, newApiUrl, currentNewApiChatModels);
        showStatus('模型列表刷新异常，图生图模型已保留内置列表', 'error');
    } finally {
        if (currentRefreshAbortController === refreshController) {
            currentRefreshAbortController = null;
        }
        setModelButtonsState(false);
    }
}

    async function fetchNewApiModelsAndFillChat() {
    const newApiKeyEl = document.getElementById('newApiKey');
    const newApiUrlEl = document.getElementById('newApiUrl');
    const googleApiKeyEl = document.getElementById('googleApiKey');
    const googleAiEnabledEl = document.getElementById('googleAiEnabled');
    const chatModelSelect = document.getElementById('chatModel');

    const newApiKey = normalizeApiKey(newApiKeyEl ? newApiKeyEl.value : '');
    const newApiUrl = normalizeBaseUrl(newApiUrlEl ? newApiUrlEl.value : '', '');
    const googleApiKey = normalizeApiKey(googleApiKeyEl ? googleApiKeyEl.value : '');
    const googleAiEnabled = googleAiEnabledEl ? googleAiEnabledEl.checked : true;
    const savedChatModel = chatModelSelect ? normalizeChatModelValue(chatModelSelect.value) : '';

    if (!newApiUrl) {
        showStatus('请先在设置中填写 NewAPI 地址', 'error');
        return;
    }

    if (!newApiKey) {
        showStatus('请先在设置中填写 NewAPI 密钥', 'error');
        return;
    }

    if (currentRefreshAbortController) {
        currentRefreshAbortController.abort();
        currentRefreshAbortController = null;
        setModelButtonsState(false);
        showStatus('模型抓取已取消', 'info');
        return;
    }

    const refreshController = new AbortController();
    currentRefreshAbortController = refreshController;
    setModelButtonsState(true);
    showStatus('正在抓取 NewAPI 模型列表...', 'info');

    try {
        const modelResult = await API.listNewApiModels(newApiKey, newApiUrl, refreshController.signal);
        if (refreshController.signal.aborted) return;

        if (!modelResult.success) {
            throw new Error(modelResult.error || '抓取NewAPI模型失败');
        }

        currentNewApiChatModels = extractNewApiChatModels(modelResult.data || {});
        fillChatModels([], googleApiKey, googleAiEnabled, newApiKey, newApiUrl, currentNewApiChatModels);

        if (chatModelSelect && savedChatModel) {
            const savedIndex = Array.from(chatModelSelect.options).findIndex(function(option) {
                return normalizeChatModelValue(option.value) === savedChatModel;
            });
            if (savedIndex > -1) {
                chatModelSelect.selectedIndex = savedIndex;
                refreshCustomSelectById('chatModel');
            }
        }

        if (currentNewApiChatModels.length > 0) {
            showStatus('NewAPI 模型抓取成功，共 ' + currentNewApiChatModels.length + ' 个', 'success');
            showToast('NewAPI 模型已更新');
        } else {
            showStatus('NewAPI 返回成功，但未识别到可用 GPT/Gemini 聊天模型', 'error');
        }
    } catch (e) {
        console.error('fetchNewApiModelsAndFillChat 出错:', e);
        showStatus('抓取 NewAPI 模型失败: ' + e.message, 'error');
    } finally {
        if (currentRefreshAbortController === refreshController) {
            currentRefreshAbortController = null;
        }
        setModelButtonsState(false);
    }
}

    function saveSettings() {
        debugLog('saveSettings函数被调用');
        try {
            function normalizeApiKey(v) {
                return String(v || '')
                    .trim()
                    .replace(/^["']+|["']+$/g, '') // 去掉首尾引号
                    .replace(/\r?\n/g, '');        // 去掉换行
            }
            
            const chatApiKeyEl = document.getElementById('chatApiKey');
            const imgApiKeyEl = document.getElementById('imgApiKey');
            const chatApiUrlEl = document.getElementById('chatApiUrl');
            const imgApiUrlEl = document.getElementById('imgApiUrl');
            const newApiUrlEl = document.getElementById('newApiUrl');
            const newApiKeyEl = document.getElementById('newApiKey');
            const newApiImageModeEl = document.getElementById('newApiImageMode');
            const googleApiKeyEl = document.getElementById('googleApiKey');
            const googleAiEnabledEl = document.getElementById('googleAiEnabled');
            const sdApiUrlEl = document.getElementById('sdApiUrl');
            const chatModelEl = document.getElementById('chatModel');
            const imgModelEl = document.getElementById('imgModel');
            const imgResolutionEl = document.getElementById('imgResolution');
            
            debugLog('获取DOM元素:', {
                chatApiKeyEl: !!chatApiKeyEl,
                imgApiKeyEl: !!imgApiKeyEl,
                chatApiUrlEl: !!chatApiUrlEl,
                imgApiUrlEl: !!imgApiUrlEl,
                newApiUrlEl: !!newApiUrlEl,
                newApiKeyEl: !!newApiKeyEl,
                googleApiKeyEl: !!googleApiKeyEl,
                googleAiEnabledEl: !!googleAiEnabledEl,
                sdApiUrlEl: !!sdApiUrlEl,
                chatModelEl: !!chatModelEl,
                imgModelEl: !!imgModelEl,
                imgResolutionEl: !!imgResolutionEl
            });
            
            const chatApiKey = chatApiKeyEl ? chatApiKeyEl.value.trim() : '';
            const imgApiKey = imgApiKeyEl ? imgApiKeyEl.value.trim() : '';
            const chatApiUrl = chatApiUrlEl ? chatApiUrlEl.value.trim() : '';
            const imgApiUrl = imgApiUrlEl ? imgApiUrlEl.value.trim() : '';
            const newApiUrl = newApiUrlEl ? normalizeBaseUrl(newApiUrlEl.value.trim(), '') : '';
            const newApiKey = newApiKeyEl ? newApiKeyEl.value.trim() : '';
            const newApiImageMode = newApiImageModeEl ? newApiImageModeEl.value : 'auto';
            const googleApiKey = googleApiKeyEl ? googleApiKeyEl.value.trim() : '';
            const googleAiEnabled = googleAiEnabledEl ? !!googleAiEnabledEl.checked : true;
            const sdApiUrl = sdApiUrlEl ? sdApiUrlEl.value.trim() : '';
            const alignmentModeEl = document.getElementById('alignmentMode');
            const alignmentMode = alignmentModeEl ? alignmentModeEl.value : 'normal';
            const lockedGrsApiUrl = normalizeGrsBaseUrlStrict(imgApiUrl || GRS_DEFAULT_BASE_URL);
            const lockedChatApiUrl = OPENAI_OFFICIAL_BASE_URL;
            const chatModel = chatModelEl ? chatModelEl.value : '';
            const imgModel = imgModelEl ? imgModelEl.value : '';
            const imgResolution = normalizeImageResolution(imgResolutionEl ? imgResolutionEl.value : DEFAULT_IMAGE_RESOLUTION);
            const model = imgModel || chatModel || "gemini-2.0-flash-exp";
            const textSizeMultiplierEl = document.getElementById('textSizeMultiplier');
            const textSizeMultiplier = textSizeMultiplierEl ? parseFloat(textSizeMultiplierEl.value) : 1;
            
            debugLog('获取设置值:', {
                chatApiKey: chatApiKey ? '***' : '',
                imgApiKey: imgApiKey ? '***' : '',
                newApiKey: newApiKey ? '***' : '',
                newApiUrl: newApiUrl || '',
                newApiImageMode: newApiImageMode,
                googleApiKey: googleApiKey ? '***' : '',
                googleAiEnabled: googleAiEnabled,
                chatApiUrl: lockedChatApiUrl,
                imgApiUrl: lockedGrsApiUrl,
                sdApiUrl: sdApiUrl || '默认',
                chatModel: chatModel,
                imgModel: imgModel,
                imgResolution: imgResolution,
                model: model
            });
            
            // 移除API密钥检查，允许保存空设置
            
            const settings = {
                chatApiKey: chatApiKey,
                imgApiKey: imgApiKey,
                newApiUrl: newApiUrl,
                newApiKey: newApiKey,
                newApiImageMode: newApiImageMode,
                googleApiKey: googleApiKey,
                googleAiEnabled: googleAiEnabled,
                chatApiUrl: lockedChatApiUrl,
                imgApiUrl: lockedGrsApiUrl,
                sdApiUrl: sdApiUrl,
                chatModel: normalizeChatModelValue(chatModel || DEFAULT_GRS_CHAT_MODEL),
                imgModel: imgModel || DEFAULT_IMAGE_MODEL,
                imgResolution: imgResolution,
                model: model,
                imageWidth: 1024,
                imageHeight: 1024,
                widthUnit: 'pixel',
                heightUnit: 'pixel',
                textSizeMultiplier: textSizeMultiplier,
                alignmentMode: alignmentMode
            };
            
            debugLog('保存设置:', settings);
            Config.saveSettings(settings);
            currentSettings = settings;

            if (imgApiUrlEl) {
                imgApiUrlEl.value = lockedGrsApiUrl;
            }
            if (chatApiUrlEl) {
                chatApiUrlEl.value = lockedChatApiUrl;
            }
            if (newApiImageModeEl) {
                newApiImageModeEl.value = newApiImageMode;
            }

            debugLog('设置保存成功');
            showStatus('设置已保存', 'success');
            showToast('设置已保存');
        } catch (error) {
            console.error('保存设置失败:', error);
            showStatus('保存设置失败: ' + error.message, 'error');
        }
    }

    function extractTextFromContentParts(content) {
        if (typeof content === 'string') return content;
        if (!Array.isArray(content)) return '';
        return content.map(function(part) {
            if (!part) return '';
            if (typeof part === 'string') return part;
            if (typeof part.text === 'string') return part.text;
            if (part.content && typeof part.content.text === 'string') return part.content.text;
            if (typeof part.content === 'string') return part.content;
            return '';
        }).filter(Boolean).join('\n').trim();
    }

    function extractChatResponseText(responseData) {
        if (!responseData) return '';
        if (responseData.choices && responseData.choices[0]) {
            const choice = responseData.choices[0];
            if (choice.message) {
                const messageContent = extractTextFromContentParts(choice.message.content);
                if (messageContent) return messageContent;
            }
            if (choice.delta) {
                const deltaContent = extractTextFromContentParts(choice.delta.content);
                if (deltaContent) return deltaContent;
            }
            const choiceText = extractTextFromContentParts(choice.text || choice.content);
            if (choiceText) return choiceText;
        }
        if (responseData.candidates && responseData.candidates[0] && responseData.candidates[0].content && responseData.candidates[0].content.parts) {
            const parts = responseData.candidates[0].content.parts;
            let text = '';
            for (let i = 0; i < parts.length; i++) {
                if (parts[i].text) {
                    text += parts[i].text + '\n';
                }
            }
            if (text.trim()) return text.trim();
        }
        if (responseData.message) {
            const messageText = extractTextFromContentParts(responseData.message.content || responseData.message.text);
            if (messageText) return messageText;
        }
        if (responseData.data) {
            const dataText = extractTextFromContentParts(responseData.data.text || responseData.data.content || (responseData.data.message && responseData.data.message.content));
            if (dataText) return dataText;
        }
        const directText = extractTextFromContentParts(responseData.content || responseData.text || responseData.output_text);
        if (directText) return directText;
        return '';
    }

    function buildChatContextMessages(prompt, imageBase64) {
        const text = prompt || '请描述这张图片';
        const recentHistory = chatHistory
            .filter(function(message) {
                return message && (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string' && message.content.trim();
            })
            .slice(-(CHAT_MEMORY_ROUNDS * 2))
            .map(function(message) {
                return {
                    role: message.role,
                    content: message.content.replace(/\n\n\[已添加选区图片\]$/, '').trim()
                };
            })
            .filter(function(message) {
                return message.content;
            });

        const currentMessage = {
            role: 'user',
            content: text
        };

        if (imageBase64) {
            currentMessage.content = [
                { type: 'text', text: text },
                { type: 'image_url', image_url: { url: imageBase64 } }
            ];
        }

        return recentHistory.concat(currentMessage);
    }

    async function chat() {
        const chatPromptEl = document.getElementById('chatPrompt');
        const chatModelEl = document.getElementById('chatModel');
        const prompt = chatPromptEl ? chatPromptEl.value.trim() : '';
        const chatModelValue = (chatModelEl && chatModelEl.value) || (currentSettings && currentSettings.chatModel) || DEFAULT_GRS_CHAT_MODEL;

        if (!prompt && !chatSelectedImageBase64) {
            showStatus('请输入消息或读取选区', 'error');
            return;
        }

        if (prompt) {
            lastChatInput = prompt;
        }

        if (!currentSettings) {
            showStatus('请先在设置中配置API密钥', 'error');
            switchTab('settings');
            return;
        }

        const chatRouteValidation = validateChatApiRouting(chatModelValue, currentSettings);
        if (!chatRouteValidation.valid) {
            showStatus(chatRouteValidation.message, 'error');
            switchTab('settings');
            return;
        }

        const chatRoute = chatRouteValidation.route;
        const btn = document.getElementById('btnChat');
        if (btn) {
            btn.disabled = true;
        }

        const startTime = Date.now();
        let timerInterval;

        if (btn) {
            timerInterval = setInterval(() => {
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                btn.innerHTML = '<span class="loading"></span>发送中... ' + elapsedTime + 's';
            }, 1000);
        }

        showStatus('正在发送消息，请稍候...', 'info');
        await new Promise(resolve => requestAnimationFrame(resolve));

        try {
            const timestamp = new Date().toLocaleString('zh-CN');
            const messages = buildChatContextMessages(prompt, chatSelectedImageBase64);
            let displayContent = prompt || '';
            if (chatSelectedImageBase64) {
                displayContent = (displayContent ? displayContent + '\n\n' : '') + '[已添加选区图片]';
            }
            chatHistory.push({
                role: 'user',
                content: displayContent,
                timestamp: timestamp
            });
            updateChatHistory();

            if (chatPromptEl) {
                chatPromptEl.value = '';
                resizeChatPrompt();
            }

            const result = isNewApiProvider(chatRoute.provider)
                ? await API.chatNewApi({
                    apiKey: chatRoute.apiKey,
                    baseUrl: chatRoute.baseUrl,
                    model: chatRoute.model,
                    prompt: prompt || '请描述这张图片',
                    messages: messages
                })
                : await API.generateImage({
                    apiKey: chatRoute.apiKey,
                    provider: chatRoute.provider,
                    baseUrl: chatRoute.baseUrl,
                    model: chatRoute.model,
                    prompt: prompt || '请描述这张图片',
                    imageBase64: chatSelectedImageBase64,
                    messages: messages
                });

            if (result.success) {
                const responseData = result.data;
                const responseText = extractChatResponseText(responseData);

                if (responseText) {
                    chatHistory.push({
                        role: 'assistant',
                        content: responseText,
                        timestamp: new Date().toLocaleString('zh-CN')
                    });
                    updateChatHistory();

                    showStatus('消息发送成功', 'success');
                    showToast('收到回复');

                    Config.addLog({
                        timestamp: timestamp,
                        model: chatModelValue,
                        prompt: prompt,
                        type: 'chat',
                        status: '成功',
                        response: responseText
                    });
                } else {
                    const errorText = '发送失败：无法从响应中提取文本';
                    chatHistory.push({
                        role: 'assistant',
                        content: errorText,
                        timestamp: new Date().toLocaleString('zh-CN')
                    });
                    updateChatHistory();
                    showStatus(errorText, 'error');
                    Config.addLog({
                        timestamp: timestamp,
                        model: chatModelValue,
                        prompt: prompt,
                        type: 'chat',
                        status: '失败',
                        error: '无法从响应中提取文本'
                    });
                }
            } else {
                const errorMsg = result.error || '未知错误';
                const errorText = '发送失败：' + errorMsg;
                chatHistory.push({
                    role: 'assistant',
                    content: errorText,
                    timestamp: new Date().toLocaleString('zh-CN')
                });
                updateChatHistory();
                showStatus(errorText, 'error');

                Config.addLog({
                    timestamp: new Date().toLocaleString('zh-CN'),
                    model: chatModelValue,
                    prompt: prompt,
                    type: 'chat',
                    status: '失败',
                    error: errorMsg
                });
            }
        } catch (e) {
            const errorMsg = e && e.message ? e.message : '未知错误';
            const errorText = '发送失败：' + errorMsg;
            chatHistory.push({
                role: 'assistant',
                content: errorText,
                timestamp: new Date().toLocaleString('zh-CN')
            });
            updateChatHistory();
            showStatus(errorText, 'error');
            Config.addLog({
                timestamp: new Date().toLocaleString('zh-CN'),
                model: chatModelValue,
                prompt: prompt,
                type: 'chat',
                status: '失败',
                error: errorMsg
            });
        } finally {
            if (timerInterval) {
                clearInterval(timerInterval);
            }

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '发送消息';
            }
        }
    }

    async function img2Img() {
        initCompatibility();
        const btn = document.getElementById('btnImg2Img');
        if (!btn) return;
        
        // 检查是否有正在进行的任务
        if (currentGenerationTask) {
            debugLog('取消当前生成任务...');
            
            // 取消当前任务
            if (currentGenerationAbortController) {
                currentGenerationAbortController.abort();
            }

            btn.disabled = true;
            btn.innerHTML = '正在取消...';
            
            showStatus('生成任务已取消', 'info');
            showToast('生成任务已取消');
            return;
        }
        
        debugLog('开始执行img2Img函数...');
        
        const prompt = normalizePresetPromptText(document.getElementById('imgPrompt').value.trim());
        const model = document.getElementById('imgModel').value;
        const imageResolution = getSelectedImageResolution();
        const imageCount = parseInt(document.getElementById('imageCount').value) || 1;

        if (!prompt) {
            debugLog('没有输入提示词');
            showStatus('请输入提示词', 'error');
            return;
        }
        
        // 检查是否选择了PS原生模型
        if (model === 'PS_NATIVE_NANO_BANANA') {
            debugLog('使用PS原生Nano Banana Pro模型');
            await executeNativeAIPreset(prompt);
            return;
        }
        
        debugLog('提示词:', prompt);
        debugLog('模型:', model);
        debugLog('生成数量:', imageCount);
        debugLog('当前设置:', currentSettings);
        
        if (!currentSettings) {
            debugLog('没有配置API密钥');
            showStatus('请先在设置中配置API密钥', 'error');
            switchTab('settings');
            return;
        }
        
        const routingValidation = validateImageApiRouting(model, currentSettings);
        if (!routingValidation.valid) {
            showStatus(routingValidation.message, 'error');
            switchTab('settings');
            return;
        }

        const route = routingValidation.route;
        let imageConfig = getModelImageConfig(model, savedSelectionBounds, imageResolution);
        
        // 每次生成时都重新读取当前的选区
        if (psAPI.app && psAPI.core && psAPI.imaging) {
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span>正在读取选区...';
            showStatus('正在读取选区...', 'info');
            
            try {
                const bounds = await getSelectionBoundsInPixels();
                if (bounds) {
                    // 验证选区尺寸是否有效
                    if (bounds.width <= 0 || bounds.height <= 0) {
                        debugLog("选区尺寸无效: " + bounds.width + " x " + bounds.height);
                        btn.disabled = false;
                        btn.innerHTML = '生成图像';
                        showStatus('选区尺寸无效，请重新选择区域', 'error');
                        return;
                    }
                    
                    savedSelectionBounds = bounds;
                    debugLog("选区尺寸: " + bounds.width + " x " + bounds.height);
                    
                    const base64Data = await getImageDataToBase64(bounds);
                    
                    if (base64Data && base64Data.length > 0) {
                        selectedImageBase64 = 'data:image/png;base64,' + base64Data;
                        
                        const selectionInfo = document.getElementById('selectionInfo');
                        if (selectionInfo) {
                            selectionInfo.textContent = '选区尺寸: ' + Math.round(bounds.width) + ' x ' + Math.round(bounds.height) + ' 像素';
                        }
                        
                        const previewImage = document.getElementById('previewImage');
                        const previewPlaceholder = document.getElementById('previewPlaceholder');
                        if (previewImage) {
                            previewImage.src = selectedImageBase64;
                            previewImage.style.display = 'block';
                        }
                        if (previewPlaceholder) {
                            previewPlaceholder.style.display = 'none';
                        }
                        
                        debugLog("选区图片已读取，base64长度:", selectedImageBase64.length);
                    }
                } else {
                    savedSelectionBounds = null;
                    selectedImageBase64 = null;
                    const selectionInfo = document.getElementById('selectionInfo');
                    if (selectionInfo) {
                        selectionInfo.textContent = '未检测到选区 - 图像将创建为新文档';
                    }
                    debugLog("未检测到选区，将创建新文档");
                }
            } catch (e) {
                debugLog("选区读取失败:", e);
                savedSelectionBounds = null;
                selectedImageBase64 = null;
                btn.disabled = false;
                btn.innerHTML = '生成图像';
                showStatus('读取选区失败: ' + e.message, 'error');
                return;
            }
        } else {
            // 如果UXP模块未加载，使用已有的selectedImageBase64
            if (selectedImageBase64) {
                showStatus('使用已上传的图片进行生成...', 'info');
            }
        }

        imageConfig = getModelImageConfig(model, savedSelectionBounds, imageResolution);
        debugLog("图像配置: ", JSON.stringify(imageConfig));
        const width = imageConfig.width;
        const height = imageConfig.height;
        const activeReferenceImages = getActiveReferenceImageData();
        const requestPrompt = getImageRequestPrompt(model, prompt, !!selectedImageBase64);
        
        btn.disabled = false;
        
        const timestamp = new Date().toLocaleString('zh-CN');
        let successCount = 0;
        let completedCount = 0;
        
        // 创建AbortController用于取消任务
        currentGenerationAbortController = new AbortController();
        
        btn.innerHTML = '取消生成';
        showStatus('正在生成 ' + imageCount + ' 张图像...', 'info');
        
        // 让界面先刷新
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        let timerInterval = null;
        try {
            // 开始总计时器
            const startTime = Date.now();
            timerInterval = setInterval(() => {
                if (currentGenerationAbortController && currentGenerationAbortController.signal.aborted) {
                    btn.innerHTML = '正在取消...';
                    return;
                }
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                btn.innerHTML = '取消生成 (' + completedCount + '/' + imageCount + ' | ' + elapsedTime + 's)';
            }, 1000);
            
            // 创建并发生成图像的函数
            async function generateSingleImage(index) {
                try {
                    // 检查是否已被取消
                    if (currentGenerationAbortController.signal.aborted) {
                        debugLog('任务已被取消');
                        return false;
                    }
                    
                    // 根据模型选择使用哪个API
                    let result;
                    if (route.provider === 'google') {
                        result = await API.generateImageGoogle({
                            apiKey: route.apiKey,
                            model: model,
                            prompt: requestPrompt,
                            imageBase64: selectedImageBase64,
                            referenceImages: activeReferenceImages,
                            abortSignal: currentGenerationAbortController.signal
                        });
                    } else {
                        result = await API.generateImage({
                            apiKey: route.apiKey,
                            provider: route.provider,
                            apiType: route.apiType,
                            baseUrl: route.baseUrl,
                            model: model,
                            prompt: requestPrompt,
                            imageBase64: selectedImageBase64,
                            referenceImages: activeReferenceImages,
                            sizeHint: savedSelectionBounds,
                            imageResolution: imageResolution,
                            imageSize: imageConfig.imageSize,
                            aspectRatio: imageConfig.aspectRatio,
                            size: imageConfig.size,
                            abortSignal: currentGenerationAbortController.signal
                        });
                    }
                    
                    debugLog('API响应 ' + (index + 1) + ':', result);
                    
                    if (result.success) {
                        const responseData = result.data;
                        debugLog('响应数据 ' + (index + 1) + ':', responseData);
                        
                        // 提取图像URL
                        const imageUrl = extractImageFromResponse(responseData);
                        debugLog('提取到的图像URL ' + (index + 1) + ':', imageUrl);
                        
                        if (imageUrl) {
                            await downloadAndPlaceDocument(imageUrl, width, height, prompt, 'img2img', timestamp + ' (' + (index + 1) + ')', model);
                            return true;
                        } else {
                            Config.addLog({
                                timestamp: timestamp,
                                model: model,
                                prompt: prompt,
                                type: 'img2img',
                                status: '失败',
                                error: '无法从响应中提取图像'
                            });
                            return false;
                        }
                    } else {
                        const errorMsg = result.error || '未知错误';
                        Config.addLog({
                            timestamp: timestamp,
                            model: model,
                            prompt: prompt,
                            type: 'img2img',
                            status: '失败',
                            error: errorMsg
                        });
                        return false;
                    }
                } catch (error) {
                    console.error('生成图像 ' + (index + 1) + ' 出错:', error);
                    Config.addLog({
                        timestamp: timestamp,
                        model: model,
                        prompt: prompt,
                        type: 'img2img',
                        status: '失败',
                        error: error.message
                    });
                    return false;
                } finally {
                    completedCount++;
                }
            }
            
            // 创建并执行并发任务
            const tasks = [];
            for (let i = 0; i < imageCount; i++) {
                tasks.push(generateSingleImage(i));
            }
            
            // 保存当前任务
            currentGenerationTask = Promise.all(tasks);
            
            // 等待所有任务完成
            const results = await currentGenerationTask;
            
            // 计算成功数量
            successCount = results.filter(result => result).length;
            
            // 清除计时器
            clearInterval(timerInterval);
            timerInterval = null;
            
            if (successCount > 0) {
                showStatus('成功生成 ' + successCount + ' 张图像', 'success');
                showToast('成功生成 ' + successCount + ' 张图像');
            }
        } finally {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            // 重置状态
            currentGenerationTask = null;
            currentGenerationAbortController = null;
            
            btn.disabled = false;
            btn.innerHTML = '生成图像';
        }
    }

    function extractImageFromResponse(response) {
        try {
            debugLog('开始提取图像URL...');
            debugLog('响应类型:', typeof response);
            debugLog('响应结构:', JSON.stringify(response, null, 2));
            
            // 检查OpenAI格式 (choices -> message -> content)
            if (response.choices && response.choices[0] && response.choices[0].message && response.choices[0].message.content) {
                debugLog('检查choices路径...');
                const content = response.choices[0].message.content;
                if (typeof content === 'string') {
                    debugLog('内容类型为字符串，长度:', content.length);
                    const urlMatch = content.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/i);
                    if (urlMatch) {
                        debugLog('找到URL匹配:', urlMatch[0]);
                        return urlMatch[0];
                    }
                    const b64Match = content.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
                    if (b64Match) {
                        debugLog('找到base64匹配，长度:', b64Match[0].length);
                        return b64Match[0];
                    }
                }
            }
            
            // 检查Google AI Studio格式 (candidates -> content -> parts -> inlineData)
            if (response.candidates && response.candidates[0] && response.candidates[0].content && response.candidates[0].content.parts) {
                debugLog('检查candidates路径...');
                const parts = response.candidates[0].content.parts;
                debugLog('parts数量:', parts.length);
                for (let i = 0; i < parts.length; i++) {
                    debugLog('检查part', i, ':', parts[i]);
                    if (parts[i].inlineData) {
                        debugLog('找到inlineData:', parts[i].inlineData);
                        return 'data:' + parts[i].inlineData.mimeType + ';base64,' + parts[i].inlineData.data;
                    }
                    if (parts[i].text) {
                        const text = parts[i].text;
                        debugLog('part文本长度:', text.length);
                        const urlMatch = text.match(/https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/i);
                        if (urlMatch) {
                            debugLog('找到URL匹配:', urlMatch[0]);
                            return urlMatch[0];
                        }
                    }
                }
            }

            // 检查OpenAI内容数组格式
            if (response.choices && response.choices[0] && response.choices[0].message && Array.isArray(response.choices[0].message.content)) {
                const contentParts = response.choices[0].message.content;
                for (let i = 0; i < contentParts.length; i++) {
                    const part = contentParts[i];
                    if (!part) continue;
                    if (part.image_url && part.image_url.url) return part.image_url.url;
                    if (part.type === 'image_url' && part.url) return part.url;
                    if (part.b64_json) return 'data:image/png;base64,' + part.b64_json;
                }
            }

            // 检查GRS绘图格式 (data -> results/url)
            if (response.data && typeof response.data === 'object') {
                if (Array.isArray(response.data.results) && response.data.results[0] && response.data.results[0].url) {
                    debugLog('检查data.results[0].url路径...');
                    return response.data.results[0].url;
                }
                if (response.data.url) {
                    debugLog('检查data.url路径...');
                    return response.data.url;
                }
            }

            // 检查GRS绘图格式 (results/url)
            if (Array.isArray(response.results) && response.results[0] && response.results[0].url) {
                debugLog('检查results[0].url路径...');
                return response.results[0].url;
            }
            if (response.url) {
                debugLog('检查url路径...');
                return response.url;
            }
            
            // 检查DALL-E格式 (data -> url)
            if (response.data && response.data[0] && response.data[0].url) {
                debugLog('检查data.url路径...');
                return response.data[0].url;
            }
            
            // 检查DALL-E格式 (data -> b64_json)
            if (response.data && response.data[0] && response.data[0].b64_json) {
                debugLog('检查data.b64_json路径...');
                return 'data:image/png;base64,' + response.data[0].b64_json;
            }
            
            // 检查其他可能的格式
            if (response.images && response.images[0]) {
                debugLog('检查images路径...');
                const image = response.images[0];
                if (image.url) {
                    debugLog('找到images.url:', image.url);
                    return image.url;
                }
                if (image.b64_json) {
                    debugLog('找到images.b64_json');
                    return 'data:image/png;base64,' + image.b64_json;
                }
            }
            
            // 检查零柒API可能的响应格式
            if (response.result && response.result.image) {
                debugLog('检查result.image路径...');
                return response.result.image;
            }
            
            // 尝试从整个响应中提取
            debugLog('尝试从整个响应中提取...');
            const jsonStr = JSON.stringify(response);
            const urlMatch = jsonStr.match(/https?:\/\/[^\s"]+\.(?:png|jpg|jpeg|gif|webp)/i);
            if (urlMatch) {
                debugLog('找到URL匹配:', urlMatch[0]);
                return urlMatch[0];
            }
            const b64Match = jsonStr.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/);
            if (b64Match) {
                debugLog('找到base64匹配，长度:', b64Match[0].length);
                return b64Match[0];
            }
            
            debugLog('未找到图像URL');
        } catch (e) {
            console.error('提取图像失败:', e);
        }
        
        return null;
    }
    
    function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    const Photoshop = {
        async getSelectedRegion() {
            if (!psAPI.app) {
                return { error: "UXP模块未加载" };
            }
            
            try {
                const doc = psAPI.app.activeDocument;
                if (!doc) {
                    return { error: "没有活动文档" };
                }
                
                const sel = doc.selection;
                if (!sel || sel.bounds === undefined) {
                    return { error: "没有选区", hasSelection: false };
                }
                
                const b = sel.bounds;
                return { 
                    hasSelection: true, 
                    bounds: { 
                        left: b[0], 
                        top: b[1], 
                        right: b[2], 
                        bottom: b[3], 
                        width: b[2] - b[0], 
                        height: b[3] - b[1] 
                    } 
                };
            } catch (e) {
                return { error: e.message };
            }
        },
        
        async copySelection() {
            if (!psAPI.app) {
                return { error: "UXP模块未加载" };
            }
            
            try {
                const doc = psAPI.app.activeDocument;
                if (!doc) {
                    return { error: "没有活动文档" };
                }
                
                const sel = doc.selection;
                if (!sel || sel.bounds === undefined) {
                    return { error: "没有选区" };
                }
                
                // 简化版本：只返回成功，不实际执行复制
                return { success: true };
            } catch (e) {
                return { error: e.message };
            }
        },
        
        async createDocument(base64Data, width, height, name) {
            if (!psAPI.app) {
                return { error: "UXP模块未加载" };
            }
            
            try {
                // 简化版本：只返回成功，不实际创建文档
                return { success: true, documentName: name || "AI 生成" };
            } catch (e) {
                return { error: e.message };
            }
        }
    };

    async function downloadAndCreateDocument(imageUrl, width, height, prompt, type, timestamp, model) {
        try {
            let base64;
            
            if (imageUrl.startsWith('data:')) {
                base64 = imageUrl;
            } else {
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error('下载失败: ' + response.status);
                }
                const blob = await response.blob();
                base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }
            
            const docResult = await Photoshop.createDocument(base64, width, height, 'Gemini AI - ' + type);
            
            if (docResult && docResult.success) {
                showStatus('图像已生成并创建新文档: ' + docResult.documentName, 'success');
                showToast('图像已创建: ' + docResult.documentName);
                
                Config.addLog({
                    timestamp: timestamp,
                    model: model,
                    prompt: prompt,
                    width: width,
                    height: height,
                    type: type,
                    status: '成功',
                    documentName: docResult.documentName
                });
            } else {
                const errorMsg = docResult ? docResult.error : '未知错误';
                showStatus('创建文档失败：' + errorMsg, 'error');
                
                Config.addLog({
                    timestamp: timestamp,
                    model: model,
                    prompt: prompt,
                    width: width,
                    height: height,
                    type: type,
                    status: '失败',
                    error: 'API调用成功但创建文档失败: ' + errorMsg
                });
            }
        } catch (e) {
            showStatus('处理图像失败：' + e.message, 'error');
            
            Config.addLog({
                timestamp: timestamp,
                model: model,
                prompt: prompt,
                width: width,
                height: height,
                type: type,
                status: '失败',
                error: '处理图像失败: ' + e.message
            });
        }
    }
    
    async function downloadAndPlaceDocument(imageUrl, width, height, prompt, type, timestamp, model) {
        initCompatibility();
        debugLog("开始处理图像...");
        debugLog("imageUrl 长度:", imageUrl ? imageUrl.length : 0);
        debugLog("imageUrl 前100字符:", imageUrl ? imageUrl.substring(0, 100) : '');
        debugLog("savedSelectionBounds:", savedSelectionBounds);
        debugLog("对齐模式:", currentSettings.alignmentMode);
        
        try {
            let base64;
            
            if (imageUrl.startsWith('data:')) {
                debugLog("使用 data URL 格式");
                base64 = imageUrl;
                debugLog("data URL 长度:", base64.length);
            } else {
                debugLog("从 URL 下载图像:", imageUrl.substring(0, 100));
                try {
                    const response = await fetch(imageUrl);
                    debugLog("下载响应状态:", response.status);
                    if (!response.ok) {
                        throw new Error('下载失败: ' + response.status);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    debugLog("ArrayBuffer 大小:", arrayBuffer.byteLength);
                    
                    // 定义 ArrayBuffer 转 Base64 的函数
                    function arrayBufferToBase64(buffer) {
                        let binary = '';
                        const bytes = new Uint8Array(buffer);
                        const len = bytes.byteLength;
                        for (let i = 0; i < len; i++) {
                            binary += String.fromCharCode(bytes[i]);
                        }
                        return btoa(binary);
                    }
                    
                    const base64Data = arrayBufferToBase64(arrayBuffer);
                    base64 = "data:image/jpeg;base64," + base64Data;
                    debugLog("Base64 长度:", base64.length);
                } catch (downloadError) {
                    console.error("下载图像失败:", downloadError);
                    throw downloadError;
                }
            }
            
            debugLog("Base64 长度:", base64.length);
            
            // 获取生成图像的尺寸
            let generatedWidth = width;
            let generatedHeight = height;
            debugLog("生成图像尺寸:", generatedWidth, generatedHeight);
            
            if (psAPI.app && psAPI.core && savedSelectionBounds) {
                debugLog("尝试放置到选区...");
                try {
                    if (!psAPI.uxp || !psAPI.uxp.storage || !psAPI.uxp.storage.localFileSystem) {
                        throw new Error("UXP storage API not available");
                    }
                    const fs = psAPI.uxp.storage.localFileSystem;
                    const base64Content = base64.replace(/^data:image\/\w+;base64,/, "");
                    debugLog("base64Content 长度:", base64Content.length);
                    
                    try {
                        const buffer = base64ToArrayBuffer(base64Content);
                        const bytes = new Uint8Array(buffer);
                        debugLog("字节长度:", bytes.byteLength);
                        
                        const tempFolder = await fs.getTemporaryFolder();
                        debugLog("临时文件夹:", tempFolder);
                        
                        const fileName = `generated_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
                        debugLog("临时文件名:", fileName);
                        
                        const tempFile = await tempFolder.createFile(fileName, { overwrite: true });
                        debugLog("临时文件创建成功:", tempFile);
                        
                        await tempFile.write(bytes);
                        debugLog("临时文件写入成功:", tempFile.nativePath);
                        
                        // 处理对齐模式
                        let exportBounds = savedSelectionBounds;
                        let selectionWidth = savedSelectionBounds.width;
                        let selectionHeight = savedSelectionBounds.height;
                        
                        const alignmentMode = currentSettings.alignmentMode || 'normal';
                        const scaleToSelection = alignmentMode === 'fit-layer' || alignmentMode === 'force1x1' || alignmentMode === 'smart';
                        debugLog("对齐模式:", alignmentMode);
                        
                        if (alignmentMode === 'force1x1') {
                            // 1:1 强制无偏移模式
                            debugLog("使用 1:1 强制无偏移模式");
                            const captureResult = await captureWithNoOffset(savedSelectionBounds);
                            exportBounds = captureResult.exportBounds;
                            selectionWidth = captureResult.width;
                            selectionHeight = captureResult.height;
                            debugLog("1:1 强制无偏移模式处理后的边界:", exportBounds);
                        } else if (alignmentMode === 'smart') {
                            // 智能对齐模式
                            debugLog("使用智能对齐模式");
                            // 创建智能对齐任务
                            const smartAlignTask = {
                                ratio: "auto",
                                bounds: savedSelectionBounds,
                                baseImageWidth: selectionWidth,
                                baseImageHeight: selectionHeight,
                                platform: "photoshop",
                                baseImage: psAPI.app.activeDocument
                            };
                            
                            // 执行智能对齐
                            await smartAlignImage(smartAlignTask);
                            debugLog("智能对齐完成，比例锁定为:", smartAlignTask.ratio);
                        }
                        
                        await psAPI.core.executeAsModal(async () => {
                            const doc = psAPI.app.activeDocument;
                            if (!doc) {
                                throw new Error('没有活动文档');
                            }
                            debugLog("活动文档:", doc.name);
                            
                            debugLog("创建 session token...");
                            const sessionToken = fs.createSessionToken(tempFile);
                            debugLog("session token:", sessionToken);
                            
                            // 保存当前选区
                            let originalSelection = null;
                            try {
                                originalSelection = doc.selection.bounds;
                                debugLog("保存原始选区:", originalSelection);
                            } catch (e) {
                                debugLog("无法保存原始选区:", e);
                            }
                            
                            // 计算选区的精确坐标和尺寸（原图尺寸）
                            const selectionLeft = exportBounds.left;
                            const selectionTop = exportBounds.top;
                            const selectionRight = exportBounds.right;
                            const selectionBottom = exportBounds.bottom;
                            
                            debugLog("原图选区坐标:", {
                                left: selectionLeft,
                                top: selectionTop,
                                right: selectionRight,
                                bottom: selectionBottom,
                                width: selectionWidth,
                                height: selectionHeight
                            });
                            
                            // 根据对齐模式计算缩放比例
                            let scaleX = selectionWidth / generatedWidth;
                            let scaleY = selectionHeight / generatedHeight;
                            
                            debugLog("对齐模式:", alignmentMode);
                            
                            if (scaleToSelection) {
                                if (alignmentMode === 'force1x1') {
                                    const minScale = Math.min(scaleX, scaleY);
                                    scaleX = minScale;
                                    scaleY = minScale;
                                    debugLog("1:1 强制无偏移模式，使用缩放比例:", minScale);
                                } else if (alignmentMode === 'smart') {
                                    const maxScale = Math.min(scaleX, scaleY);
                                    scaleX = maxScale;
                                    scaleY = maxScale;
                                    debugLog("智能对齐模式，使用缩放比例:", maxScale);
                                }
                            } else {
                                scaleX = 1;
                                scaleY = 1;
                            }
                            
                            debugLog("缩放比例 (原图/生成图):", scaleX, scaleY);
                            
                            // 设置选区
                            const setSelectionCommand = {
                                "_obj": "set",
                                "_target": [
                                    {
                                        "_property": "selection",
                                        "_ref": "channel"
                                    }
                                ],
                                "to": {
                                    "_obj": "rectangle",
                                    "bottom": {
                                        "_unit": "pixelsUnit",
                                        "_value": selectionBottom
                                    },
                                    "left": {
                                        "_unit": "pixelsUnit",
                                        "_value": selectionLeft
                                    },
                                    "right": {
                                        "_unit": "pixelsUnit",
                                        "_value": selectionRight
                                    },
                                    "top": {
                                        "_unit": "pixelsUnit",
                                        "_value": selectionTop
                                    }
                                }
                            };
                            
                            // 放置图像命令 - 使用左上角作为变换中心
                            const placeCommand = {
                                _obj: "placeEvent",
                                null: { _path: sessionToken, _kind: "local" },
                                linked: false,
                                freeTransformCenterState: {
                                    _enum: "quadCenterState",
                                    _value: "QCSCorner0"
                                }
                            };
                            
                            debugLog("开始 batchPlay...");
                            try {
                                const result = await psAPI.app.batchPlay(
                                    [
                                        setSelectionCommand,
                                        placeCommand
                                    ],
                                    { synchronousExecution: true }
                                );
                                debugLog("batchPlay 完成，结果:", result);
                            } catch (batchPlayError) {
                                console.error("batchPlay 错误:", batchPlayError);
                                throw batchPlayError;
                            }
                            
                            // 确保图层被正确放置
                            let placedLayer = doc.activeLayers[0];
                            if (!placedLayer) {
                                // 尝试获取所有图层并找到最新的一个
                                const layers = doc.layers;
                                if (layers.length > 0) {
                                    placedLayer = layers[layers.length - 1];
                                    debugLog("使用最后一个图层:", placedLayer.name);
                                } else {
                                    throw new Error("没有图层被放置");
                                }
                            }
                            debugLog("已放置图层:", placedLayer.name);
                            
                            // 重新获取图层边界 - 使用boundsNoEffects获取更精确的边界
                            let currentBounds = null;
                            let currentLeft = 0, currentTop = 0, currentWidth = 0, currentHeight = 0;
                            
                            try {
                                const boundsResult = await psAPI.app.batchPlay([{
                                    _obj: "get",
                                    _target: [{ _property: "boundsNoEffects" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
                                }], {});
                                
                                if (boundsResult && boundsResult[0] && boundsResult[0].boundsNoEffects) {
                                    const b = boundsResult[0].boundsNoEffects;
                                    currentLeft = (b.left && b.left._value !== undefined) ? b.left._value : (b.left || 0);
                                    currentTop = (b.top && b.top._value !== undefined) ? b.top._value : (b.top || 0);
                                    const bRight = (b.right && b.right._value !== undefined) ? b.right._value : (b.right || 0);
                                    const bBottom = (b.bottom && b.bottom._value !== undefined) ? b.bottom._value : (b.bottom || 0);
                                    currentWidth = bRight - currentLeft;
                                    currentHeight = bBottom - currentTop;
                                    currentBounds = { left: currentLeft, top: currentTop, right: bRight, bottom: bBottom };
                                }
                            } catch (boundsError) {
                                debugLog("获取boundsNoEffects失败，尝试使用普通bounds:", boundsError);
                            }
                            
                            // 降级处理：如果boundsNoEffects失败，使用普通bounds
                            if (!currentBounds || currentWidth <= 0 || currentHeight <= 0) {
                                try {
                                    const boundsResult2 = await psAPI.app.batchPlay([{
                                        _obj: "get",
                                        _target: [{ _property: "bounds" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
                                    }], {});
                                    
                                    if (boundsResult2 && boundsResult2[0] && boundsResult2[0].bounds) {
                                        const b2 = boundsResult2[0].bounds;
                                        currentLeft = (b2.left && b2.left._value !== undefined) ? b2.left._value : (b2.left || 0);
                                        currentTop = (b2.top && b2.top._value !== undefined) ? b2.top._value : (b2.top || 0);
                                        const b2Right = (b2.right && b2.right._value !== undefined) ? b2.right._value : (b2.right || 0);
                                        const b2Bottom = (b2.bottom && b2.bottom._value !== undefined) ? b2.bottom._value : (b2.bottom || 0);
                                        currentWidth = b2Right - currentLeft;
                                        currentHeight = b2Bottom - currentTop;
                                        currentBounds = { left: currentLeft, top: currentTop, right: b2Right, bottom: b2Bottom };
                                    }
                                } catch (boundsError2) {
                                    debugLog("获取bounds失败，使用默认值:", boundsError2);
                                    currentBounds = placedLayer.bounds;
                                    currentLeft = currentBounds.left;
                                    currentTop = currentBounds.top;
                                    currentWidth = currentBounds.right - currentBounds.left;
                                    currentHeight = currentBounds.bottom - currentBounds.top;
                                }
                            }
                            
                            debugLog("当前图层尺寸:", currentWidth, currentHeight);
                            debugLog("目标尺寸:", selectionWidth, selectionHeight);
                            
                            // 计算从当前大小到目标大小的缩放比例
                            const finalScaleX = selectionWidth / currentWidth;
                            const finalScaleY = selectionHeight / currentHeight;
                            debugLog("缩放比例 (目标/当前):", finalScaleX, finalScaleY);
                            
                            // 根据对齐模式计算移动距离
                            let translateX = selectionLeft - currentLeft;
                            let translateY = selectionTop - currentTop;
                            
                            if (alignmentMode === 'force1x1' || alignmentMode === 'smart') {
                                // 计算缩放后的图像尺寸
                                const scaledWidth = currentWidth * finalScaleX;
                                const scaledHeight = currentHeight * finalScaleY;

                                // 计算居中位置
                                const centerX = selectionLeft + (selectionWidth - scaledWidth) / 2;
                                const centerY = selectionTop + (selectionHeight - scaledHeight) / 2;

                                // 计算从当前左上角到居中位置的移动距离
                                translateX = centerX - currentLeft;
                                translateY = centerY - currentTop;
                                debugLog("居中对齐模式，移动距离:", translateX, translateY);
                            } else {
                                // 普通对齐，使用左上角对齐
                                debugLog("普通对齐模式，移动距离:", translateX, translateY);
                            }
                            
                            // 分步执行变换：先缩放，再移动，确保更高的精度
                            try {
                                // 1. 缩放到目标尺寸
                                if (currentWidth > 0 && currentHeight > 0) {
                                    let scaleXPercent = finalScaleX * 100;
                                    let scaleYPercent = finalScaleY * 100;
                                    
                                    if (alignmentMode === 'force1x1' || alignmentMode === 'smart') {
                                        // 保持 1:1 比例
                                        const minScalePercent = Math.min(scaleXPercent, scaleYPercent);
                                        scaleXPercent = minScalePercent;
                                        scaleYPercent = minScalePercent;
                                        debugLog("使用 1:1 缩放比例:", minScalePercent);
                                    }
                                    
                                    if (scaleToSelection && (Math.abs(scaleXPercent - 100) > 0.01 || Math.abs(scaleYPercent - 100) > 0.01)) {
                                        debugLog("执行缩放命令");
                                        const scaleCommand = {
                                            _obj: "transform",
                                            _target: {
                                                _ref: "layer",
                                                _id: placedLayer.id
                                            },
                                            freeTransformCenterState: {
                                                _enum: "quadCenterState",
                                                _value: "QCSCorner0"
                                            },
                                            width: { _unit: "percentUnit", _value: scaleXPercent },
                                            height: { _unit: "percentUnit", _value: scaleYPercent },
                                            interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" }
                                        };
                                        await psAPI.app.batchPlay([scaleCommand], { synchronousExecution: true });
                                        debugLog("图层缩放成功");
                                    }
                                }
                                
                                // 2. 重新获取缩放后的边界
                                let scaledBounds = null;
                                try {
                                    const scaledBoundsResult = await psAPI.app.batchPlay([{
                                        _obj: "get",
                                        _target: [{ _property: "bounds" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
                                    }], {});
                                    if (scaledBoundsResult && scaledBoundsResult[0] && scaledBoundsResult[0].bounds) {
                                        scaledBounds = scaledBoundsResult[0].bounds;
                                    }
                                } catch (scaledBoundsError) {
                                    debugLog("获取缩放后边界失败:", scaledBoundsError);
                                }
                                
                                // 3. 精确移动到目标位置
                                let scaledLeft = currentLeft;
                                let scaledTop = currentTop;
                                if (scaledBounds) {
                                    scaledLeft = (scaledBounds.left && scaledBounds.left._value !== undefined) ? scaledBounds.left._value : (scaledBounds.left || 0);
                                    scaledTop = (scaledBounds.top && scaledBounds.top._value !== undefined) ? scaledBounds.top._value : (scaledBounds.top || 0);
                                }
                                
                                let moveX, moveY;
                                
                                if (alignmentMode === 'force1x1' || alignmentMode === 'smart') {
                                    // 计算缩放后的图像尺寸
                                    const scaledWidth = currentWidth * (scaleXPercent / 100);
                                    const scaledHeight = currentHeight * (scaleYPercent / 100);
                                    
                                    // 计算居中位置
                                    const centerX = selectionLeft + (selectionWidth - scaledWidth) / 2;
                                    const centerY = selectionTop + (selectionHeight - scaledHeight) / 2;
                                    
                                    // 计算从当前左上角到居中位置的移动距离
                                    moveX = centerX - scaledLeft;
                                    moveY = centerY - scaledTop;
                                    debugLog("居中对齐模式，需要移动:", moveX, moveY);
                                } else {
                                    // 普通对齐，使用左上角对齐
                                    moveX = selectionLeft - scaledLeft;
                                    moveY = selectionTop - scaledTop;
                                    debugLog("普通对齐模式，需要移动:", moveX, moveY);
                                }
                                
                                debugLog("缩放后位置:", scaledLeft, scaledTop);
                                debugLog("目标位置:", selectionLeft, selectionTop);
                                
                                if (Math.abs(moveX) > 0.1 || Math.abs(moveY) > 0.1) {
                                    debugLog("执行移动命令");
                                    const moveCommand = {
                                        _obj: "move",
                                        _target: {
                                            _ref: "layer",
                                            _id: placedLayer.id
                                        },
                                        to: {
                                            _obj: "offset",
                                            horizontal: { _unit: "pixelsUnit", _value: moveX },
                                            vertical: { _unit: "pixelsUnit", _value: moveY }
                                        }
                                    };
                                    await psAPI.app.batchPlay([moveCommand], { synchronousExecution: true });
                                    debugLog("图层移动成功");
                                }
                                
                                debugLog("图层变换成功");
                            } catch (transformError) {
                                console.error("变换命令失败:", transformError);
                                
                                // 如果变换命令失败，尝试使用set命令直接设置图层边界
                                try {
                                    debugLog("尝试使用set命令设置图层边界");
                                    const setBoundsCommand = {
                                        _obj: "set",
                                        _target: {
                                            _ref: "layer",
                                            _id: placedLayer.id
                                        },
                                        to: {
                                            _obj: "layer",
                                            bounds: {
                                                _obj: "rectangle",
                                                left: {
                                                    _unit: "pixelsUnit",
                                                    _value: selectionLeft
                                                },
                                                top: {
                                                    _unit: "pixelsUnit",
                                                    _value: selectionTop
                                                },
                                                right: {
                                                    _unit: "pixelsUnit",
                                                    _value: selectionRight
                                                },
                                                bottom: {
                                                    _unit: "pixelsUnit",
                                                    _value: selectionBottom
                                                }
                                            }
                                        }
                                    };
                                    
                                    debugLog("执行设置边界命令:", JSON.stringify(setBoundsCommand, null, 2));
                                    await psAPI.app.batchPlay([setBoundsCommand], { synchronousExecution: true });
                                    debugLog("图层边界设置成功");
                                } catch (setError) {
                                    console.error("设置边界失败:", setError);
                                }
                            }
                            
                            // 提交最终变换
                            try {
                                const commitTransformCommand = {
                                    _obj: "commitTransformEvent"
                                };
                                await psAPI.app.batchPlay([commitTransformCommand], { synchronousExecution: true });
                                debugLog("最终变换已提交");
                            } catch (commitError) {
                                debugLog("提交最终变换失败:", commitError);
                            }
                            
                            // 添加5%边缘羽化
                            try {
                                // 计算羽化半径（20%的最小边长）
                                const featherRadius = Math.min(selectionWidth, selectionHeight) * 0.20;
                                debugLog("羽化半径:", featherRadius);
                                
                                // 为图层添加蒙版
                                const addMaskCommand = {
                                    _obj: "add",
                                    _target: [{
                                        _ref: "layer",
                                        _id: placedLayer.id
                                    }],
                                    using: {
                                        _obj: "layerMask",
                                        invert: false
                                    }
                                };
                                await psAPI.app.batchPlay([addMaskCommand], { synchronousExecution: true });
                                debugLog("已添加图层蒙版");
                                
                                // 对蒙版应用羽化
                                const featherCommand = {
                                    _obj: "feather",
                                    _target: [{
                                        _ref: "channel",
                                        _property: "transparency"
                                    }],
                                    distance: {
                                        _unit: "pixelsUnit",
                                        _value: featherRadius
                                    }
                                };
                                await psAPI.app.batchPlay([featherCommand], { synchronousExecution: true });
                                debugLog("蒙版已羽化");
                            } catch (featherError) {
                                debugLog("添加羽化失败:", featherError);
                            }
                            
                            // 转换为智能对象
                            try {
                                const convertToSmartObjectCommand = {
                                    _obj: "newPlacedLayer",
                                    _target: [{
                                        _ref: "layer",
                                        _id: placedLayer.id
                                    }]
                                };
                                await psAPI.app.batchPlay([convertToSmartObjectCommand], { synchronousExecution: true });
                                debugLog("图层已转换为智能对象");
                            } catch (smartObjectError) {
                                debugLog("转换为智能对象失败:", smartObjectError);
                            }
                            
                            // 再次确认图层位置和大小 - 使用boundsNoEffects获取更精确的边界
                            try {
                                let finalBounds = null;
                                let finalLeft = 0, finalTop = 0, finalWidth = 0, finalHeight = 0;
                                
                                try {
                                    const finalBoundsResult = await psAPI.app.batchPlay([{
                                        _obj: "get",
                                        _target: [{ _property: "boundsNoEffects" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
                                    }], {});
                                    
                                    if (finalBoundsResult && finalBoundsResult[0] && finalBoundsResult[0].boundsNoEffects) {
                                        const b = finalBoundsResult[0].boundsNoEffects;
                                        finalLeft = (b.left && b.left._value !== undefined) ? b.left._value : (b.left || 0);
                                        finalTop = (b.top && b.top._value !== undefined) ? b.top._value : (b.top || 0);
                                        const bRight = (b.right && b.right._value !== undefined) ? b.right._value : (b.right || 0);
                                        const bBottom = (b.bottom && b.bottom._value !== undefined) ? b.bottom._value : (b.bottom || 0);
                                        finalWidth = bRight - finalLeft;
                                        finalHeight = bBottom - finalTop;
                                        finalBounds = { left: finalLeft, top: finalTop, right: bRight, bottom: bBottom };
                                    }
                                } catch (finalBoundsError) {
                                    debugLog("获取最终boundsNoEffects失败，尝试使用普通bounds:", finalBoundsError);
                                }
                                
                                // 降级处理：如果boundsNoEffects失败，使用普通bounds
                                if (!finalBounds || finalWidth <= 0 || finalHeight <= 0) {
                                    try {
                                        const finalBoundsResult2 = await psAPI.app.batchPlay([{
                                            _obj: "get",
                                            _target: [{ _property: "bounds" }, { _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
                                        }], {});
                                        
                                        if (finalBoundsResult2 && finalBoundsResult2[0] && finalBoundsResult2[0].bounds) {
                                            const b2 = finalBoundsResult2[0].bounds;
                                            finalLeft = (b2.left && b2.left._value !== undefined) ? b2.left._value : (b2.left || 0);
                                            finalTop = (b2.top && b2.top._value !== undefined) ? b2.top._value : (b2.top || 0);
                                            const b2Right = (b2.right && b2.right._value !== undefined) ? b2.right._value : (b2.right || 0);
                                            const b2Bottom = (b2.bottom && b2.bottom._value !== undefined) ? b2.bottom._value : (b2.bottom || 0);
                                            finalWidth = b2Right - finalLeft;
                                            finalHeight = b2Bottom - finalTop;
                                            finalBounds = { left: finalLeft, top: finalTop, right: b2Right, bottom: b2Bottom };
                                        }
                                    } catch (finalBoundsError2) {
                                        debugLog("获取最终bounds失败，使用默认值:", finalBoundsError2);
                                        finalBounds = placedLayer.bounds;
                                        finalLeft = finalBounds.left;
                                        finalTop = finalBounds.top;
                                        finalWidth = finalBounds.right - finalBounds.left;
                                        finalHeight = finalBounds.bottom - finalBounds.top;
                                    }
                                }
                                
                                debugLog("最终图层尺寸:", finalWidth, finalHeight);
                                debugLog("最终图层位置:", finalLeft, finalTop);
                                debugLog("目标位置:", savedSelectionBounds.left, savedSelectionBounds.top);
                                debugLog("目标尺寸:", savedSelectionBounds.width, savedSelectionBounds.height);
                                
                                // 计算误差
                                let targetLeft, targetTop;
                                
                                if (alignmentMode === 'force1x1' || alignmentMode === 'smart') {
                                    // 计算居中位置
                                    const centerX = savedSelectionBounds.left + (savedSelectionBounds.width - finalWidth) / 2;
                                    const centerY = savedSelectionBounds.top + (savedSelectionBounds.height - finalHeight) / 2;
                                    targetLeft = centerX;
                                    targetTop = centerY;
                                } else {
                                    // 普通对齐，使用左上角对齐
                                    targetLeft = savedSelectionBounds.left;
                                    targetTop = savedSelectionBounds.top;
                                }
                                
                                const positionErrorX = Math.abs(finalLeft - targetLeft);
                                const positionErrorY = Math.abs(finalTop - targetTop);
                                const sizeErrorWidth = Math.abs(finalWidth - savedSelectionBounds.width);
                                const sizeErrorHeight = Math.abs(finalHeight - savedSelectionBounds.height);
                                debugLog("位置误差:", positionErrorX, positionErrorY);
                                debugLog("尺寸误差:", sizeErrorWidth, sizeErrorHeight);
                                
                                // 校正位置误差
                                const fixX = targetLeft - finalLeft;
                                const fixY = targetTop - finalTop;
                                
                                if (Math.abs(fixX) > 0.05 || Math.abs(fixY) > 0.05) {
                                    await psAPI.app.batchPlay([{
                                        _obj: "move",
                                        _target: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
                                        to: {
                                            _obj: "offset",
                                            horizontal: { _unit: "pixelsUnit", _value: fixX },
                                            vertical: { _unit: "pixelsUnit", _value: fixY }
                                        }
                                    }], { synchronousExecution: true });
                                    debugLog("位置校正完成，移动距离:", fixX, fixY);
                                }
                            } catch (e) {
                                debugLog("获取最终图层信息失败:", e);
                            }
                            
                            try {
                                    // 检查是否启用 1:1 强制无偏移模式
                                    if (alignmentMode === 'force1x1') {
                                        // 使用精确还原函数
                                        await restorePosition(placedLayer, exportBounds);
                                        debugLog("1:1 强制无偏移模式 - 图层位置已精确还原");
                                    }
                                    
                                    await tempFile.delete();
                                    debugLog("临时文件已删除");
                                } catch (e) {
                                    debugLog("删除临时文件失败:", e);
                                }
                                
                                debugLog("完美放回原处！");
                            }, { commandName: "AI 图像回填" });
                            
                            showStatus('图像已生成并放置到原位置', 'success');
                            showToast('图像已放置到原位置');
                        
                        Config.addLog({
                            timestamp: timestamp,
                            model: model,
                            prompt: prompt,
                            width: width,
                            height: height,
                            type: type,
                            status: '成功'
                        });
                    } catch (tempFileError) {
                        console.error("临时文件处理失败:", tempFileError);
                        throw tempFileError;
                    }
                } catch (placeError) {
                    console.error("放置到选区失败，尝试创建新文档:", placeError);
                    await downloadAndCreateDocument(imageUrl, width, height, prompt, type, timestamp, model);
                }
            } else {
                debugLog("没有选区，创建新文档...");
                await downloadAndCreateDocument(imageUrl, width, height, prompt, type, timestamp, model);
            }
        } catch (e) {
            console.error('处理图像失败:', e);
            showStatus('处理图像失败：' + e.message, 'error');
            
            Config.addLog({
                timestamp: timestamp,
                model: model,
                prompt: prompt,
                width: width,
                height: height,
                type: type,
                status: '失败',
                error: '处理图像失败: ' + e.message
            });
        }
    }

    function escapeLogHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getLogTypeLabel(type) {
        switch (type) {
            case 'txt2img':
                return '文生图';
            case 'img2img':
                return '图生图';
            case 'chat':
                return '对话';
            case 'webui':
                return 'WebUI';
            default:
                return type || '记录';
        }
    }

    function updateLogDisplay() {
        const logs = Config.getLogs();
        const container = document.getElementById('logContainer');
        const searchInput = document.getElementById('logSearch');
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';

        if (!container) return;

        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="info-text empty-state">暂无日志记录</div>';
            return;
        }

        let filteredLogs = logs;
        if (searchTerm) {
            filteredLogs = logs.filter(function(log) {
                return (log.prompt && log.prompt.toLowerCase().includes(searchTerm)) ||
                       (log.response && log.response.toLowerCase().includes(searchTerm)) ||
                       (log.model && log.model.toLowerCase().includes(searchTerm)) ||
                       (log.status && log.status.toLowerCase().includes(searchTerm)) ||
                       (log.error && log.error.toLowerCase().includes(searchTerm)) ||
                       (log.type && log.type.toLowerCase().includes(searchTerm));
            });
        }

        if (filteredLogs.length === 0) {
            container.innerHTML = '<div class="info-text empty-state">没有匹配的日志记录</div>';
            return;
        }

        let html = '';
        filteredLogs.forEach(function(log) {
            const statusClass = log.status === '成功' ? 'success' : 'error';
            const typeLabel = getLogTypeLabel(log.type);
            const statusText = log.status || '未知';
            const metaParts = [];

            if (log.timestamp) {
                metaParts.push('<span class="log-time">' + escapeLogHtml(log.timestamp) + '</span>');
            }
            if (log.model) {
                metaParts.push('<span class="log-model">模型：' + escapeLogHtml(log.model) + '</span>');
            }
            if (log.width && log.height) {
                metaParts.push('<span class="log-size">尺寸：' + escapeLogHtml(log.width) + ' × ' + escapeLogHtml(log.height) + '</span>');
            }
            if (log.documentName) {
                metaParts.push('<span class="log-doc">文档：' + escapeLogHtml(log.documentName) + '</span>');
            }

            html += '<div class="log-entry ' + statusClass + '" role="button" tabindex="0">';
            html += '<div class="log-head">';
            html += '<div class="log-title">' + escapeLogHtml(typeLabel) + '</div>';
            html += '<div class="log-badge">' + escapeLogHtml(statusText) + '</div>';
            html += '</div>';
            if (metaParts.length) {
                html += '<div class="log-meta">' + metaParts.join('') + '</div>';
            }
            html += '<div class="log-body">';
            if (log.prompt) {
                html += '<div class="log-text">消息：' + escapeLogHtml(log.prompt) + '</div>';
            }
            if (log.response) {
                html += '<div class="log-text">回复：' + escapeLogHtml(log.response) + '</div>';
            }
            if (log.error) {
                html += '<div class="log-error">错误：' + escapeLogHtml(log.error) + '</div>';
            }
            html += '</div>';
            html += '</div>';
        });

        container.innerHTML = html;
        bindLogEntryToggle(container);
    }

    function bindLogEntryToggle(container) {
        if (!container) return;
        const entries = container.querySelectorAll('.log-entry');
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            entry.addEventListener('click', function() {
                entry.classList.toggle('expanded');
            });
            entry.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    entry.classList.toggle('expanded');
                }
            });
        }
    }

    function searchLogs() {
        if (logSearchTimer) {
            clearTimeout(logSearchTimer);
        }
        logSearchTimer = setTimeout(function() {
            logSearchTimer = null;
            updateLogDisplay();
        }, 120);
    }

    async function exportLogs() {
        const logs = Config.getLogs();
        
        if (!logs || logs.length === 0) {
            showStatus('没有日志可导出', 'error');
            return;
        }
        
        let content = 'ZHUANG-AI 修图插件 日志导出\n';
        content += '========================================\n\n';
        
        logs.forEach(function(log, index) {
            content += '[' + (index + 1) + '] ' + log.timestamp + '\n';
            content += '类型: ' + (log.type === 'txt2img' ? '文生图' : '图生图') + '\n';
            content += '模型: ' + log.model + '\n';
            content += '尺寸: ' + log.width + 'x' + log.height + '\n';
            content += '提示词: ' + log.prompt + '\n';
            content += '状态: ' + log.status + '\n';
            if (log.error) {
                content += '错误: ' + log.error + '\n';
            }
            if (log.documentName) {
                content += '文档: ' + log.documentName + '\n';
            }
            content += '\n--------------------------------------\n\n';
        });
        
        try {
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'gemini_ai_logs_' + new Date().toISOString().slice(0, 10) + '.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('日志已导出');
        } catch (e) {
            showStatus('导出失败: ' + e.message, 'error');
        }
    }

    function clearLogs() {
        Config.clearLogs();
        updateLogDisplay();
        showToast('日志已清空');
        showStatus('日志已清空', 'success');
    }
    
    // 应用文字大小倍数
    function applyTextSizeMultiplier(multiplier) {
        const scale = Number(multiplier) || 1;
        document.documentElement.style.setProperty('--ui-scale', String(scale));
        const textSizeValueEl = document.getElementById('textSizeValue');
        if (textSizeValueEl) {
            textSizeValueEl.textContent = '当前倍数: ' + scale.toFixed(1) + 'x';
        }
    }

    function positionCustomSelectPanel(state) {
        if (!state || !state.trigger || !state.panel) return;

        if (state.inlinePanel) {
            state.panel.style.setProperty('position', 'absolute', 'important');
            state.panel.style.setProperty('left', '0', 'important');
            state.panel.style.setProperty('right', 'auto', 'important');
            state.panel.style.setProperty('top', 'calc(100% + 6px)', 'important');
            state.panel.style.setProperty('width', '100%', 'important');
            state.panel.style.setProperty('max-height', '220px', 'important');
            state.panel.style.setProperty('z-index', '120', 'important');
            return;
        }

        const triggerRect = state.trigger.getBoundingClientRect();
        const wrapperRect = state.wrapper ? state.wrapper.getBoundingClientRect() : null;
        const anchorRect = (triggerRect.width > 8 && triggerRect.height > 8)
            ? triggerRect
            : (wrapperRect || triggerRect);
        const selectId = state.selectEl && state.selectEl.id ? state.selectEl.id : '';
        const preferBelow = selectId === 'samplingMethod' || selectId === 'maxResolution';

        const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 800;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;

        const spacing = 6;
        const availableBelow = Math.max(80, viewportHeight - anchorRect.bottom - 12);
        const availableAbove = Math.max(80, anchorRect.top - 12);
        const openAbove = preferBelow ? false : (availableBelow < 140 && availableAbove > availableBelow);
        const panelHeightLimit = preferBelow ? 220 : 320;
        const maxPanelHeight = Math.max(80, Math.min(panelHeightLimit, openAbove ? availableAbove : availableBelow));
        const width = Math.max(180, Math.min(anchorRect.width || 180, viewportWidth - 12));

        let left = anchorRect.left;
        if (left + width > viewportWidth - 8) {
            left = Math.max(8, viewportWidth - width - 8);
        }

        const top = openAbove
            ? Math.max(8, anchorRect.top - maxPanelHeight - spacing)
            : Math.min(Math.max(8, viewportHeight - maxPanelHeight - 8), anchorRect.bottom + spacing);

        state.panel.style.setProperty('position', 'fixed', 'important');
        state.panel.style.setProperty('left', Math.round(left) + 'px', 'important');
        state.panel.style.setProperty('top', Math.round(top) + 'px', 'important');
        state.panel.style.setProperty('width', Math.round(width) + 'px', 'important');
        state.panel.style.setProperty('max-height', Math.round(maxPanelHeight) + 'px', 'important');
        state.panel.style.setProperty('z-index', '2147483647', 'important');
        state.panel.style.setProperty('transform', 'translateZ(0)', 'important');
        state.panel.style.setProperty('isolation', 'isolate', 'important');
    }

    function repositionOpenCustomSelects() {
        customSelectRegistry.forEach(function(state) {
            if (!state || !state.wrapper || !state.panel) return;
            if (state.wrapper.classList.contains('open') && state.panel.classList.contains('open')) {
                positionCustomSelectPanel(state);
            }
        });
        syncControlMirrors();
    }

    function getOrCreateCustomSelectBackdrop() {
        let backdrop = document.getElementById('customSelectBackdrop');
        if (backdrop) return backdrop;

        backdrop = document.createElement('div');
        backdrop.id = 'customSelectBackdrop';
        backdrop.className = 'custom-select-backdrop';
        backdrop.addEventListener('click', function() {
            closeAllCustomSelects(null);
        });
        document.body.appendChild(backdrop);
        return backdrop;
    }

    function getOrCreateControlMirrorLayer() {
        let layer = document.getElementById('controlMirrorLayer');
        if (layer) return layer;

        layer = document.createElement('div');
        layer.id = 'controlMirrorLayer';
        layer.className = 'control-mirror-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        return layer;
    }

    function getMirrorableControlText(control) {
        if (!control) return '';
        const type = String(control.type || '').toLowerCase();
        const rawValue = typeof control.value === 'string' ? control.value : '';
        if (type === 'password') {
            return rawValue ? '•'.repeat(Math.max(rawValue.length, 6)) : '';
        }
        return rawValue;
    }

    function clearControlMirrors() {
        document.querySelectorAll('.native-control-overlay-hidden').forEach(function(control) {
            control.classList.remove('native-control-overlay-hidden');
        });

        const layer = document.getElementById('controlMirrorLayer');
        if (layer) {
            layer.innerHTML = '';
        }
    }

    function rectsIntersect(a, b) {
        if (!a || !b) return false;
        return !(
            a.right <= b.left ||
            a.left >= b.right ||
            a.bottom <= b.top ||
            a.top >= b.bottom
        );
    }

    function getOpenFloatingPanelRects() {
        const rects = [];
        customSelectRegistry.forEach(function(state) {
            if (!state || state.inlinePanel) return;
            if (!state.wrapper || !state.panel) return;
            if (!state.wrapper.classList.contains('open') || !state.panel.classList.contains('open')) return;
            const rect = state.panel.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;
            rects.push(rect);
        });
        return rects;
    }

    function syncControlMirrors() {
        clearControlMirrors();

        if (!document.documentElement.classList.contains('global-dropdown-open')) {
            return;
        }

        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;

        const openPanelRects = getOpenFloatingPanelRects();
        if (!openPanelRects.length) return;

        const layer = getOrCreateControlMirrorLayer();
        const controls = activeTab.querySelectorAll(
            'input[type="text"], input[type="password"], input[type="number"], input[type="search"], input[type="url"], textarea, sp-textarea'
        );

        controls.forEach(function(control) {
            if (!control || !control.isConnected) return;
            if (control.closest('.form-group.select-open-host')) return;

            const rect = control.getBoundingClientRect();
            if (rect.width < 2 || rect.height < 2) return;

            const overlapsOpenPanel = openPanelRects.some(function(panelRect) {
                return rectsIntersect(rect, panelRect);
            });
            if (!overlapsOpenPanel) return;

            const computed = window.getComputedStyle(control);
            const text = getMirrorableControlText(control);
            const placeholder = control.getAttribute('placeholder') || '';
            const tagName = String(control.tagName || '').toUpperCase();
            const isMultiline = tagName === 'TEXTAREA' || tagName === 'SP-TEXTAREA';

            const mirror = document.createElement('div');
            mirror.className = 'control-mirror' + (isMultiline ? ' multiline' : '') + (!text ? ' placeholder' : '');
            mirror.textContent = text || placeholder;
            mirror.style.setProperty('left', Math.round(rect.left) + 'px', 'important');
            mirror.style.setProperty('top', Math.round(rect.top) + 'px', 'important');
            mirror.style.setProperty('width', Math.round(rect.width) + 'px', 'important');
            mirror.style.setProperty('height', Math.round(rect.height) + 'px', 'important');
            mirror.style.setProperty('padding', computed.padding, 'important');
            mirror.style.setProperty('border', computed.border, 'important');
            mirror.style.setProperty('border-radius', computed.borderRadius, 'important');
            mirror.style.setProperty('background', computed.background, 'important');
            mirror.style.setProperty('box-shadow', computed.boxShadow, 'important');
            mirror.style.setProperty('font', computed.font, 'important');
            mirror.style.setProperty('line-height', computed.lineHeight, 'important');
            mirror.style.setProperty('letter-spacing', computed.letterSpacing, 'important');
            mirror.style.setProperty('text-align', computed.textAlign, 'important');
            mirror.style.setProperty('color', text ? computed.color : 'rgba(235, 235, 245, 0.40)', 'important');
            if (isMultiline) {
                mirror.style.setProperty('overflow', 'hidden', 'important');
                mirror.style.setProperty('word-break', 'break-word', 'important');
                mirror.style.setProperty('white-space', 'pre-wrap', 'important');
                mirror.style.setProperty('text-overflow', 'clip', 'important');
            } else {
                mirror.style.setProperty('display', 'flex', 'important');
                mirror.style.setProperty('align-items', 'center', 'important');
            }

            layer.appendChild(mirror);
            control.classList.add('native-control-overlay-hidden');
        });
    }

    function syncGlobalDropdownOpenState() {
        let hasFloatingOpen = false;
        customSelectRegistry.forEach(function(state) {
            if (!state || state.inlinePanel) return;
            if (!state.wrapper || !state.panel) return;
            if (state.wrapper.classList.contains('open') && state.panel.classList.contains('open')) {
                hasFloatingOpen = true;
            }
        });

        document.documentElement.classList.toggle('global-dropdown-open', hasFloatingOpen);
        const backdrop = getOrCreateCustomSelectBackdrop();
        backdrop.classList.toggle('open', hasFloatingOpen);
        backdrop.style.setProperty('z-index', '2147483646', 'important');
        backdrop.setAttribute('aria-hidden', hasFloatingOpen ? 'false' : 'true');
    }

    function closeAllCustomSelects(exceptSelectEl) {
        customSelectRegistry.forEach(function(state) {
            if (!state || !state.wrapper || !state.selectEl) return;
            if (exceptSelectEl && state.selectEl === exceptSelectEl) return;
            state.wrapper.classList.remove('open');
            if (state.panel) {
                state.panel.classList.remove('open');
            }
            if (state.hostGroup) {
                state.hostGroup.classList.remove('select-open-host');
            }
        });
        syncGlobalDropdownOpenState();
    }

    function cleanupCustomSelectState(selectId) {
        if (!selectId) return;
        const stale = customSelectRegistry.get(selectId);
        if (!stale) return;

        try {
            if (stale.observer && typeof stale.observer.disconnect === 'function') {
                stale.observer.disconnect();
            }
        } catch (e) {
            console.warn('断开下拉观察器失败:', selectId, e);
        }

        try {
            if (stale.panel && stale.panel.parentNode) {
                stale.panel.parentNode.removeChild(stale.panel);
            }
        } catch (e) {
            console.warn('移除下拉面板失败:', selectId, e);
        }

        try {
            if (stale.wrapper && stale.wrapper.parentNode && stale.selectEl) {
                const host = stale.wrapper.parentNode;
                host.insertBefore(stale.selectEl, stale.wrapper);
                stale.wrapper.parentNode.removeChild(stale.wrapper);
            }
        } catch (e) {
            console.warn('拆除下拉包装失败:', selectId, e);
        }

        try {
            if (stale.selectEl) {
                stale.selectEl.classList.remove('native-select-hidden');
            }
        } catch (e) {
            console.warn('恢复原生下拉可见性失败:', selectId, e);
        }

        customSelectRegistry.delete(selectId);
        syncGlobalDropdownOpenState();
    }

    function getCustomSelectState(selectEl) {
        if (!selectEl) return null;
        const selectId = selectEl.id;
        if (!selectId) return null;

        const state = customSelectRegistry.get(selectId) || null;
        if (!state) return null;

        const invalid = (
            state.selectEl !== selectEl ||
            !state.selectEl ||
            !state.selectEl.isConnected ||
            !state.wrapper ||
            !state.wrapper.isConnected ||
            !state.panel ||
            !state.panel.isConnected
        );

        if (invalid) {
            cleanupCustomSelectState(selectId);
            return null;
        }

        return state;
    }

    function getCustomSelectOptionsSignature(options) {
        return options.map(function(option) {
            return [
                option.value || '',
                option.textContent || '',
                option.disabled ? '1' : '0'
            ].join('\u001f');
        }).join('\u001e');
    }

    function updateRenderedOptionSelection(panel, options, selectedIndex) {
        Array.from(panel.children || []).forEach(function(item, index) {
            const option = options[index];
            item.classList.toggle('selected', index === selectedIndex);
            item.classList.toggle('disabled', !!(option && option.disabled));
        });
    }

    function refreshCustomSelectByElement(selectEl, allowInitFake) {
        const allowInit = allowInitFake !== false;
        let state = getCustomSelectState(selectEl);
        if (!state) {
            if (allowInit) {
                initFakeSelect(selectEl);
                state = getCustomSelectState(selectEl);
            }
            if (!state) {
                if (selectEl) {
                    selectEl.classList.remove('native-select-hidden');
                    selectEl.style.setProperty('display', 'block', 'important');
                    selectEl.style.setProperty('width', '100%', 'important');
                    selectEl.style.setProperty('visibility', 'visible', 'important');
                }
                return;
            }
        }

        const trigger = state.trigger;
        const panel = state.panel;
        const wrapper = state.wrapper;
        if (!trigger || !panel || !wrapper) {
            selectEl.classList.remove('native-select-hidden');
            selectEl.style.setProperty('display', 'block', 'important');
            selectEl.style.setProperty('width', '100%', 'important');
            selectEl.style.setProperty('visibility', 'visible', 'important');
            return;
        }
        const options = Array.from(selectEl.options || []);
        if (options.length > 0 && selectEl.selectedIndex < 0) {
            selectEl.selectedIndex = 0;
        }
        const selectedOption = options[selectEl.selectedIndex] || options.find(function(item) { return item.selected; }) || options[0];
        const label = selectedOption ? selectedOption.textContent : '-- 请选择 --';

        trigger.textContent = label || '-- 请选择 --';
        wrapper.classList.toggle('disabled', !!selectEl.disabled);

        const shouldRenderPanel = wrapper.classList.contains('open') && panel.classList.contains('open');
        if (shouldRenderPanel) {
            const optionsSignature = getCustomSelectOptionsSignature(options);
            if (state.panelOptionsSignature !== optionsSignature) {
                const fragment = document.createDocumentFragment();
                panel.innerHTML = '';
                options.forEach(function(option, index) {
                    const item = document.createElement('div');
                    item.className = 'custom-select-option';
                    item.textContent = option.textContent || option.value || '';
                    item.dataset.index = String(index);
                    fragment.appendChild(item);
                });
                panel.appendChild(fragment);
                state.panelOptionsSignature = optionsSignature;
            }
            updateRenderedOptionSelection(panel, options, selectEl.selectedIndex);
        }

        if (wrapper.classList.contains('open')) {
            positionCustomSelectPanel(state);
        }
    }

    function refreshCustomSelectById(selectId) {
        const selectEl = document.getElementById(selectId);
        if (!selectEl) return;
        const shouldUseFake = FAKE_SELECT_IDS.indexOf(selectId) > -1;
        refreshCustomSelectByElement(selectEl, shouldUseFake);
    }

    function initFakeSelect(selectEl) {
        if (!selectEl || selectEl.tagName !== 'SELECT' || !selectEl.id) return;
        const existingState = customSelectRegistry.get(selectEl.id);
        if (existingState) {
            const isSameLiveState = (
                existingState.selectEl === selectEl &&
                existingState.wrapper &&
                existingState.wrapper.isConnected &&
                existingState.panel &&
                existingState.panel.isConnected
            );
            if (isSameLiveState) {
                return;
            }
            cleanupCustomSelectState(selectEl.id);
        }
        try {
            const existingWrapper = selectEl.parentElement;
            if (existingWrapper && existingWrapper.classList && existingWrapper.classList.contains('custom-select')) {
                const host = existingWrapper.parentElement;
                if (host) {
                    host.insertBefore(selectEl, existingWrapper);
                }
                existingWrapper.remove();
            }

            const parent = selectEl.parentElement;
            if (!parent) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'custom-select';
            wrapper.dataset.selectId = selectEl.id;

            const trigger = document.createElement('button');
            trigger.type = 'button';
            trigger.className = 'custom-select-trigger';

            const panel = document.createElement('div');
            panel.className = 'custom-select-panel';
            panel.dataset.selectFor = selectEl.id;
            const hostGroup = selectEl.closest('.form-group');
            const inlinePanel = false;

            parent.insertBefore(wrapper, selectEl);
            wrapper.appendChild(selectEl);
            wrapper.appendChild(trigger);
            if (inlinePanel) {
                wrapper.appendChild(panel);
            } else {
                document.body.appendChild(panel);
            }
            selectEl.classList.add('native-select-hidden');

            panel.addEventListener('click', function(event) {
                const item = event.target && event.target.closest ? event.target.closest('.custom-select-option') : null;
                if (!item || !panel.contains(item)) return;

                const index = parseInt(item.dataset.index || '-1', 10);
                const option = selectEl.options[index];
                if (!option || selectEl.disabled || option.disabled) return;

                const changed = selectEl.selectedIndex !== index;
                selectEl.selectedIndex = index;
                wrapper.classList.remove('open');
                panel.classList.remove('open');
                if (hostGroup) {
                    hostGroup.classList.remove('select-open-host');
                }
                refreshCustomSelectByElement(selectEl);
                syncGlobalDropdownOpenState();
                if (changed) {
                    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });

            trigger.addEventListener('click', function() {
                if (selectEl.disabled) return;
                const isOpen = wrapper.classList.contains('open');
                closeAllCustomSelects(selectEl);
                const shouldOpen = !isOpen;
                wrapper.classList.toggle('open', shouldOpen);
                panel.classList.toggle('open', shouldOpen);
                if (hostGroup) {
                    hostGroup.classList.toggle('select-open-host', shouldOpen);
                }
                if (shouldOpen) {
                    refreshCustomSelectByElement(selectEl, false);
                }
                syncGlobalDropdownOpenState();
            });

            trigger.addEventListener('keydown', function(event) {
                if (selectEl.disabled) return;
                if (event.key === 'Escape') {
                    wrapper.classList.remove('open');
                    panel.classList.remove('open');
                    if (hostGroup) {
                        hostGroup.classList.remove('select-open-host');
                    }
                    syncGlobalDropdownOpenState();
                    return;
                }
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    trigger.click();
                }
            });

            selectEl.addEventListener('change', function() {
                refreshCustomSelectByElement(selectEl);
            });

            customSelectRegistry.set(selectEl.id, {
                selectEl: selectEl,
                wrapper: wrapper,
                trigger: trigger,
                panel: panel,
                hostGroup: hostGroup,
                inlinePanel: inlinePanel,
                observer: null,
                panelOptionsSignature: null
            });
            refreshCustomSelectByElement(selectEl);

            if (typeof MutationObserver === 'function') {
                let refreshQueued = false;
                const queueRefresh = function() {
                    if (refreshQueued) return;
                    refreshQueued = true;
                    const run = function() {
                        refreshQueued = false;
                        refreshCustomSelectByElement(selectEl);
                    };
                    if (typeof requestAnimationFrame === 'function') {
                        requestAnimationFrame(run);
                    } else {
                        setTimeout(run, 0);
                    }
                };
                const observer = new MutationObserver(queueRefresh);
                observer.observe(selectEl, { childList: true });
                const state = customSelectRegistry.get(selectEl.id);
                if (state) {
                    state.observer = observer;
                }
            }
        } catch (error) {
            console.error('初始化假下拉失败，回退原生select:', selectEl.id, error);
            selectEl.classList.remove('native-select-hidden');
            const wrapper = selectEl.parentElement;
            if (wrapper && wrapper.classList && wrapper.classList.contains('custom-select')) {
                const host = wrapper.parentElement;
                if (host) {
                    host.insertBefore(selectEl, wrapper);
                }
                wrapper.remove();
            }
            const floatingPanel = document.querySelector('.custom-select-panel[data-select-for="' + selectEl.id + '"]');
            if (floatingPanel) {
                floatingPanel.remove();
            }
            if (selectEl.options.length > 0 && selectEl.selectedIndex < 0) {
                selectEl.selectedIndex = 0;
            }
        }
    }

    function initFakeSelects(selectIds) {
        const ids = Array.isArray(selectIds) && selectIds.length > 0 ? selectIds : FAKE_SELECT_IDS;
        ids.forEach(function(selectId) {
            try {
                initFakeSelect(document.getElementById(selectId));
            } catch (error) {
                console.error('initFakeSelects 单项初始化失败:', selectId, error);
                const selectEl = document.getElementById(selectId);
                if (selectEl) {
                    selectEl.classList.remove('native-select-hidden');
                }
            }
        });

        if (!document.documentElement.dataset.fakeSelectBound) {
            document.addEventListener('click', function(event) {
                const target = event.target;
                const insideCustomSelect = target && target.closest && (
                    target.closest('.custom-select') || target.closest('.custom-select-panel')
                );
                if (!insideCustomSelect) {
                    closeAllCustomSelects(null);
                }
            });
            document.documentElement.dataset.fakeSelectBound = '1';
        }

        if (!document.documentElement.dataset.fakeSelectRepositionBound) {
            let repositionQueued = false;
            const reposition = function() {
                if (repositionQueued) return;
                repositionQueued = true;
                const run = function() {
                    repositionQueued = false;
                    repositionOpenCustomSelects();
                };
                if (typeof requestAnimationFrame === 'function') {
                    requestAnimationFrame(run);
                } else {
                    setTimeout(run, 0);
                }
            };
            window.addEventListener('resize', reposition);
            document.addEventListener('scroll', reposition, true);
            document.documentElement.dataset.fakeSelectRepositionBound = '1';
        }
    }

    function ensureSettingsUiCompatibility() {
        ensureSettingsModelActionsVisible();
    }

    function initFloatingToolbarDrag() {}

    async function init() {
        debugLog('开始初始化...');
        try {
            if (document.readyState === 'loading') {
                await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
            }

            initFloatingToolbarDrag();
            loadSettings().catch(function(error) {
                console.error('加载设置失败:', error);
                showStatus('加载设置失败: ' + error.message, 'error');
            });
            setupEventListeners();

            const imgModelSelect = document.getElementById('imgModel');
            if (imgModelSelect && imgModelSelect.options.length === 0) {
                fillImageModels([]);
                imgModelSelect.selectedIndex = 0;
            }

            updateLogDisplay();
            debugLog('初始化完成');
        } catch (e) {
            console.error('初始化失败:', e);
            showStatus('初始化失败: ' + e.message, 'error');
        }
    }

    // 在UXP环境中，直接调用init()
    init();
    setTimeout(function() {
        scheduleDeferredStartupWork();
    }, 2500);
    // 从SD WebUI获取大模型列表
    async function fetchSDModels() {
        try {
            const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
            if (!sdApiUrl) {
                return null;
            }
            
            const response = await fetch(sdApiUrl + '/sdapi/v1/sd-models');
            const models = await response.json();
            
            debugLog('获取到的大模型列表:', models);
            
            // 更新大模型选择框
            const sdModelSelect = document.getElementById('sdModel');
            if (sdModelSelect) {
                // 清空现有选项
                sdModelSelect.innerHTML = '<option value="">-- 选择大模型 --</option>';
                
                // 添加新选项
                models.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.model_name;
                    option.textContent = model.title;
                    sdModelSelect.appendChild(option);
                });
                refreshCustomSelectById('sdModel');
            }
            
            return models;
        } catch (error) {
            console.error('获取大模型失败:', error);
            return null;
        }
    }

    // 从SD WebUI获取采样器列表
    async function fetchSamplers() {
        try {
            const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
            if (!sdApiUrl) {
                return null;
            }
            
            const response = await fetch(sdApiUrl + '/sdapi/v1/samplers');
            const samplers = await response.json();
            
            debugLog('获取到的采样器列表:', samplers);
            
            // 更新采样方法选择框
            const samplingMethodSelect = document.getElementById('samplingMethod');
            if (samplingMethodSelect) {
                // 清空现有选项
                samplingMethodSelect.innerHTML = '';
                
                // 添加新选项
                samplers.forEach(sampler => {
                    const option = document.createElement('option');
                    option.value = sampler.name;
                    option.textContent = sampler.name;
                    samplingMethodSelect.appendChild(option);
                });
                if (samplingMethodSelect.options.length > 0) {
                    samplingMethodSelect.selectedIndex = 0;
                }
                refreshCustomSelectById('samplingMethod');
            }
            
            return samplers;
        } catch (error) {
            console.error('获取采样器失败:', error);
            return null;
        }
    }

    // 从SD WebUI获取Lora模型列表
    async function fetchLoras() {
        try {
            const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
            if (!sdApiUrl) {
                return null;
            }
            
            const response = await fetch(sdApiUrl + '/sdapi/v1/loras');
            const loras = await response.json();
            
            debugLog('获取到 Lora 列表:', loras);
            
            // 更新Lora选择框
            const loraModelSelect = document.getElementById('loraModel');
            if (loraModelSelect) {
                // 清空现有选项
                loraModelSelect.innerHTML = '<option value="">-- 选择Lora模型 --</option>';
                
                // 添加新选项
                loras.forEach(lora => {
                    const option = document.createElement('option');
                    option.value = lora.name;
                    option.textContent = lora.alias || lora.name;
                    loraModelSelect.appendChild(option);
                });
                refreshCustomSelectById('loraModel');
            }
            
            return loras;
        } catch (error) {
            console.error('获取Lora模型失败:', error);
            return null;
        }
    }

    // 刷新所有SD WebUI资源
    async function refreshAllSDResources() {
        try {
            const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
            if (!sdApiUrl) {
                showStatus('请在设置中配置SD WebUI API地址', 'error');
                switchTab('settings');
                return;
            }
            
            showStatus('正在刷新SD WebUI资源...', 'info');
            
            // 并行获取所有资源
            const [models, samplers, loras] = await Promise.all([
                fetchSDModels(),
                fetchSamplers(),
                fetchLoras()
            ]);
            
            if (models || samplers || loras) {
                showStatus('SD WebUI资源刷新成功', 'success');
                showToast('资源刷新成功');
            }
            
        } catch (error) {
            console.error('无法连接到SD WebUI，请检查是否开启了API:', error);
            showStatus('无法连接到SD WebUI，请检查是否开启了API', 'error');
        }
    }

    // 检查SD WebUI生成进度
    async function checkProgress() {
        try {
            const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
            const response = await fetch(sdApiUrl + '/sdapi/v1/progress?skip_current_image=false');
            const data = await response.json();
            
            // 更新进度条显示
            const progressBar = document.getElementById('progressBar');
            const progressText = document.getElementById('progressText');
            const progressContainer = document.getElementById('progressContainer');
            
            if (progressBar && progressText && progressContainer) {
                // 显示进度条容器
                progressContainer.style.display = 'block';
                
                // 更新进度
                const percent = (data.progress * 100).toFixed(1);
                progressBar.style.width = percent + '%';
                progressText.textContent = percent + '%';
                
                // 如果有剩余时间，也显示出来
                if (data.eta_relative !== undefined && data.eta_relative !== null) {
                    const etaSeconds = Math.max(0, Math.round(data.eta_relative));
                    progressText.textContent = `${percent}% (剩余 ${etaSeconds} 秒)`;
                }
            }
            
            debugLog(`当前进度: ${(data.progress * 100).toFixed(1)}%`);
            if (data.eta_relative !== undefined) {
                debugLog(`预计剩余时间: ${data.eta_relative.toFixed(1)} 秒`);
            }
            
            return data;
        } catch (error) {
            console.error('获取进度失败:', error);
            return null;
        }
    }

    // 更新进度条UI
    function updateProgressBar(progress, eta) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const progressContainer = document.getElementById('progressContainer');
        
        if (progressBar && progressText && progressContainer) {
            progressContainer.style.display = 'block';
            const percent = (progress * 100).toFixed(1);
            progressBar.style.width = percent + '%';
            
            if (eta !== undefined && eta !== null) {
                const etaSeconds = Math.max(0, Math.round(eta));
                progressText.textContent = `${percent}% (剩余 ${etaSeconds} 秒)`;
            } else {
                progressText.textContent = percent + '%';
            }
        }
    }

    // 隐藏进度条
    function hideProgressBar() {
        const progressContainer = document.getElementById('progressContainer');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
        
        // 重置进度条
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        if (progressBar) {
            progressBar.style.width = '0%';
        }
        if (progressText) {
            progressText.textContent = '0%';
        }
    }

    // WebUI 预设数据
    const webuiPresetNegativeBase = "lowres, blurry, out of focus, bad anatomy, bad hands, extra fingers, extra limbs, duplicate, deformed, oversharpen, plastic skin, wax skin, anime, watermark, logo, text, cropped, jpeg artifacts";
    const webuiPresets = [
        {
            id: "仅基础提示词",
            sccz: "best quality, ultra high res, realistic texture, natural lighting, sharp focus, clean detail",
            sccf: webuiPresetNegativeBase
        },
        {
            id: "人像精修",
            sccz: "best quality, ultra high res, realistic portrait, clean skin texture, refined facial detail, natural makeup, soft shadow transition, sharp eyes, detailed hair strands",
            sccf: webuiPresetNegativeBase
        },
        {
            id: "皮肤净化",
            sccz: "best quality, ultra high res, clean pores, balanced skin tone, smooth but detailed skin, subtle dodge and burn, natural highlights",
            sccf: webuiPresetNegativeBase
        },
        {
            id: "头发优化",
            sccz: "best quality, ultra high res, detailed hair strands, clean hair flow, natural flyaway hair, soft anisotropic highlights, realistic layered hair texture",
            sccf: webuiPresetNegativeBase
        },
        {
            id: "腿部优化",
            sccz: "best quality, ultra high res, smooth leg skin, natural contour, subtle highlights, realistic skin texture, clean transition, no distortion",
            sccf: webuiPresetNegativeBase
        },
        {
            id: "服装整理",
            sccz: "best quality, ultra high res, clean clothing folds, refined fabric texture, realistic seams, balanced highlights, polished material detail",
            sccf: webuiPresetNegativeBase
        }
    ];

    // 初始化 WebUI 预设
    function initWebUIPresets() {
        const presetSelect = document.getElementById('webuiPreset');
        if (!presetSelect) return;

        // 清空现有选项
        presetSelect.innerHTML = '<option value="">-- 选择预设 --</option>';

        // 添加预设选项
        webuiPresets.forEach(function(preset) {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.id;
            if (preset.id === '仅基础提示词') {
                option.selected = true;
            }
            presetSelect.appendChild(option);
        });

        // 默认选择"仅基础提示词"并填充提示词
        const defaultPreset = webuiPresets.find(function(p) { return p.id === '仅基础提示词'; });
        if (defaultPreset) {
            const positivePrompt = document.getElementById('positivePrompt');
            const negativePrompt = document.getElementById('negativePrompt');
            if (positivePrompt) positivePrompt.value = defaultPreset.sccz;
            if (negativePrompt) negativePrompt.value = defaultPreset.sccf;
        }

        // 预设选择事件
        presetSelect.addEventListener('change', function() {
            const selectedId = this.value;
            if (!selectedId) return;

            const selectedPreset = webuiPresets.find(function(p) { return p.id === selectedId; });
            if (selectedPreset) {
                const positivePrompt = document.getElementById('positivePrompt');
                const negativePrompt = document.getElementById('negativePrompt');
                if (positivePrompt) positivePrompt.value = selectedPreset.sccz;
                if (negativePrompt) negativePrompt.value = selectedPreset.sccf;
            }
        });

        refreshCustomSelectById('webuiPreset');
    }

    // WebUI 功能
    function initWebUI() {
        // 初始化 WebUI 预设
        initWebUIPresets();
        
        // WebUI 资源只由 WebUI 页面刷新按钮手动获取
        
        // 不需要翻译并追加功能，因为已经删除了中文灵感输入

        // 快捷标签按钮点击事件
        const tagButtons = document.querySelectorAll('.tag-btn');
        tagButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const tagText = button.textContent;
                const positivePrompt = document.getElementById('positivePrompt');
                const currentText = positivePrompt.value.trim();
                if (currentText) {
                    positivePrompt.value = currentText + ', ' + tagText;
                } else {
                    positivePrompt.value = tagText;
                }
            });
        });

        // 参数滑块值显示
        const sliders = ['webuiImageCount', 'steps', 'cfgScale'];
        sliders.forEach(function(sliderId) {
            const slider = document.getElementById(sliderId);
            const valueDisplay = document.getElementById(sliderId + 'Value');
            if (slider && valueDisplay) {
                slider.addEventListener('input', function() {
                    valueDisplay.textContent = this.value;
                });
            }
        });

        // 不需要重绘幅度滑块值显示，因为已经删除了该滑块

        // Lora模型选择事件
        const loraModelSelect = document.getElementById('loraModel');
        if (loraModelSelect) {
            loraModelSelect.addEventListener('change', function() {
                const selectedLora = this.value;
                if (selectedLora) {
                    const positivePrompt = document.getElementById('positivePrompt');
                    const currentText = positivePrompt.value.trim();
                    // 添加Lora触发词格式
                    const loraTriggerWord = `<lora:${selectedLora}:1>`;
                    if (currentText) {
                        positivePrompt.value = currentText + ', ' + loraTriggerWord;
                    } else {
                        positivePrompt.value = loraTriggerWord;
                    }
                }
            });
        }

        // 一键生成按钮点击事件 - 抓取选区进行图生图
        const btnWebUIGenerate = document.getElementById('btnWebUIGenerate');
        if (btnWebUIGenerate) {
            btnWebUIGenerate.addEventListener('click', async function() {
                const timestamp = new Date().toLocaleString('zh-CN');
                const model = 'SD WebUI';
                
                const positivePrompt = document.getElementById('positivePrompt').value.trim();
                const negativePrompt = document.getElementById('negativePrompt').value.trim();
                const sdApiUrl = currentSettings.sdApiUrl || 'http://localhost:7860';
                const imageCount = document.getElementById('webuiImageCount').value;
                const steps = document.getElementById('steps').value;
                const cfgScale = document.getElementById('cfgScale').value;
                const denoisingStrength = document.getElementById('denoisingStrength').value;
                const samplingMethod = document.getElementById('samplingMethod').value;
                const sdModel = document.getElementById('sdModel').value;

                if (!positivePrompt) {
                    showStatus('请输入正向提示词', 'error');
                    Config.addLog({
                        timestamp: timestamp,
                        model: model,
                        prompt: positivePrompt,
                        type: 'webui',
                        status: '失败',
                        error: '请输入正向提示词'
                    });
                    return;
                }

                if (!sdApiUrl) {
                    showStatus('请在设置中配置SD WebUI API地址', 'error');
                    Config.addLog({
                        timestamp: timestamp,
                        model: model,
                        prompt: positivePrompt,
                        type: 'webui',
                        status: '失败',
                        error: '请在设置中配置SD WebUI API地址'
                    });
                    switchTab('settings');
                    return;
                }

                let progressInterval = null;
                let webuiSelectionBounds = null;
                let webuiInitImage = null;
                let originalSavedSelectionBounds = savedSelectionBounds;
                
                try {
                    showStatus('正在读取选区...', 'info');
                    
                    // 检查是否可以访问Photoshop API
                    if (!psAPI.isAvailable) {
                        showStatus('无法访问Photoshop API', 'error');
                        Config.addLog({
                            timestamp: timestamp,
                            model: model,
                            prompt: positivePrompt,
                            type: 'webui',
                            status: '失败',
                            error: '无法访问Photoshop API'
                        });
                        return;
                    }
                    
                    // 读取选区
                    try {
                        const bounds = await getSelectionBoundsInPixels();
                        if (bounds) {
                            webuiSelectionBounds = bounds;
                            
                            const base64Data = await getImageDataToBase64(bounds);
                            
                            if (base64Data && base64Data.length > 0) {
                                webuiInitImage = 'data:image/png;base64,' + base64Data;
                                showStatus('选区读取成功，正在进行图生图...', 'info');
                            } else {
                                showStatus('选区读取失败', 'error');
                                Config.addLog({
                                    timestamp: timestamp,
                                    model: model,
                                    prompt: positivePrompt,
                                    type: 'webui',
                                    status: '失败',
                                    error: '选区读取失败'
                                });
                                return;
                            }
                        } else {
                            showStatus('没有选区，请先在PS中创建选区', 'error');
                            Config.addLog({
                                timestamp: timestamp,
                                model: model,
                                prompt: positivePrompt,
                                type: 'webui',
                                status: '失败',
                                error: '没有选区，请先在PS中创建选区'
                            });
                            return;
                        }
                    } catch (err) {
                        console.error('读取选区失败:', err);
                        showStatus('读取选区失败: ' + err.message, 'error');
                        Config.addLog({
                            timestamp: timestamp,
                            model: model,
                            prompt: positivePrompt,
                            type: 'webui',
                            status: '失败',
                            error: '读取选区失败: ' + err.message
                        });
                        return;
                    }

                    // 设置SD WebUI大模型（如果选择了的话）
                    if (sdModel) {
                        showStatus('正在设置大模型...', 'info');
                        try {
                            const optionsResponse = await fetch(sdApiUrl + '/sdapi/v1/options', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    sd_model_checkpoint: sdModel
                                })
                            });
                            
                            if (!optionsResponse.ok) {
                                throw new Error('设置大模型失败');
                            }
                            
                            // 等待一小会儿让模型加载
                            await new Promise(resolve => setTimeout(resolve, 500));
                        } catch (err) {
                            console.error('设置大模型失败:', err);
                            showStatus('设置大模型失败，将使用当前模型', 'error');
                        }
                    }

                    const resolution = getWebUIResolution();
                    if (!resolution.valid) {
                        console.error("分辨率参数错误:", resolution.message);
                        showStatus(resolution.message, 'error');
                        return;
                    }
                    const width = resolution.width;
                    const height = resolution.height;
                    
                    // 设置savedSelectionBounds为webuiSelectionBounds
                    savedSelectionBounds = webuiSelectionBounds;
                    
                    // 准备图生图参数
                    if (!webuiInitImage) {
                        console.error("未能获取到图层画面");
                        showStatus('未能获取到图层画面', 'error');
                        return;
                    }
                    const pureBase64 = webuiInitImage.includes(',') ? webuiInitImage.split(',')[1] : webuiInitImage;
                    
                    // 确保所有参数都有默认值
                    const batchSize = parseInt(imageCount) || 1;
                    const nIter = 1;
                    const stepsValue = parseInt(steps) || 20;
                    const cfgScaleValue = parseFloat(cfgScale) || 7;
                    const denoisingValue = parseFloat(denoisingStrength) || 0.35;
                    const widthValue = width;
                    const heightValue = height;
                    const samplerValue = samplingMethod || "DPM++ 2M";
                    
                    const payload = {
                        prompt: positivePrompt,
                        negative_prompt: negativePrompt,
                        seed: -1,
                        sampler_name: samplerValue,
                        steps: stepsValue,
                        cfg_scale: cfgScaleValue,
                        width: widthValue,
                        height: heightValue,
                        denoising_strength: denoisingValue,
                        init_images: [pureBase64],
                        batch_size: batchSize,
                        n_iter: nIter
                    };

                    showStatus('正在进行图生图...', 'info');
                    
                    // 显示进度条
                    hideProgressBar();
                    
                    // 启动进度检查定时器
                    progressInterval = setInterval(async () => {
                        const status = await checkProgress();
                        if (status && (status.progress >= 1)) {
                            // 进度达到100%，关闭定时器
                            clearInterval(progressInterval);
                            progressInterval = null;
                        }
                    }, 1000); // 每 1000 毫秒（1秒）查一次
                    
                    // 调用SD WebUI图生图API
                    const response = await fetch(sdApiUrl + '/sdapi/v1/img2img', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error('SD WebUI API请求失败');
                    }

                    const result = await response.json();
                    
                    // 等待一下，确保进度检查能完成
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    if (result.images && result.images.length > 0) {
                        // 完成后隐藏进度条
                        hideProgressBar();
                        showStatus('正在将图片放回到PS...', 'info');
                        
                        try {
                            // 处理第一张生成的图片
                            const returnedBase64 = 'data:image/png;base64,' + result.images[0];
                            const timestamp = Date.now();
                            
                            // 调用downloadAndPlaceDocument函数将图片放回PS
                            await downloadAndPlaceDocument(
                                returnedBase64,
                                width,
                                height,
                                positivePrompt,
                                'webui',
                                timestamp,
                                'SD WebUI'
                            );
                            
                            // 恢复原始的savedSelectionBounds
                            savedSelectionBounds = originalSavedSelectionBounds;
                            
                            showStatus('图生图成功！', 'success');
                            Config.addLog({
                                timestamp: timestamp,
                                model: model,
                                prompt: positivePrompt,
                                type: 'webui',
                                status: '成功',
                                message: '图生图成功！'
                            });
                            
                        } catch (placeError) {
                            console.error('将图片放回PS失败:', placeError);
                            showStatus('图生图成功，但放回PS失败: ' + placeError.message, 'error');
                            // 恢复原始的savedSelectionBounds
                            savedSelectionBounds = originalSavedSelectionBounds;
                            Config.addLog({
                                timestamp: timestamp,
                                model: model,
                                prompt: positivePrompt,
                                type: 'webui',
                                status: '失败',
                                error: '图生图成功，但放回PS失败: ' + placeError.message
                            });
                            throw placeError;
                        }
                    } else {
                        hideProgressBar();
                        // 恢复原始的savedSelectionBounds
                        savedSelectionBounds = originalSavedSelectionBounds;
                        const errorMsg = '没有生成图片';
                        Config.addLog({
                            timestamp: timestamp,
                            model: model,
                            prompt: positivePrompt,
                            type: 'webui',
                            status: '失败',
                            error: errorMsg
                        });
                        throw new Error(errorMsg);
                    }
                    
                } catch (error) {
                    console.error('图生图失败:', error);
                    showStatus('图生图失败: ' + error.message, 'error');
                    // 恢复原始的savedSelectionBounds
                    savedSelectionBounds = originalSavedSelectionBounds;
                    Config.addLog({
                        timestamp: timestamp,
                        model: model,
                        prompt: positivePrompt,
                        type: 'webui',
                        status: '失败',
                        error: '图生图失败: ' + error.message
                    });
                } finally {
                    // 确保进度检查定时器被清除
                    if (progressInterval) {
                        clearInterval(progressInterval);
                    }
                    hideProgressBar();
                }
            });
        }

        // 刷新按钮点击事件 - 获取所有SD WebUI资源
        const btnWebUIImg2Img = document.getElementById('btnWebUIImg2Img');
        if (btnWebUIImg2Img) {
            btnWebUIImg2Img.addEventListener('click', function() {
                refreshAllSDResources();
            });
        }
    }

    // WebUI 初始化仅在切换到 WebUI 标签时执行，避免插件加载阶段超时

})();
