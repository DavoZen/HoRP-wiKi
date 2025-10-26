class SecureHoRPWiki {
    constructor() {
        this.repoOwner = 'pisdukblaty';
        this.repoName = 'HoRP-wiKi';
        this.branch = 'main';
        this.baseUrl = `https://raw.githubusercontent.com/${this.repoOwner}/${this.repoName}/${this.branch}`;
        this.apiBaseUrl = `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents`;
        
        // Налаштування OAuth (замініть на свої)
        this.oauthConfig = {
            clientId: 'YOUR_GITHUB_OAUTH_CLIENT_ID',
            redirectUri: window.location.origin + window.location.pathname,
            scope: 'user:email,public_repo',
            state: this.generateState()
        };
        
        this.pages = [];
        this.users = new Map();
        this.currentUser = null;
        this.currentTheme = localStorage.getItem('wiki-theme') || 'light';
        
        this.init();
    }

    async init() {
        console.log('🏁 Ініціалізація захищеної HoRP-wiKi...');
        
        this.setupTheme();
        this.setupEventListeners();
        this.checkAuthState();
        await this.loadData();
        this.updateUI();
        
        console.log('✅ HoRP-wiKi готовий до роботи');
    }

    // Система авторизації
    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    startGitHubAuth() {
        const authUrl = `https://github.com/oauth/authorize?` +
            `client_id=${this.oauthConfig.clientId}&` +
            `redirect_uri=${encodeURIComponent(this.oauthConfig.redirectUri)}&` +
            `scope=${encodeURIComponent(this.oauthConfig.scope)}&` +
            `state=${this.oauthConfig.state}`;
        
        localStorage.setItem('oauth_state', this.oauthConfig.state);
        window.location.href = authUrl;
    }

    async handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const storedState = localStorage.getItem('oauth_state');

        if (code && state === storedState) {
            try {
                await this.exchangeCodeForToken(code);
                // Видаляємо параметри з URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Помилка авторизації:', error);
                this.showNotification('Помилка авторизації', 'error');
            }
        }
    }

    async exchangeCodeForToken(code) {
        // У реальному додатку тут буде запит до вашого сервера
        // Для демонстрації використовуємо імітацію
        const mockUser = {
            id: Math.random().toString(36).substr(2, 9),
            login: 'demo-user',
            name: 'Demo User',
            avatar_url: '',
            email: 'demo@example.com',
            role: 'user'
        };

        this.currentUser = mockUser;
        localStorage.setItem('currentUser', JSON.stringify(mockUser));
        this.showNotification('Успішна авторизація!', 'success');
        this.updateUI();
    }

    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
        
        this.handleOAuthCallback();
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('oauth_state');
        this.showNotification('Ви вийшли з системи', 'info');
        this.updateUI();
    }

    // Ролі та дозволи
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        const permissions = {
            'admin': ['read', 'write', 'delete', 'manage_users', 'manage_content'],
            'editor': ['read', 'write', 'delete_own'],
            'user': ['read', 'write_own', 'edit_own']
        };
        
        return permissions[this.currentUser.role]?.includes(permission) || false;
    }

    canEditArticle(article) {
        if (!this.currentUser) return false;
        if (this.hasPermission('manage_content')) return true;
        if (this.hasPermission('edit_own') && article.author === this.currentUser.login) return true;
        return false;
    }

    canDeleteArticle(article) {
        if (!this.currentUser) return false;
        if (this.hasPermission('delete')) return true;
        if (this.hasPermission('delete_own') && article.author === this.currentUser.login) return true;
        return false;
    }

    // Завантаження даних
    async loadData() {
        console.log('🌐 Завантаження даних...');
        
        try {
            if (this.loadFromCache()) {
                console.log('📂 Дані завантажено з кешу');
                return;
            }

            await this.scanRepository();
            await this.loadUsers();
            this.cacheData();
            
        } catch (error) {
            console.error('❌ Помилка завантаження:', error);
            this.showError('Не вдалося завантажити дані');
        }
    }

    async scanRepository() {
        console.log('🔍 Сканування репозиторію...');
        
        try {
            const contents = await this.fetchGitHubContents('pages');
            this.pages = await this.buildPagesList(contents, 'pages');
            console.log(`✅ Знайдено ${this.pages.length} сторінок`);
            
        } catch (error) {
            console.error('❌ Помилка сканування:', error);
            this.pages = [];
        }
    }

    async loadUsers() {
        // У реальному додатку тут буде завантаження користувачів з бази даних
        // Для демонстрації використовуємо мок-дані
        this.users.set('admin', {
            id: '1',
            login: 'admin',
            name: 'Адміністратор',
            role: 'admin',
            articlesCount: 0,
            joinedAt: new Date('2024-01-01')
        });
        
        this.users.set('demo-user', {
            id: '2',
            login: 'demo-user',
            name: 'Demo User',
            role: 'user',
            articlesCount: 0,
            joinedAt: new Date()
        });
    }

    // UI Management
    updateUI() {
        this.updateUserInterface();
        this.updateStats();
        this.updateSidebar();
        this.updateMainPage();
    }

    updateUserInterface() {
        const userMenu = document.getElementById('userMenu');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const profileBtn = document.getElementById('profileBtn');
        const createArticleBtn = document.getElementById('createArticleBtn');
        const myArticlesBtn = document.getElementById('myArticlesBtn');
        const adminSection = document.getElementById('adminSection');
        const authPromo = document.getElementById('authPromo');

        if (this.currentUser) {
            // Оновлюємо інформацію про користувача
            document.getElementById('userName').textContent = this.currentUser.name || this.currentUser.login;
            document.getElementById('userRole').textContent = this.getRoleDisplayName(this.currentUser.role);
            document.getElementById('userAvatar').textContent = (this.currentUser.name || this.currentUser.login).charAt(0).toUpperCase();
            
            // Показуємо кнопки для авторизованих користувачів
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'block';
            profileBtn.style.display = 'block';
            createArticleBtn.style.display = 'block';
            myArticlesBtn.style.display = 'block';
            
            // Ховаємо промо авторизації
            if (authPromo) authPromo.style.display = 'none';

            // Показуємо адмін-панель для адміністраторів
            if (this.hasPermission('manage_users')) {
                adminSection.style.display = 'block';
            }
        } else {
            // Скидаємо інтерфейс для гостя
            document.getElementById('userName').textContent = 'Гість';
            document.getElementById('userRole').textContent = 'Не авторизований';
            document.getElementById('userAvatar').textContent = '👤';
            
            loginBtn.style.display = 'block';
            logoutBtn.style.display = 'none';
            profileBtn.style.display = 'none';
            createArticleBtn.style.display = 'none';
            myArticlesBtn.style.display = 'none';
            adminSection.style.display = 'none';
            
            if (authPromo) authPromo.style.display = 'block';
        }
    }

    getRoleDisplayName(role) {
        const roles = {
            'admin': 'Адміністратор',
            'editor': 'Редактор',
            'user': 'Користувач'
        };
        return roles[role] || 'Користувач';
    }

    // Статті та редагування
    async createArticle(formData) {
        if (!this.currentUser) {
            this.showNotification('Спочатку увійдіть в систему', 'error');
            return false;
        }

        try {
            const article = {
                title: formData.title,
                path: formData.path,
                category: formData.category,
                content: formData.content,
                author: this.currentUser.login,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // У реальному додатку тут буде відправка на сервер
            // Для демонстрації додаємо локально
            this.pages.push(article);
            this.cacheData();
            
            this.showNotification('Стаття успішно створена!', 'success');
            this.closeCreateArticleModal();
            this.showSection('my-articles');
            
            return true;
        } catch (error) {
            console.error('Помилка створення статті:', error);
            this.showNotification('Помилка створення статті', 'error');
            return false;
        }
    }

    async updateArticle(formData) {
        if (!this.currentUser) {
            this.showNotification('Спочатку увійдіть в систему', 'error');
            return false;
        }

        try {
            const articleIndex = this.pages.findIndex(p => p.path === formData.path);
            if (articleIndex === -1) {
                throw new Error('Статтю не знайдено');
            }

            const article = this.pages[articleIndex];
            
            // Перевіряємо права доступу
            if (!this.canEditArticle(article)) {
                this.showNotification('У вас немає прав для редагування цієї статті', 'error');
                return false;
            }

            // Оновлюємо статтю
            this.pages[articleIndex] = {
                ...article,
                title: formData.title,
                content: formData.content,
                updatedAt: new Date().toISOString()
            };

            this.cacheData();
            this.showNotification('Стаття успішно оновлена!', 'success');
            this.closeEditArticleModal();
            this.loadPage(formData.path);
            
            return true;
        } catch (error) {
            console.error('Помилка оновлення статті:', error);
            this.showNotification('Помилка оновлення статті', 'error');
            return false;
        }
    }

    async deleteArticle(articlePath) {
        if (!this.currentUser) {
            this.showNotification('Спочатку увійдіть в систему', 'error');
            return false;
        }

        const article = this.pages.find(p => p.path === articlePath);
        if (!article) {
            this.showNotification('Статтю не знайдено', 'error');
            return false;
        }

        if (!this.canDeleteArticle(article)) {
            this.showNotification('У вас немає прав для видалення цієї статті', 'error');
            return false;
        }

        if (!confirm('Ви впевнені, що хочете видалити цю статтю?')) {
            return false;
        }

        try {
            this.pages = this.pages.filter(p => p.path !== articlePath);
            this.cacheData();
            this.showNotification('Стаття успішно видалена', 'success');
            this.showSection('my-articles');
            return true;
        } catch (error) {
            console.error('Помилка видалення статті:', error);
            this.showNotification('Помилка видалення статті', 'error');
            return false;
        }
    }

    getMyArticles() {
        if (!this.currentUser) return [];
        return this.pages.filter(article => article.author === this.currentUser.login);
    }

    // Допоміжні методи
    showNotification(message, type = 'info') {
        // Створюємо сповіщення
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // Додаємо стилі для сповіщень
        if (!document.querySelector('.notification-styles')) {
            const styles = document.createElement('style');
            styles.className = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 3000;
                    animation: slideInRight 0.3s ease;
                }
                .notification-content {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 1rem;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                .notification-success { border-left: 4px solid #28a745; }
                .notification-error { border-left: 4px solid #dc3545; }
                .notification-info { border-left: 4px solid #17a2b8; }
                .notification-warning { border-left: 4px solid #ffc107; }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Автоматичне видалення через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    setupEventListeners() {
        // Закриття модальних вікон при кліку на затемнення
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });

        // Закриття випадаючого меню при кліку поза ним
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('userMenu');
            const userDropdown = document.getElementById('userDropdown');
            if (!userMenu.contains(e.target) && userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        });
    }

    // Модальні вікна
    showLoginModal() {
        document.getElementById('loginModal').classList.add('show');
    }

    closeLoginModal() {
        document.getElementById('loginModal').classList.remove('show');
    }

    showCreateArticleModal() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }
        document.getElementById('createArticleModal').classList.add('show');
    }

    closeCreateArticleModal() {
        document.getElementById('createArticleModal').classList.remove('show');
        document.getElementById('createArticleForm').reset();
    }

    showEditArticleModal(article) {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }

        if (!this.canEditArticle(article)) {
            this.showNotification('У вас немає прав для редагування цієї статті', 'error');
            return;
        }

        document.getElementById('editArticlePath').value = article.path;
        document.getElementById('editArticleTitle').value = article.title;
        document.getElementById('editArticleContent').value = article.content;
        document.getElementById('editArticleModal').classList.add('show');
    }

    closeEditArticleModal() {
        document.getElementById('editArticleModal').classList.remove('show');
        document.getElementById('editArticleForm').reset();
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // Інші методи (loadPage, searchPages, etc.) залишаються аналогічними попередній версії
    // Додамо тільки оновлені методи для відображення авторів та кнопок дій

    displayArticle(page, content) {
        document.getElementById('articleTitle').textContent = page.title;
        this.updateBreadcrumbs(page);
        
        document.getElementById('articleModified').textContent = `Востаннє редагувалося: ${new Date().toISOString().split('T')[0]}`;
        
        // Відображаємо автора
        const authorElement = document.getElementById('articleAuthor');
        if (page.author) {
            authorElement.innerHTML = `
                <div class="author-avatar">${page.author.charAt(0).toUpperCase()}</div>
                <div class="author-name">Автор: ${page.author}</div>
            `;
        } else {
            authorElement.innerHTML = '';
        }

        // Додаємо кнопки дій
        const actionsElement = document.getElementById('articleActions');
        actionsElement.innerHTML = '';

        if (this.canEditArticle(page)) {
            actionsElement.innerHTML += `
                <button class="action-btn edit" onclick="wiki.showEditArticleModal(${JSON.stringify(page).replace(/"/g, '&quot;')})">
                    ✏️ Редагувати
                </button>
            `;
        }

        if (this.canDeleteArticle(page)) {
            actionsElement.innerHTML += `
                <button class="action-btn delete" onclick="wiki.deleteArticle('${page.path}')">
                    🗑️ Видалити
                </button>
            `;
        }

        actionsElement.innerHTML += `
            <button class="action-btn" onclick="wiki.shareArticle()">📤 Поділитися</button>
        `;

        const htmlContent = this.convertMarkdownToHtml(content);
        document.getElementById('articleContent').innerHTML = htmlContent;
        
        this.updateArticleInfo(page);
    }

    updateMyArticlesPage() {
        const container = document.getElementById('myArticlesList');
        
        if (!this.currentUser) {
            container.innerHTML = `
                <div class="auth-required">
                    <p>Увійдіть, щоб переглянути свої статті</p>
                    <button class="auth-btn" onclick="wiki.showLoginModal()">Увійти через GitHub</button>
                </div>
            `;
            return;
        }

        const myArticles = this.getMyArticles();
        
        if (myArticles.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>📝 У вас ще немає статей</h3>
                    <p>Створіть свою першу статтю!</p>
                    <button class="auth-btn" onclick="wiki.showCreateArticleModal()">Створити статтю</button>
                </div>
            `;
            return;
        }

        container.innerHTML = myArticles.map(article => `
            <div class="article-card">
                <div class="article-header">
                    <h3>${article.title}</h3>
                    <div class="article-meta">
                        <span>Категорія: ${article.category}</span>
                        <span>Створено: ${new Date(article.createdAt).toLocaleDateString('uk-UA')}</span>
                    </div>
                </div>
                <div class="article-actions">
                    <button class="action-btn" onclick="wiki.loadPage('${article.path}')">👀 Переглянути</button>
                    <button class="action-btn edit" onclick="wiki.showEditArticleModal(${JSON.stringify(article).replace(/"/g, '&quot;')})">✏️ Редагувати</button>
                    <button class="action-btn delete" onclick="wiki.deleteArticle('${article.path}')">🗑️ Видалити</button>
                </div>
            </div>
        `).join('');
    }

    // Кешування та інші методи залишаються аналогічними
    cacheData() {
        const cache = {
            pages: this.pages,
            timestamp: Date.now()
        };
        localStorage.setItem('wikiCache', JSON.stringify(cache));
    }

    loadFromCache() {
        const cached = localStorage.getItem('wikiCache');
        if (cached) {
            try {
                const cache = JSON.parse(cached);
                if (Date.now() - cache.timestamp < 12 * 60 * 60 * 1000) {
                    this.pages = cache.pages;
                    return true;
                }
            } catch (error) {
                console.error('Помилка завантаження кешу:', error);
            }
        }
        return false;
    }

    // Решта методів (setupTheme, searchPages, convertMarkdownToHtml, etc.)
    // залишаються аналогічними попередній версії
}

// Глобальний екземпляр
const wiki = new SecureHoRPWiki();

// Глобальні функції для HTML
function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('show');
}

function showLoginModal() {
    wiki.showLoginModal();
}

function closeLoginModal() {
    wiki.closeLoginModal();
}

function startGitHubAuth() {
    wiki.startGitHubAuth();
}

function logout() {
    wiki.logout();
}

function showCreateArticleModal() {
    wiki.showCreateArticleModal();
}

function closeCreateArticleModal() {
    wiki.closeCreateArticleModal();
}

function createArticle(event) {
    event.preventDefault();
    const formData = {
        title: document.getElementById('articleTitleInput').value,
        path: document.getElementById('articlePath').value,
        category: document.getElementById('articleCategory').value,
        content: document.getElementById('articleContentInput').value
    };
    return wiki.createArticle(formData);
}

function showEditArticleModal(article) {
    wiki.showEditArticleModal(article);
}

function closeEditArticleModal() {
    wiki.closeEditArticleModal();
}

function updateArticle(event) {
    event.preventDefault();
    const formData = {
        path: document.getElementById('editArticlePath').value,
        title: document.getElementById('editArticleTitle').value,
        content: document.getElementById('editArticleContent').value
    };
    return wiki.updateArticle(formData);
}

function deleteArticle(path) {
    return wiki.deleteArticle(path);
}

// Інші глобальні функції залишаються незмінними
function performSearch() {
    wiki.performSearch();
}

function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

function showSection(section) {
    wiki.showSection(section);
}

function showRandomPage() {
    if (wiki.pages.length > 0) {
        const randomPage = wiki.pages[Math.floor(Math.random() * wiki.pages.length)];
        wiki.loadPage(randomPage.path);
    } else {
        alert('Ще немає статей для перегляду');
    }
}

function refreshData() {
    localStorage.removeItem('wikiCache');
    window.location.reload();
}
