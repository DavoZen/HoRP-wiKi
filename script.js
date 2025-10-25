// HoRP-wiKi - Динамічне сканування GitHub репозиторію
class WikiEngine {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/main`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.pages = [];
        this.structure = {};
        this.lastScan = null;
    }

    // Отримати вміст папки з GitHub API
    async fetchFolderContents(path = '') {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${path}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Помилка отримання вмісту папки:', error);
            return [];
        }
    }

    // Рекурсивне сканування всієї структури
    async scanRepository() {
        this.showLoading('navMenu', 'Сканування структури репозиторію...');
        
        try {
            this.structure = await this.scanFolder('pages');
            this.pages = this.extractPagesFromStructure(this.structure);
            this.buildNavigation();
            this.updateQuickStats();
            this.lastScan = new Date();
            this.updateLastScanTime();
            
            // Зберігаємо в localStorage для швидкого доступу
            this.cacheData();
            
        } catch (error) {
            this.showError('navMenu', 'Помилка сканування репозиторію');
            console.error('Помилка сканування:', error);
        }
    }

    // Сканування папки рекурсивно
    async scanFolder(path) {
        const contents = await this.fetchFolderContents(path);
        const folder = {
            name: path.split('/').pop() || 'pages',
            path: path,
            type: 'folder',
            children: []
        };

        for (const item of contents) {
            if (item.type === 'dir') {
                // Рекурсивно скануємо підпапку
                const subFolder = await this.scanFolder(item.path);
                folder.children.push(subFolder);
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                // Додаємо Markdown файл
                folder.children.push({
                    name: item.name.replace('.md', ''),
                    path: item.path.replace('pages/', '').replace('.md', ''),
                    type: 'file',
                    download_url: item.download_url
                });
            }
        }

        return folder;
    }

    // Вилучити всі сторінки з структури
    extractPagesFromStructure(structure) {
        const pages = [];
        
        function traverse(node) {
            if (node.type === 'file') {
                pages.push({
                    title: node.name,
                    path: node.path,
                    url: node.download_url
                });
            } else if (node.children) {
                node.children.forEach(traverse);
            }
        }
        
        traverse(structure);
        return pages;
    }

    // Побудувати навігацію
    buildNavigation() {
        const navElement = document.getElementById('navMenu');
        navElement.innerHTML = this.buildNavigationHTML(this.structure);
    }

    // HTML для навігації
    buildNavigationHTML(node, level = 0) {
        if (node.type === 'file') {
            return `
                <div class="nav-item nav-page" style="margin-left: ${level * 15}px">
                    <a href="#" onclick="wiki.loadPage('${node.path}')">${node.name}</a>
                </div>
            `;
        }

        let html = '';
        if (level > 0) {
            html += `
                <div class="nav-item nav-folder" style="margin-left: ${(level - 1) * 15}px" 
                     onclick="this.nextElementSibling.classList.toggle('hidden')">
                    📁 ${node.name}
                </div>
                <div class="folder-contents">
            `;
        }

        if (node.children) {
            node.children.forEach(child => {
                html += this.buildNavigationHTML(child, level + 1);
            });
        }

        if (level > 0) {
            html += `</div>`;
        }

        return html;
    }

    // Завантажити сторінку
    async loadPage(pagePath) {
        this.showMainContent('articleContent');
        this.showLoading('articleContent', 'Завантаження сторінки...');

        try {
            const page = this.pages.find(p => p.path === pagePath);
            if (!page) throw new Error('Сторінку не знайдено');

            const response = await fetch(page.url);
            if (!response.ok) throw new Error('Помилка завантаження');

            const markdown = await response.text();
            const html = this.convertMarkdownToHtml(markdown);

            document.getElementById('articleContent').innerHTML = `
                <div class="article-nav">
                    <a href="#" onclick="wiki.showMainPage()">Головна</a> &gt; 
                    ${this.generateBreadcrumbs(pagePath)}
                </div>
                <div class="article-content">
                    ${html}
                </div>
                <div class="article-nav">
                    <small>Останнє оновлення: ${new Date().toLocaleDateString('uk-UA')}</small>
                </div>
            `;

            history.pushState({page: pagePath}, '', `?page=${pagePath}`);
            this.highlightSearchTerms();

        } catch (error) {
            document.getElementById('articleContent').innerHTML = `
                <div class="article-content">
                    <h1>Помилка 404</h1>
                    <p>Статтю "<b>${pagePath}</b>" не знайдено.</p>
                    <p><a href="#" onclick="wiki.showMainPage()">Повернутися на головну</a></p>
                </div>
            `;
        }
    }

    // Конвертація Markdown в HTML
    convertMarkdownToHtml(markdown) {
        return markdown
            // Заголовки
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            // Жирний текст
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Курсив
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // Код
            .replace(/`(.*?)`/g, '<code>$1</code>')
            // Блоки коду
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre>$2</pre>')
            // Зображення
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="' + this.baseUrl + '/$2" alt="$1" style="max-width:100%">')
            // Зовнішні посилання
            .replace(/\[(.*?)\]\((http.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            // Внутрішні посилання
            .replace(/\[\[(.*?)\]\]/g, (match, pageName) => {
                const page = this.pages.find(p => p.title === pageName || p.path === pageName);
                return page ? 
                    `<a href="#" onclick="wiki.loadPage('${page.path}')" class="wiki-link">${pageName}</a>` :
                    `<span class="broken-link" title="Сторінка не знайдена">${pageName}</span>`;
            })
            // Абзаци
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    // Генерація хлібних крихт
    generateBreadcrumbs(pagePath) {
        const parts = pagePath.split('/');
        let breadcrumbs = '';
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === parts.length - 1;

            if (isLast) {
                breadcrumbs += part;
            } else {
                breadcrumbs += `<a href="#" onclick="wiki.loadPage('${currentPath}')">${part}</a> / `;
            }
        });

        return breadcrumbs;
    }

    // Пошук
    async performSearch() {
        const query = document.getElementById('searchBox').value || 
                     document.getElementById('mainSearchBox').value;

        if (!query.trim()) {
            alert('Будь ласка, введіть пошуковий запит!');
            return;
        }

        this.showMainContent('searchResults');
        this.showLoading('searchResults', 'Пошук...');

        // Імітація затримки пошуку для анімації
        await new Promise(resolve => setTimeout(resolve, 500));

        const results = await this.searchPages(query);
        this.displaySearchResults(results, query);
    }

    // Пошук по сторінках
    async searchPages(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const page of this.pages) {
            try {
                const response = await fetch(page.url);
                const content = await response.text();
                
                if (page.title.toLowerCase().includes(lowerQuery) || 
                    content.toLowerCase().includes(lowerQuery)) {
                    results.push({
                        ...page,
                        excerpt: this.generateExcerpt(content, query)
                    });
                }
            } catch (error) {
                console.error('Помилка пошуку в сторінці:', page.title, error);
            }
        }

        return results.sort((a, b) => {
            // Сортування: спершу за збігом у заголовку, потім за збігом у контенті
            const aTitleMatch = a.title.toLowerCase().includes(lowerQuery);
            const bTitleMatch = b.title.toLowerCase().includes(lowerQuery);
            
            if (aTitleMatch && !bTitleMatch) return -1;
            if (!aTitleMatch && bTitleMatch) return 1;
            return 0;
        });
    }

    // Генерація уривку для пошуку
    generateExcerpt(content, query) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        
        if (index === -1) {
            return content.substring(0, 150) + '...';
        }
        
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 100);
        let excerpt = content.substring(start, end);
        
        // Підсвічування знайденого тексту
        const regex = new RegExp(`(${query})`, 'gi');
        excerpt = excerpt.replace(regex, '<span class="highlight">$1</span>');
        
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
    }

    // Показати результати пошуку
    displaySearchResults(results, query) {
        let html = `
            <div class="article-content">
                <h1>Результати пошуку для "${query}"</h1>
                <p>Знайдено: ${results.length} результатів</p>
        `;

        if (results.length === 0) {
            html += `
                <div class="search-result">
                    <p>Нічого не знайдено. Спробуйте:</p>
                    <ul>
                        <li>Перевірити правопис</li>
                        <li>Використовувати інші ключові слова</li>
                        <li><a href="#" onclick="wiki.showAllPages()">Переглянути всі сторінки</a></li>
                    </ul>
                </div>
            `;
        } else {
            results.forEach(result => {
                html += `
                    <div class="search-result" onclick="wiki.loadPage('${result.path}')" style="cursor: pointer;">
                        <h3>${result.title}</h3>
                        <div class="excerpt">${result.excerpt}</div>
                        <small>Шлях: ${result.path}</small>
                    </div>
                `;
            });
        }

        html += '</div>';
        document.getElementById('searchResults').innerHTML = html;
    }

    // Показати всі сторінки
    showAllPages() {
        this.showMainContent('allPages');
        
        let html = `
            <div class="article-content">
                <h1>Всі сторінки (${this.pages.length})</h1>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${this.pages.length}</span>
                        <span class="stat-label">Всього сторінок</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.countFolders(this.structure)}</span>
                        <span class="stat-label">Категорій</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.lastScan ? this.lastScan.toLocaleDateString('uk-UA') : '-'}</span>
                        <span class="stat-label">Останнє сканування</span>
                    </div>
                </div>
                <div class="pages-list">
        `;

        this.pages.forEach(page => {
            html += `
                <div class="search-result" onclick="wiki.loadPage('${page.path}')" style="cursor: pointer;">
                    <h3>${page.title}</h3>
                    <small>Шлях: ${page.path}</small>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        
        document.getElementById('allPages').innerHTML = html;
    }

    // Статистика
    showStatistics() {
        this.showMainContent('searchResults');
        
        const html = `
            <div class="article-content">
                <h1>Статистика HoRP-wiKi</h1>
                <div class="stats-grid">
                    <div class="stat-card">
                        <span class="stat-number">${this.pages.length}</span>
                        <span class="stat-label">Сторінок</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.countFolders(this.structure)}</span>
                        <span class="stat-label">Категорій</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${localStorage.visitCount || 0}</span>
                        <span class="stat-label">Відвідувачів</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-number">${this.lastScan ? this.lastScan.toLocaleDateString('uk-UA') : '-'}</span>
                        <span class="stat-label">Оновлено</span>
                    </div>
                </div>
                <div class="article-nav">
                    <h3>Інформація про систему</h3>
                    <p><strong>Репозиторій:</strong> ${this.repoOwner}/${this.repoName}</p>
                    <p><strong>Автоматичне сканування:</strong> ✅ Увімкнено</p>
                    <p><strong>Динамічна структура:</strong> ✅ Активна</p>
                    <p><a href="https://github.com/${this.repoOwner}/${this.repoName}" target="_blank">📝 Редагувати на GitHub</a></p>
                </div>
            </div>
        `;
        
        document.getElementById('searchResults').innerHTML = html;
    }

    // Допоміжні методи
    countFolders(node) {
        if (node.type !== 'folder') return 0;
        let count = 1; // Поточна папка
        if (node.children) {
            node.children.forEach(child => {
                if (child.type === 'folder') {
                    count += this.countFolders(child);
                }
            });
        }
        return count;
    }

    showMainPage() {
        this.showMainContent('mainSearch');
        history.pushState({}, '', '?');
    }

    showMainContent(contentId) {
        document.querySelectorAll('.main-content').forEach(el => {
            el.classList.add('hidden');
        });
        document.getElementById(contentId).classList.remove('hidden');
    }

    showLoading(elementId, message = 'Завантаження...') {
        document.getElementById(elementId).innerHTML = `
            <div class="loading">
                ${message}
            </div>
        `;
    }

    showError(elementId, message) {
        document.getElementById(elementId).innerHTML = `
            <div style="color: red; text-align: center; padding: 20px;">
                ❌ ${message}
            </div>
        `;
    }

    updateQuickStats() {
        document.getElementById('quickStats').innerHTML = `
            📊 <strong>${this.pages.length}</strong> сторінок у <strong>${this.countFolders(this.structure)}</strong> категоріях<br>
            <small>Структура оновлена: ${this.lastScan ? this.lastScan.toLocaleTimeString('uk-UA') : 'щойно'}</small>
        `;
    }

    updateLastScanTime() {
        document.getElementById('lastUpdate').textContent = 
            `Останнє оновлення: ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}`;
    }

    // Випадкова сторінка
    showRandomPage() {
        if (this.pages.length > 0) {
            const randomPage = this.pages[Math.floor(Math.random() * this.pages.length)];
            this.loadPage(randomPage.path);
        } else {
            alert('Спочатку потрібно завантажити структуру!');
        }
    }

    // Кешування даних
    cacheData() {
        const cache = {
            pages: this.pages,
            structure: this.structure,
            lastScan: this.lastScan
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
    }

    // Завантаження з кешу
    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                this.pages = cache.pages || [];
                this.structure = cache.structure || {};
                this.lastScan = cache.lastScan ? new Date(cache.lastScan) : null;
                return true;
            } catch (error) {
                console.error('Помилка завантаження з кешу:', error);
            }
        }
        return false;
    }

    // Підсвічування пошукових термінів
    highlightSearchTerms() {
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search');
        if (search) {
            setTimeout(() => {
                const elements = document.querySelectorAll('.article-content');
                elements.forEach(el => {
                    const regex = new RegExp(`(${search})`, 'gi');
                    el.innerHTML = el.innerHTML.replace(regex, '<span class="highlight">$1</span>');
                });
            }, 100);
        }
    }

    // Ініціалізація
    async init() {
        // Лічильник відвідувачів
        if (!localStorage.visitCount) localStorage.visitCount = 0;
        localStorage.visitCount++;
        document.getElementById('pageCounter').textContent = `Відвідувачів: ${localStorage.visitCount}`;

        // Спроба завантажити з кешу
        if (this.loadFromCache()) {
            this.buildNavigation();
            this.updateQuickStats();
            this.updateLastScanTime();
        }

        // Сканування репозиторію
        await this.scanRepository();

        // Обробка початкового URL
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const search = urlParams.get('search');

        if (search) {
            document.getElementById('mainSearchBox').value = search;
            setTimeout(() => this.performSearch(), 1000);
        } else if (page) {
            this.loadPage(page);
        }
    }
}

// Глобальний екземпляр
const wiki = new WikiEngine();

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', () => {
    wiki.init();
});

// Глобальні функції для onclick
function showMainPage() { wiki.showMainPage(); }
function showAllPages() { wiki.showAllPages(); }
function showRandomPage() { wiki.showRandomPage(); }
function showStatistics() { wiki.showStatistics(); }
function performSearch() { wiki.performSearch(); }
function scanRepository() { wiki.scanRepository(); }
