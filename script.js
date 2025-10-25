// HoRP-wiKi - Сучасна система з зимовою темою
class WikiEngine {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/main`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        this.pages = [];
        this.structure = {};
        this.lastScan = null;
        
        this.init();
    }

    async init() {
        this.createSnowflakes();
        this.updateVisitCounter();
        
        if (this.loadFromCache()) {
            this.buildNavigation();
            this.updateQuickStats();
            this.updateLastScanTime();
        }

        await this.scanRepository();
        this.handleInitialUrl();
        this.setupSearchSuggestions();
        this.createSecretButton();
    }

    createSnowflakes() {
        const snowContainer = document.getElementById('snow-container');
        if (!snowContainer) return;

        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                const snowflake = document.createElement('div');
                snowflake.className = 'snowflake';
                snowflake.textContent = '❄';
                snowflake.style.left = Math.random() * 100 + 'vw';
                snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's';
                snowflake.style.animationDelay = Math.random() * 5 + 's';
                snowContainer.appendChild(snowflake);

                setTimeout(() => {
                    snowflake.remove();
                }, 10000);
            }, i * 200);
        }

        setInterval(() => {
            this.createSnowflakes();
        }, 5000);
    }

    updateVisitCounter() {
        if (!localStorage.visitCount) localStorage.visitCount = 0;
        localStorage.visitCount++;
        document.getElementById('pageCounter').textContent = `Відвідувачів: ${localStorage.visitCount}`;
    }

    async scanRepository() {
        this.showLoading('navMenu', 'Сканування структури репозиторію...');
        
        try {
            const pagesData = await this.fetchGitHubContents('pages');
            this.structure = await this.buildStructure(pagesData, 'pages');
            this.pages = this.extractPagesFromStructure(this.structure);
            
            this.buildNavigation();
            this.updateQuickStats();
            this.lastScan = new Date();
            this.updateLastScanTime();
            
            this.cacheData();
            
        } catch (error) {
            console.error('Помилка сканування:', error);
            this.showError('navMenu', 'Помилка сканування GitHub');
        }
    }

    async fetchGitHubContents(path) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/${path}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Помилка отримання вмісту папки:', error);
            return [];
        }
    }

    async buildStructure(contents, currentPath) {
        const node = {
            name: currentPath.split('/').pop() || 'pages',
            path: currentPath,
            type: 'folder',
            children: []
        };

        for (const item of contents) {
            if (item.type === 'dir') {
                const subContents = await this.fetchGitHubContents(item.path);
                const subNode = await this.buildStructure(subContents, item.path);
                node.children.push(subNode);
            } else if (item.type === 'file' && item.name.endsWith('.md')) {
                node.children.push({
                    name: item.name.replace('.md', ''),
                    path: item.path,
                    type: 'file',
                    url: item.download_url,
                    size: item.size
                });
            }
        }

        return node;
    }

    extractPagesFromStructure(structure) {
        const pages = [];
        
        function traverse(node) {
            if (node.type === 'file') {
                pages.push({
                    title: node.name,
                    path: node.path.replace('pages/', '').replace('.md', ''),
                    url: node.url,
                    size: node.size
                });
            } else if (node.children) {
                node.children.forEach(traverse);
            }
        }
        
        traverse(structure);
        return pages;
    }

    buildNavigation() {
        const navElement = document.getElementById('navMenu');
        if (!navElement) return;
        
        navElement.innerHTML = this.buildNavigationHTML(this.structure);
        this.attachFolderEvents();
    }

    buildNavigationHTML(node, level = 0) {
        if (node.type === 'file') {
            return `
                <div class="nav-item nav-page" style="margin-left: ${level * 15}px">
                    <a href="#" onclick="wiki.loadPage('${node.path.replace('pages/', '').replace('.md', '')}')">
                        ${node.name}
                    </a>
                </div>
            `;
        }

        let html = '';
        if (level > 0) {
            html += `
                <div class="nav-folder" data-folder="${node.path}" style="margin-left: ${(level - 1) * 15}px">
                    ${node.name}
                </div>
                <div class="folder-contents" id="folder-${node.path.replace(/\//g, '-')}" style="display: none;">
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

    attachFolderEvents() {
        document.querySelectorAll('.nav-folder').forEach(folder => {
            folder.addEventListener('click', (e) => {
                e.preventDefault();
                const folderPath = folder.getAttribute('data-folder');
                const contents = document.getElementById(`folder-${folderPath.replace(/\//g, '-')}`);
                if (contents) {
                    contents.style.display = contents.style.display === 'none' ? 'block' : 'none';
                    folder.classList.toggle('expanded');
                }
            });
        });
    }

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
                    <a href="#" onclick="wiki.showMainPage()">Головна</a> › 
                    ${this.generateBreadcrumbs(pagePath)}
                </div>
                <div class="article-content">
                    ${html}
                </div>
                <div class="article-nav">
                    <small>Останнє оновлення: ${new Date().toLocaleDateString('uk-UA')}</small>
                </div>
            `;

            this.updateUrl(`?page=${pagePath}`);
            this.highlightSearchTerms();

        } catch (error) {
            document.getElementById('articleContent').innerHTML = `
                <div class="article-content">
                    <h1>Помилка 404</h1>
                    <p>Статтю "<b>${pagePath}</b>" не знайдено в репозиторії.</p>
                    <p><a href="#" onclick="wiki.showMainPage()">Повернутися на головну</a></p>
                </div>
            `;
        }
    }

    convertMarkdownToHtml(markdown) {
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre>$2</pre>')
            .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="' + this.baseUrl + '/$2" alt="$1" style="max-width:100%">')
            .replace(/\[(.*?)\]\((http.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
            .replace(/\[\[(.*?)\]\]/g, (match, pageName) => {
                const foundPage = this.pages.find(p => 
                    p.title === pageName || p.path === pageName
                );
                return foundPage ? 
                    `<a href="#" onclick="wiki.loadPage('${foundPage.path}')" class="wiki-link">${pageName}</a>` :
                    `<span class="broken-link" title="Сторінка не знайдена">${pageName}</span>`;
            })
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    generateBreadcrumbs(pagePath) {
        const parts = pagePath.split('/');
        let breadcrumbs = '';
        let currentPath = '';

        parts.forEach((part, index) => {
            currentPath += (currentPath ? '/' : '') + part;
            const isLast = index === parts.length - 1;

            if (isLast) {
                breadcrumbs += `<strong>${part}</strong>`;
            } else {
                breadcrumbs += `<a href="#" onclick="wiki.loadPage('${currentPath}')">${part}</a> › `;
            }
        });

        return breadcrumbs;
    }

    async performSearch() {
        const query = document.getElementById('searchBox')?.value || 
                     document.getElementById('mainSearchBox')?.value;

        if (!query?.trim()) {
            this.showMainPage();
            return;
        }

        this.showMainContent('searchResults');
        this.showLoading('searchResults', 'Пошук...');

        await new Promise(resolve => setTimeout(resolve, 600));

        const results = await this.searchPages(query);
        this.displaySearchResults(results, query);
    }

    async searchPages(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        const titleResults = this.pages.filter(page => 
            page.title.toLowerCase().includes(lowerQuery)
        );

        const contentResults = [];
        for (const page of this.pages.slice(0, 20)) {
            try {
                const response = await fetch(page.url);
                const content = await response.text();
                
                if (content.toLowerCase().includes(lowerQuery)) {
                    contentResults.push({
                        ...page,
                        excerpt: this.generateExcerpt(content, query),
                        matchType: 'content'
                    });
                }
            } catch (error) {
                console.error('Помилка пошуку в сторінці:', page.title);
            }
        }

        results.push(...titleResults.map(p => ({...p, matchType: 'title', excerpt: ''})));
        
        contentResults.forEach(contentResult => {
            if (!results.some(r => r.path === contentResult.path)) {
                results.push(contentResult);
            }
        });

        return results.sort((a, b) => {
            if (a.matchType === 'title' && b.matchType !== 'title') return -1;
            if (a.matchType !== 'title' && b.matchType === 'title') return 1;
            return 0;
        });
    }

    generateExcerpt(content, query) {
        const lowerContent = content.toLowerCase();
        const lowerQuery = query.toLowerCase();
        const index = lowerContent.indexOf(lowerQuery);
        
        if (index === -1) return content.substring(0, 150) + '...';
        
        const start = Math.max(0, index - 50);
        const end = Math.min(content.length, index + 100);
        let excerpt = content.substring(start, end);
        
        const regex = new RegExp(`(${this.escapeRegExp(query)})`, 'gi');
        excerpt = excerpt.replace(regex, '<span class="highlight">$1</span>');
        
        return (start > 0 ? '...' : '') + excerpt + (end < content.length ? '...' : '');
    }

    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    displaySearchResults(results, query) {
        let html = `
            <div class="article-content">
                <h1>Результати пошуку для "${query}"</h1>
                <p>Знайдено: ${results.length} результатів</p>
        `;

        if (results.length === 0) {
            html += `
                <div class="search-result">
                    <h3>Нічого не знайдено</h3>
                    <p>Спробуйте:</p>
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
                    <div class="search-result" onclick="wiki.loadPage('${result.path}')">
                        <h3>${result.title}</h3>
                        ${result.excerpt ? `<div class="excerpt">${result.excerpt}</div>` : ''}
                        <small>Шлях: ${result.path}</small>
                    </div>
                `;
            });
        }

        html += '</div>';
        document.getElementById('searchResults').innerHTML = html;
        
        this.updateUrl(`?search=${encodeURIComponent(query)}`);
    }

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
                <div class="search-result" onclick="wiki.loadPage('${page.path}')">
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
                    <p><strong>Автоматичне сканування:</strong> Увімкнено</p>
                    <p><strong>Динамічна структура:</strong> Активна</p>
                    <p><a href="https://github.com/${this.repoOwner}/${this.repoName}" target="_blank">Редагувати на GitHub</a></p>
                </div>
            </div>
        `;
        
        document.getElementById('searchResults').innerHTML = html;
    }

    countFolders(node) {
        if (node.type !== 'folder') return 0;
        let count = 1;
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
        this.updateUrl('?');
    }

    showMainContent(contentId) {
        document.querySelectorAll('.main-content').forEach(el => {
            el.classList.add('hidden');
        });
        const element = document.getElementById(contentId);
        if (element) {
            element.classList.remove('hidden');
        }
    }

    showLoading(elementId, message = 'Завантаження...') {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div class="loading">
                    ${message}
                </div>
            `;
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = `
                <div style="color: #ff6b6b; text-align: center; padding: 20px;">
                    ${message}
                </div>
            `;
        }
    }

    updateQuickStats() {
        const element = document.getElementById('quickStats');
        if (element) {
            element.innerHTML = `
                <strong>${this.pages.length}</strong> сторінок у <strong>${this.countFolders(this.structure)}</strong> категоріях<br>
                <small>Структура оновлена: ${this.lastScan ? this.lastScan.toLocaleTimeString('uk-UA') : 'щойно'}</small>
            `;
        }
    }

    updateLastScanTime() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = 
                `Останнє оновлення: ${this.lastScan ? this.lastScan.toLocaleString('uk-UA') : '-'}`;
        }
    }

    showRandomPage() {
        if (this.pages.length > 0) {
            const randomPage = this.pages[Math.floor(Math.random() * this.pages.length)];
            this.loadPage(randomPage.path);
        } else {
            alert('Спочатку потрібно завантажити структуру!');
        }
    }

    cacheData() {
        const cache = {
            pages: this.pages,
            structure: this.structure,
            lastScan: this.lastScan
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
    }

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

    updateUrl(params) {
        history.pushState({}, '', params);
    }

    handleInitialUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page');
        const search = urlParams.get('search');

        if (search) {
            const searchBox = document.getElementById('mainSearchBox');
            if (searchBox) searchBox.value = search;
            setTimeout(() => this.performSearch(), 800);
        } else if (page) {
            this.loadPage(page);
        }
    }

    highlightSearchTerms() {
        const urlParams = new URLSearchParams(window.location.search);
        const search = urlParams.get('search');
        if (search) {
            setTimeout(() => {
                const elements = document.querySelectorAll('.article-content');
                elements.forEach(el => {
                    const regex = new RegExp(`(${this.escapeRegExp(search)})`, 'gi');
                    el.innerHTML = el.innerHTML.replace(regex, '<span class="highlight">$1</span>');
                });
            }, 100);
        }
    }

    setupSearchSuggestions() {
        const searchBox = document.getElementById('searchBox');
        const mainSearchBox = document.getElementById('mainSearchBox');
        const suggestions = document.getElementById('searchSuggestions');

        const setupBox = (box) => {
            if (!box) return;
            
            box.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                if (query.length < 2) {
                    if (suggestions) suggestions.style.display = 'none';
                    return;
                }

                const matchedPages = this.pages
                    .filter(page => page.title.toLowerCase().includes(query))
                    .slice(0, 5);

                if (matchedPages.length > 0 && suggestions) {
                    suggestions.innerHTML = matchedPages.map(page => 
                        `<div class="suggestion-item" onclick="wiki.selectSuggestion('${page.path}')">
                            ${page.title}
                        </div>`
                    ).join('');
                    suggestions.style.display = 'block';
                } else if (suggestions) {
                    suggestions.style.display = 'none';
                }
            });

            box.addEventListener('blur', () => {
                setTimeout(() => {
                    if (suggestions) suggestions.style.display = 'none';
                }, 200);
            });
        };

        setupBox(searchBox);
        setupBox(mainSearchBox);
    }

    selectSuggestion(path) {
        this.loadPage(path);
        const suggestions = document.getElementById('searchSuggestions');
        if (suggestions) suggestions.style.display = 'none';
        const searchBox = document.getElementById('searchBox');
        if (searchBox) searchBox.value = '';
        const mainSearchBox = document.getElementById('mainSearchBox');
        if (mainSearchBox) mainSearchBox.value = '';
    }

    createSecretButton() {
        const button = document.createElement('div');
        button.className = 'secret-button';
        button.title = 'Пасхалка!';
        button.addEventListener('click', () => {
            this.activateEasterEgg();
        });
        document.body.appendChild(button);
    }

    activateEasterEgg() {
        document.body.style.animation = 'rainbow 2s linear infinite';
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes rainbow {
                0% { filter: hue-rotate(0deg); }
                100% { filter: hue-rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            document.body.style.animation = '';
            style.remove();
        }, 5000);
    }
}

const wiki = new WikiEngine();

function showMainPage() { wiki.showMainPage(); }
function showAllPages() { wiki.showAllPages(); }
function showRandomPage() { wiki.showRandomPage(); }
function showStatistics() { wiki.showStatistics(); }
function performSearch() { wiki.performSearch(); }
function scanRepository() { wiki.scanRepository(); }
