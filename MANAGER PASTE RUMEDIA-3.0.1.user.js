// ==UserScript==
// @name         MANAGER PASTE RUMEDIA
// @namespace    http://tampermonkey.net/
// @version      3.0.1
// @description  Современный менеджер паст с улучшенной архитектурой, красивым дизайном и высокой производительностью
// @author       Ruslan Medzhitov
// @match        https://rumedia.io/media/*
// @match        https://rumedia.io/media/*
// @exclude      https://rumedia.io/media/messages/*
// @exclude      https://rumedia.io/media/admin-cp/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Configuration with environment detection
    const CONFIG = {
        API_BASE_URL: "https://shalyn.work/pastes/",
        CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        ANIMATION_DURATION: 300,
        DEBOUNCE_DELAY: 800,
        MAX_PREVIEW_LENGTH: 100,
        STORAGE_KEY: 'paste_manager_settings'
    };

    // Enhanced CSS with modern design system
    const STYLES = `
        :root {
            --pm-primary: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            --pm-primary-hover: linear-gradient(135deg, #4338ca 0%, #6d28d9 100%);
            --pm-success: linear-gradient(135deg, #059669 0%, #10b981 100%);
            --pm-danger: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
            --pm-warning: linear-gradient(135deg, #d97706 0%, #f59e0b 100%);
            --pm-bg: #ffffff;
            --pm-bg-secondary: #f8fafc;
            --pm-bg-tertiary: #e2e8f0;
            --pm-text: #0f172a;
            --pm-text-secondary: #475569;
            --pm-text-muted: #64748b;
            --pm-border: #e2e8f0;
            --pm-border-hover: #cbd5e0;
            --pm-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --pm-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --pm-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --pm-shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            --pm-radius: 20px;
            --pm-radius-md: 16px;
            --pm-radius-sm: 12px;
            --pm-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            --pm-backdrop: rgba(15, 23, 42, 0.75);
        }

        [data-theme="dark"] {
            --pm-bg: #1a202c;
            --pm-bg-secondary: #2d3748;
            --pm-bg-tertiary: #4a5568;
            --pm-text: #f7fafc;
            --pm-text-secondary: #e2e8f0;
            --pm-text-muted: #a0aec0;
            --pm-border: #4a5568;
            --pm-border-hover: #718096;
            --pm-backdrop: rgba(0, 0, 0, 0.9);
        }

        .pm-overlay {
            position: fixed;
            inset: 0;
            background: var(--pm-backdrop);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            opacity: 0;
            visibility: hidden;
            transition: var(--pm-transition);
            padding: 20px;
        }

        .pm-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .pm-modal {
            background: var(--pm-bg);
            border-radius: var(--pm-radius);
            box-shadow: var(--pm-shadow-xl);
            max-width: 800px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            transform: scale(0.9) translateY(40px);
            transition: var(--pm-transition);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            border: 1px solid var(--pm-border);
        }

        .pm-overlay.active .pm-modal {
            transform: scale(1) translateY(0);
        }

        .pm-header {
            padding: 28px 32px;
            border-bottom: 1px solid var(--pm-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: linear-gradient(135deg, var(--pm-bg-secondary) 0%, var(--pm-bg) 100%);
        }

        .pm-title {
            font-size: 24px;
            font-weight: 700;
            color: var(--pm-text);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pm-title-icon {
            width: 28px;
            height: 28px;
            background: var(--pm-primary);
            border-radius: var(--pm-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .pm-controls {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pm-theme-toggle {
            background: none;
            border: 1px solid var(--pm-border);
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--pm-text-secondary);
            transition: var(--pm-transition);
        }

        .pm-theme-toggle:hover {
            background: var(--pm-bg-tertiary);
            border-color: var(--pm-border-hover);
        }

        .pm-close {
            background: none;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--pm-text-secondary);
            transition: var(--pm-transition);
        }

        .pm-close:hover {
            background: var(--pm-danger);
            color: white;
        }

        .pm-body {
            padding: 32px;
            max-height: 60vh;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: var(--pm-border) transparent;
        }

        .pm-body::-webkit-scrollbar {
            width: 6px;
        }

        .pm-body::-webkit-scrollbar-track {
            background: transparent;
        }

        .pm-body::-webkit-scrollbar-thumb {
            background: var(--pm-border);
            border-radius: 3px;
        }

        .pm-search {
            position: relative;
            margin-bottom: 24px;
        }

        .pm-search-input {
            width: 100%;
            padding: 16px 48px 16px 20px;
            border: 2px solid var(--pm-border);
            border-radius: var(--pm-radius-md);
            font-size: 16px;
            background: var(--pm-bg);
            color: var(--pm-text);
            transition: var(--pm-transition);
        }

        .pm-search-input:focus {
            outline: none;
            border-color: var(--pm-primary);
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .pm-search-icon {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--pm-text-muted);
        }

        .pm-list {
            display: grid;
            gap: 16px;
        }

        .pm-item {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 20px;
            background: var(--pm-bg-secondary);
            border: 2px solid var(--pm-border);
            border-radius: var(--pm-radius-md);
            transition: var(--pm-transition);
            cursor: pointer;
            position: relative;
        }

        .pm-item:hover {
            transform: translateY(-2px);
            box-shadow: var(--pm-shadow-lg);
            border-color: var(--pm-primary);
            background: var(--pm-bg);
        }

        .pm-item:hover::after {
            content: 'Нажмите для вставки пасты';
            position: absolute;
            top: -8px;
            left: 20px;
            background: var(--pm-primary);
            color: white;
            padding: 4px 8px;
            border-radius: var(--pm-radius-sm);
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 10;
        }

        .pm-item.active {
            border-color: var(--pm-primary);
            background: var(--pm-bg);
        }

        .pm-item-icon {
            width: 48px;
            height: 48px;
            border-radius: var(--pm-radius-sm);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            flex-shrink: 0;
        }

        .pm-item-content {
            flex: 1;
            min-width: 0;
        }

        .pm-item-name {
            font-weight: 600;
            color: var(--pm-text);
            margin: 0 0 8px 0;
            font-size: 18px;
        }

        .pm-item-preview {
            color: var(--pm-text-secondary);
            font-size: 14px;
            margin: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            max-width: 300px;
        }

        .pm-item-meta {
            font-size: 12px;
            color: var(--pm-text-muted);
            margin-top: 4px;
        }

        .pm-item-actions {
            display: flex;
            gap: 8px;
            opacity: 0;
            transition: var(--pm-transition);
        }

        .pm-item:hover .pm-item-actions {
            opacity: 1;
        }

        .pm-btn {
            padding: 12px 20px;
            border: none;
            border-radius: var(--pm-radius-sm);
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: var(--pm-transition);
            display: inline-flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            white-space: nowrap;
        }

        .pm-btn-primary {
            background: var(--pm-primary);
            color: white;
        }

        .pm-btn-primary:hover {
            background: var(--pm-primary-hover);
            transform: translateY(-1px);
        }

        .pm-btn-success {
            background: var(--pm-success);
            color: white;
        }

        .pm-btn-success:hover {
            transform: translateY(-1px);
            filter: brightness(1.1);
        }

        .pm-btn-danger {
            background: var(--pm-danger);
            color: white;
        }

        .pm-btn-danger:hover {
            transform: translateY(-1px);
            filter: brightness(1.1);
        }

        .pm-btn-secondary {
            background: var(--pm-bg-tertiary);
            color: var(--pm-text);
            border: 1px solid var(--pm-border);
        }

        .pm-btn-secondary:hover {
            background: var(--pm-border);
        }

        .pm-btn-warning {
            background: var(--pm-warning);
            color: white;
        }

        .pm-btn-warning:hover {
            transform: translateY(-1px);
            filter: brightness(1.1);
        }

        .pm-btn-icon {
            padding: 8px;
            width: 36px;
            height: 36px;
            justify-content: center;
        }

        .pm-form {
            display: grid;
            gap: 24px;
        }

        .pm-form-group {
            display: grid;
            gap: 8px;
        }

        .pm-form-label {
            font-weight: 600;
            color: var(--pm-text);
            font-size: 16px;
        }

        .pm-form-input,
        .pm-form-textarea {
            padding: 16px 20px;
            border: 2px solid var(--pm-border);
            border-radius: var(--pm-radius-md);
            font-size: 16px;
            font-family: inherit;
            transition: var(--pm-transition);
            background: var(--pm-bg);
            color: var(--pm-text);
        }

        .pm-form-input:focus,
        .pm-form-textarea:focus {
            outline: none;
            border-color: var(--pm-primary);
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
        }

        .pm-form-textarea {
            resize: vertical;
            min-height: 160px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            line-height: 1.6;
        }

        .pm-footer {
            padding: 24px 32px;
            border-top: 1px solid var(--pm-border);
            display: flex;
            gap: 16px;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, var(--pm-bg) 0%, var(--pm-bg-secondary) 100%);
        }

        .pm-footer-center {
            display: flex;
            gap: 12px;
        }

        .pm-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 60px;
            color: var(--pm-text-secondary);
        }

        .pm-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid var(--pm-border);
            border-top: 3px solid var(--pm-primary);
            border-radius: 50%;
            animation: pm-spin 1s linear infinite;
            margin-right: 16px;
        }

        @keyframes pm-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .pm-error {
            padding: 20px;
            background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
            color: white;
            border-radius: var(--pm-radius-md);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .pm-empty {
            text-align: center;
            padding: 60px 20px;
            color: var(--pm-text-secondary);
        }

        .pm-empty-icon {
            font-size: 64px;
            margin-bottom: 20px;
            opacity: 0.3;
        }

        .pm-notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            border-radius: var(--pm-radius-md);
            color: white;
            z-index: 1000000;
            transform: translateX(400px);
            transition: var(--pm-transition);
            box-shadow: var(--pm-shadow-lg);
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 400px;
        }

        .pm-notification.show {
            transform: translateX(0);
        }

        .pm-notification.success {
            background: var(--pm-success);
        }

        .pm-notification.error {
            background: var(--pm-danger);
        }

        .pm-notification.info {
            background: var(--pm-primary);
        }

        .pm-preview-modal {
            position: fixed;
            inset: 0;
            background: var(--pm-backdrop);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000000;
            opacity: 0;
            visibility: hidden;
            transition: var(--pm-transition);
            padding: 20px;
        }

        .pm-preview-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .pm-preview-content {
            background: var(--pm-bg);
            border-radius: var(--pm-radius);
            box-shadow: var(--pm-shadow-xl);
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow: hidden;
            transform: scale(0.9) translateY(40px);
            transition: var(--pm-transition);
            border: 1px solid var(--pm-border);
        }

        .pm-preview-modal.active .pm-preview-content {
            transform: scale(1) translateY(0);
        }

        .pm-preview-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--pm-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: var(--pm-bg-secondary);
        }

        .pm-preview-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--pm-text);
            margin: 0;
        }

        .pm-preview-close {
            background: none;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: var(--pm-text-secondary);
            transition: var(--pm-transition);
        }

        .pm-preview-close:hover {
            background: var(--pm-bg-tertiary);
            color: var(--pm-text);
        }

        .pm-preview-body {
            padding: 24px;
            max-height: 60vh;
            overflow-y: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            line-height: 1.6;
            white-space: pre-wrap;
            color: var(--pm-text);
            background: var(--pm-bg-secondary);
            border-radius: var(--pm-radius-sm);
            margin: 0;
        }

        .pm-trigger {
            position: fixed;
            bottom: 32px;
            right: 32px;
            width: 60px;
            height: 60px;
            background: var(--pm-primary);
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: var(--pm-shadow-lg);
            transition: var(--pm-transition);
            z-index: 999998;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .pm-trigger:hover {
            transform: scale(1.1);
            box-shadow: var(--pm-shadow-xl);
        }

        .pm-trigger:active {
            transform: scale(0.95);
        }

        @media (max-width: 768px) {
            .pm-modal {
                margin: 16px;
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 32px);
            }

            .pm-header,
            .pm-body,
            .pm-footer {
                padding: 20px;
            }

            .pm-item {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
            }

            .pm-item-actions {
                opacity: 1;
                justify-content: center;
                margin-top: 12px;
            }

            .pm-trigger {
                bottom: 20px;
                right: 20px;
                width: 56px;
                height: 56px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            * {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
            }
        }
    `;

    // Enhanced API Service with better error handling and caching
    class PasteAPI {
        constructor(baseUrl) {
            this.baseUrl = baseUrl;
            this.cache = new Map();
            this.requestQueue = new Map();
        }

        async request(endpoint, options = {}) {
            const requestKey = `${endpoint}-${JSON.stringify(options)}`;

            // Prevent duplicate requests
            if (this.requestQueue.has(requestKey)) {
                return await this.requestQueue.get(requestKey);
            }

            const requestPromise = this._makeRequest(endpoint, options);
            this.requestQueue.set(requestKey, requestPromise);

            try {
                const result = await requestPromise;
                return result;
            } finally {
                this.requestQueue.delete(requestKey);
            }
        }

        async _makeRequest(endpoint, options = {}) {
            const url = `${this.baseUrl}${endpoint}`;
            let attempts = 0;

            while (attempts < CONFIG.MAX_RETRIES) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000);

                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            ...options.headers
                        }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    const data = await response.json();
                    return data;
                } catch (error) {
                    attempts++;
                    if (attempts >= CONFIG.MAX_RETRIES) {
                        throw new Error(`Request failed after ${CONFIG.MAX_RETRIES} attempts: ${error.message}`);
                    }
                    await this.delay(CONFIG.RETRY_DELAY * Math.pow(2, attempts - 1)); // Exponential backoff
                }
            }
        }

        async getPastes(useCache = true) {
            const cacheKey = 'pastes';

            if (useCache && this.cache.has(cacheKey)) {
                const cached = this.cache.get(cacheKey);
                if (Date.now() - cached.timestamp < CONFIG.CACHE_DURATION) {
                    return cached.data;
                }
            }

            const data = await this.request('get_pastes.php');

            // Enhance data with metadata
            const enhancedData = Array.isArray(data) ? data.map(paste => ({
                ...paste,
                preview: this.generatePreview(paste.content),
                wordCount: this.getWordCount(paste.content),
                createdAt: paste.created_at || Date.now()
            })) : [];

            this.cache.set(cacheKey, {
                data: enhancedData,
                timestamp: Date.now()
            });

            return enhancedData;
        }

        async addPaste(name, content) {
            const data = await this.request('add_paste.php', {
                method: 'POST',
                body: new URLSearchParams({ name, content })
            });

            this.invalidateCache();
            return data;
        }

        async editPaste(id, name, content) {
            const data = await this.request('edit_paste.php', {
                method: 'POST',
                body: new URLSearchParams({ id, name, content })
            });

            this.invalidateCache();
            return data;
        }

        async deletePaste(id) {
            const data = await this.request('delete_paste.php', {
                method: 'POST',
                body: new URLSearchParams({ id })
            });

            this.invalidateCache();
            return data;
        }

        generatePreview(content) {
            if (!content) return '';
            const stripped = content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '');
            return stripped.length > CONFIG.MAX_PREVIEW_LENGTH
                ? stripped.substring(0, CONFIG.MAX_PREVIEW_LENGTH) + '...'
                : stripped;
        }

        getWordCount(content) {
            if (!content) return 0;
            const stripped = content.replace(/<[^>]*>/g, '');
            return stripped.trim().split(/\s+/).filter(word => word.length > 0).length;
        }

        invalidateCache() {
            this.cache.clear();
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // Enhanced UI Manager with better UX
    class PasteUI {
        constructor(api) {
            this.api = api;
            this.modal = null;
            this.trigger = null;
            this.currentMode = 'list';
            this.currentPaste = null;
            this.isVisible = false;
            this.searchTerm = '';
            this.filteredPastes = [];
            this.allPastes = [];
            this.settings = this.loadSettings();

            this.init();
        }

        init() {
            this.injectStyles();
            this.createTrigger();
            this.createModal();
            this.createPreviewModal();
            this.bindEvents();
            this.applyTheme();
        }

        loadSettings() {
            try {
                const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
                return stored ? JSON.parse(stored) : { theme: 'light' };
            } catch {
                return { theme: 'light' };
            }
        }

        saveSettings() {
            try {
                localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.settings));
            } catch (e) {
                console.warn('Could not save settings:', e);
            }
        }

        applyTheme() {
            document.documentElement.setAttribute('data-theme', this.settings.theme);
        }

        toggleTheme() {
            this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
            this.saveSettings();
            this.applyTheme();
        }

        injectStyles() {
            const styleSheet = document.createElement('style');
            styleSheet.textContent = STYLES;
            document.head.appendChild(styleSheet);
        }

        createTrigger() {
            this.trigger = document.createElement('button');
            this.trigger.className = 'pm-trigger';
            this.trigger.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
            `;
            this.trigger.title = 'Открыть Пасты';
            this.trigger.addEventListener('click', () => this.show());
            document.body.appendChild(this.trigger);
        }

        createModal() {
            this.modal = document.createElement('div');
            this.modal.className = 'pm-overlay';
            this.modal.innerHTML = `
                <div class="pm-modal">
                    <div class="pm-header">
                        <h2 class="pm-title">
                            <div class="pm-title-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                            </div>
                            Пасты
                        </h2>
                        <div class="pm-controls">
                            <button class="pm-theme-toggle" title="Переключить тему">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                                </svg>
                            </button>
                            <button class="pm-close" title="Закрыть">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div class="pm-body">
                        <div class="pm-content"></div>
                    </div>
                    <div class="pm-footer">
                        <div class="pm-footer-center">
                            <button class="pm-btn pm-btn-secondary pm-btn-back" style="display: none;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15,18 9,12 15,6"></polyline>
                                </svg>
                                Назад
                            </button>
                            <button class="pm-btn pm-btn-primary pm-btn-add">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Добавить пасту
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(this.modal);
        }

        createPreviewModal() {
            this.previewModal = document.createElement('div');
            this.previewModal.className = 'pm-preview-modal';
            this.previewModal.innerHTML = `
                <div class="pm-preview-content">
                    <div class="pm-preview-header">
                        <h3 class="pm-preview-title">Preview</h3>
                        <button class="pm-preview-close" aria-label="Close Preview">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    <pre class="pm-preview-body"></pre>
                </div>
            `;

            this.previewModal.querySelector('.pm-preview-close').addEventListener('click', () => this.hidePreview());
            this.previewModal.addEventListener('click', (e) => {
                if (e.target === this.previewModal) this.hidePreview();
            });

            document.body.appendChild(this.previewModal);
        }

        bindEvents() {
            // Modal events
            this.modal.querySelector('.pm-close').addEventListener('click', () => this.hide());
            this.modal.querySelector('.pm-theme-toggle').addEventListener('click', () => this.toggleTheme());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.hide();
            });

            // Keyboard events
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    if (this.previewModal && this.previewModal.classList.contains('active')) {
                        e.preventDefault();
                        this.hidePreview();
                    } else if (this.isVisible) {
                        e.preventDefault();
                        this.hide();
                    }
                }
                if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !this.isVisible) {
                    e.preventDefault();
                    this.show();
                }
            });

            // Footer buttons - use addEventListener instead of onclick
            this.modal.querySelector('.pm-btn-back').addEventListener('click', () => this.showList());
        }

        async show() {
            this.isVisible = true;
            this.modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            await this.showList();
        }

        hide() {
            this.isVisible = false;
            this.modal.classList.remove('active');
            document.body.style.overflow = '';
            this.currentMode = 'list';
            this.currentPaste = null;
            this.searchTerm = '';
        }

        async showList() {
            this.currentMode = 'list';
            this.updateHeader('Пасты');
            this.updateFooter();

            const content = this.modal.querySelector('.pm-content');
            content.innerHTML = '<div class="pm-loading"><div class="pm-spinner"></div>Загрузка паст...</div>';

            try {
                this.allPastes = await this.api.getPastes();
                this.filteredPastes = [...this.allPastes];
                this.renderList();
            } catch (error) {
                content.innerHTML = `
                    <div class="pm-error">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        Ошибка загрузки паст: ${error.message}
                    </div>
                `;
            }
        }

        renderList() {
            const content = this.modal.querySelector('.pm-content');

            if (this.filteredPastes.length === 0 && this.allPastes.length === 0) {
                content.innerHTML = `
                    <div class="pm-empty">
                        <div class="pm-empty-icon">📋</div>
                        <h3>Паст пока нет</h3>
                        <p>Создайте первую пасту для начала работы</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="pm-search">
                    <input type="text" class="pm-search-input" placeholder="Поиск паст..." value="${this.searchTerm}">
                    <div class="pm-search-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="21 21l-4.35-4.35"></path>
                        </svg>
                    </div>
                </div>
                <div class="pm-list">
                    ${this.filteredPastes.length === 0 ?
                        '<div class="pm-empty"><h3>Пасты не найдены</h3><p>Попробуйте изменить запрос</p></div>' :
                        this.filteredPastes.map(paste => this.renderPasteItem(paste)).join('')
                    }
                </div>
            `;

            this.bindListEvents();
        }

        renderPasteItem(paste) {
            const colors = ['#667eea', '#764ba2', '#11998e', '#38ef7d', '#ff416c', '#f093fb'];
            const color = colors[Math.abs(paste.id) % colors.length];

            return `
                <div class="pm-item" data-paste-id="${paste.id}">
                    <div class="pm-item-icon" style="background: ${color}">
                        ${paste.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="pm-item-content">
                        <h3 class="pm-item-name">${this.escapeHtml(paste.name)}</h3>
                        <p class="pm-item-preview">${this.escapeHtml(paste.preview)}</p>
                        <div class="pm-item-meta">${paste.wordCount} слов</div>
                    </div>
                    <div class="pm-item-actions">
                        <button class="pm-btn pm-btn-secondary pm-btn-icon pm-btn-preview" title="Предпросмотр">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="pm-btn pm-btn-success pm-btn-icon pm-btn-copy" title="Копировать в буфер">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                            </svg>
                        </button>
                        <button class="pm-btn pm-btn-warning pm-btn-icon pm-btn-edit" title="Редактировать">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="pm-btn pm-btn-danger pm-btn-icon pm-btn-delete" title="Удалить">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"></polyline>
                                <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }

        bindListEvents() {
            const searchInput = this.modal.querySelector('.pm-search-input');
            if (searchInput) {
                searchInput.addEventListener('input', this.debounce((e) => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.filteredPastes = this.allPastes.filter(paste =>
                        paste.name.toLowerCase().includes(this.searchTerm) ||
                        paste.preview.toLowerCase().includes(this.searchTerm)
                    );
                    this.renderList();
                }, CONFIG.DEBOUNCE_DELAY));
            }

            // Bind paste item events
            this.modal.querySelectorAll('.pm-item').forEach(item => {
                const pasteId = item.dataset.pasteId;

                // Click on item to use paste
                item.addEventListener('click', (e) => {
                    // Don't trigger if clicking on action buttons
                    if (e.target.closest('.pm-item-actions')) return;
                    this.usePaste(pasteId);
                });

                item.querySelector('.pm-btn-preview').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showPreview(pasteId);
                });

                item.querySelector('.pm-btn-copy').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copyPaste(pasteId);
                });

                item.querySelector('.pm-btn-edit').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showEditForm(pasteId);
                });

                item.querySelector('.pm-btn-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deletePaste(pasteId);
                });
            });
        }

        async usePaste(pasteId) {
            const paste = this.allPastes.find(p => p.id == pasteId);
            if (!paste) return;

            try {
                let targetField = null;

                // Priority order for finding target fields
                const selectors = [
                    '.emojionearea-editor', // Original selector from your code
                    'textarea:focus',
                    'input[type="text"]:focus',
                    '[contenteditable="true"]:focus',
                    document.activeElement, // Currently focused element
                    '.emojionearea-editor', // Second try for emoji editor
                    'textarea',
                    'input[type="text"]',
                    'input:not([type])',
                    '[contenteditable="true"]',
                    '.editor', // Common editor class
                    '.text-editor',
                    '.content-editor'
                ];

                // Try each selector until we find a field
                for (const selector of selectors) {
                    if (typeof selector === 'string') {
                        const element = document.querySelector(selector);
                        if (element && this.isValidInputElement(element)) {
                            targetField = element;
                            break;
                        }
                    } else if (selector && this.isValidInputElement(selector)) {
                        targetField = selector;
                        break;
                    }
                }

                if (targetField) {
                    const content = paste.content.replace(/<br\s*\/?>/gi, '\n');
                    const username = this.getUsername();
                    const processedContent = content + (username ? ` - ${username}` : '');

                    if (targetField.contentEditable === 'true' || targetField.classList.contains('emojionearea-editor')) {
                        // For contenteditable elements (like emoji editor)
                        const formattedContent = processedContent.replace(/\n/g, '<br>');
                        targetField.innerHTML += formattedContent;
                    } else {
                        // For regular input/textarea elements
                        targetField.value += processedContent;
                    }

                    // Trigger events to notify the page of changes
                    const events = ['input', 'change', 'keyup', 'blur'];
                    events.forEach(eventType => {
                        targetField.dispatchEvent(new Event(eventType, { bubbles: true }));
                    });

                    // Focus and place cursor at end
                    targetField.focus();
                    if (targetField.setSelectionRange && typeof targetField.value === 'string') {
                        targetField.setSelectionRange(targetField.value.length, targetField.value.length);
                    }

                    this.showNotification(`Паста "${paste.name}" вставлена успешно`, 'success');
                    this.hide();
                } else {
                    this.showNotification('Не найдено поле для вставки. Кликните на поле ввода и попробуйте снова.', 'error');
                }
            } catch (error) {
                console.error('Error inserting paste:', error);
                this.showNotification('Ошибка при вставке пасты', 'error');
            }
        }

        isValidInputElement(element) {
            if (!element) return false;

            const tagName = element.tagName?.toLowerCase();
            const isInput = tagName === 'input' || tagName === 'textarea';
            const isContentEditable = element.contentEditable === 'true';
            const isVisible = element.offsetParent !== null;
            const isNotDisabled = !element.disabled;

            return (isInput || isContentEditable) && isVisible && isNotDisabled;
        }

        showPreview(pasteId) {
            const paste = this.allPastes.find(p => p.id == pasteId);
            if (!paste) return;

            const title = this.previewModal.querySelector('.pm-preview-title');
            const body = this.previewModal.querySelector('.pm-preview-body');

            title.textContent = paste.name;
            body.textContent = paste.content.replace(/<br\s*\/?>/gi, '\n');

            this.previewModal.classList.add('active');
        }

        hidePreview() {
            this.previewModal.classList.remove('active');
        }

        async copyPaste(pasteId) {
            const paste = this.allPastes.find(p => p.id == pasteId);
            if (!paste) return;

            try {
                const content = paste.content.replace(/<br\s*\/?>/gi, '\n');

                // Modern clipboard API
                if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(content);
                } else {
                    // Fallback for older browsers
                    const textarea = document.createElement('textarea');
                    textarea.value = content;
                    textarea.style.position = 'fixed';
                    textarea.style.opacity = '0';
                    textarea.style.pointerEvents = 'none';
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }

                this.showNotification(`Паста "${paste.name}" скопирована в буфер обмена`, 'success');
            } catch (error) {
                console.error('Error copying paste:', error);
                this.showNotification('Ошибка при копировании пасты', 'error');
            }
        }

        showAddForm() {
            this.currentMode = 'add';
            this.currentPaste = null;
            this.updateHeader('Добавить новую пасту');
            this.renderForm();
            this.updateFooter(); // Update footer after rendering form
        }

        async showEditForm(pasteId) {
            const paste = this.allPastes.find(p => p.id == pasteId);
            if (!paste) return;

            this.currentMode = 'edit';
            this.currentPaste = paste;
            this.updateHeader('Редактировать пасту');
            this.renderForm(paste);
            this.updateFooter(); // Update footer after rendering form
        }

        renderForm(paste = null) {
            const content = this.modal.querySelector('.pm-content');
            const isEdit = paste !== null;

            content.innerHTML = `
                <div class="pm-form">
                    <div class="pm-form-group">
                        <label class="pm-form-label">Название пасты</label>
                        <input type="text" class="pm-form-input" id="pm-name" placeholder="Введите название пасты" value="${isEdit ? this.escapeHtml(paste.name) : ''}">
                    </div>
                    <div class="pm-form-group">
                        <label class="pm-form-label">Содержимое</label>
                        <textarea class="pm-form-textarea" id="pm-content" placeholder="Введите содержимое пасты">${isEdit ? this.escapeHtml(paste.content.replace(/<br\s*\/?>/gi, '\n')) : ''}</textarea>
                    </div>
                </div>
            `;

            // Focus name input and add keyboard handlers
            setTimeout(() => {
                const nameInput = content.querySelector('#pm-name');
                const contentInput = content.querySelector('#pm-content');

                if (nameInput) {
                    nameInput.focus();

                    // Add Enter key handler for name input
                    nameInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            contentInput?.focus();
                        }
                    });
                }

                if (contentInput) {
                    // Add Ctrl+Enter key handler for content input
                    contentInput.addEventListener('keydown', (e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                            e.preventDefault();
                            this.handleFormSubmit();
                        }
                    });
                }

                console.log('Form elements set up:', { nameInput, contentInput });
            }, 100);
        }

        updateHeader(title) {
            this.modal.querySelector('.pm-title').innerHTML = `
                <div class="pm-title-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                </div>
                ${title}
            `;
        }

        updateFooter() {
            const backBtn = this.modal.querySelector('.pm-btn-back');
            const addBtn = this.modal.querySelector('.pm-btn-add');

            // Remove previous event listeners
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);

            if (this.currentMode === 'list') {
                this.modal.querySelector('.pm-btn-back').style.display = 'none';
                newAddBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Добавить пасту
                `;
                newAddBtn.addEventListener('click', () => this.showAddForm());
            } else {
                this.modal.querySelector('.pm-btn-back').style.display = 'inline-flex';
                newAddBtn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
                        <polyline points="17,21 17,13 7,13 7,21"></polyline>
                        <polyline points="7,3 7,8 15,8"></polyline>
                    </svg>
                    ${this.currentMode === 'edit' ? 'Обновить' : 'Сохранить'}
                `;
                newAddBtn.addEventListener('click', () => this.handleFormSubmit());
            }
        }

        async handleFormSubmit() {
            const nameInput = this.modal.querySelector('#pm-name');
            const contentInput = this.modal.querySelector('#pm-content');

            console.log('Form elements found:', { nameInput, contentInput });

            if (!nameInput || !contentInput) {
                console.log('Form elements not found');
                this.showNotification('Form elements not found', 'error');
                return;
            }

            const name = nameInput.value.trim();
            const content = contentInput.value.trim();

            console.log('Form values:', { name, content });

            if (!name || !content) {
                this.showNotification('Пожалуйста, заполните все поля', 'error');
                return;
            }

            try {
                const formattedContent = content.replace(/\n/g, '<br>');

                if (this.currentMode === 'edit' && this.currentPaste) {
                    await this.api.editPaste(this.currentPaste.id, name, formattedContent);
                    this.showNotification('Paste updated successfully', 'success');
                } else {
                    await this.api.addPaste(name, formattedContent);
                    this.showNotification('Paste added successfully', 'success');
                }

                await this.showList();
            } catch (error) {
                this.showNotification(`Failed to save paste: ${error.message}`, 'error');
            }
        }

        async deletePaste(pasteId) {
            const paste = this.allPastes.find(p => p.id == pasteId);
            if (!paste) return;

            if (!confirm(`Are you sure you want to delete "${paste.name}"?`)) return;

            try {
                await this.api.deletePaste(pasteId);
                this.showNotification('Paste deleted successfully', 'success');
                await this.showList();
            } catch (error) {
                this.showNotification(`Failed to delete paste: ${error.message}`, 'error');
            }
        }

        getUsername() {
            // Try to detect username from common patterns
            const patterns = [
                () => document.querySelector('input[name*="user"], input[id*="user"]')?.value,
                () => document.querySelector('[data-username]')?.dataset.username,
                () => document.querySelector('.username, .user-name')?.textContent,
                () => localStorage.getItem('username') || sessionStorage.getItem('username')
            ];

            for (const pattern of patterns) {
                try {
                    const result = pattern();
                    if (result && result.trim()) return result.trim();
                } catch (e) {
                    // Continue to next pattern
                }
            }

            return '';
        }

        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `pm-notification ${type}`;

            const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
            notification.innerHTML = `
                <span style="font-size: 18px;">${icon}</span>
                <span>${message}</span>
            `;

            document.body.appendChild(notification);

            setTimeout(() => notification.classList.add('show'), 100);
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    }

    // Trigger Button Manager
    class PasteTrigger {
        constructor(ui) {
            this.ui = ui;
        }
    }

    // Initialize the paste manager when DOM is ready
    function initPasteManager() {
        // Ensure DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initPasteManager);
            return;
        }

        try {
            const api = new PasteAPI(CONFIG.API_BASE_URL);
            const ui = new PasteUI(api);
            const trigger = new PasteTrigger(ui);

            console.log('Paste Manager Pro initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Paste Manager Pro:', error);
        }
    }

    // Start the application
    initPasteManager();

})();