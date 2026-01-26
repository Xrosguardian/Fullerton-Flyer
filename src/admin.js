import { firebaseService } from './services/firebaseService.js';
import { injectSpeedInsights } from '@vercel/speed-insights';

injectSpeedInsights();

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const adminEmail = document.getElementById('admin-email');
const adminPassword = document.getElementById('admin-password');
const loginBtn = document.getElementById('login-btn');
const authError = document.getElementById('auth-error');
const exportBtn = document.getElementById('export-btn');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const backToGameBtn = document.getElementById('back-to-game-btn');
const usersTbody = document.getElementById('users-tbody');
const totalUsersEl = document.getElementById('total-users');
const totalGamesEl = document.getElementById('total-games');
const highestScoreEl = document.getElementById('highest-score');

// Disclaimer Elements
const disclaimerSettingsBtn = document.getElementById('disclaimer-settings-btn');
const disclaimerSection = document.getElementById('disclaimer-section');
const disclaimerEnabledFn = document.getElementById('disclaimer-enabled');
const disclaimerTextFn = document.getElementById('disclaimer-text');
const saveDisclaimerBtn = document.getElementById('save-disclaimer-btn');
const cancelDisclaimerBtn = document.getElementById('cancel-disclaimer-btn');
const disclaimerMessage = document.getElementById('disclaimer-message');

let allUsers = [];

// Initialize
// FORCE LOGOUT when entering admin page
firebaseService.logout().then(() => {
    showAuth();
}).catch(console.error);

// Listen for subsequent auth changes (e.g. after clicking login)
firebaseService.onAuthStateChange((user) => {
    if (user) {
        showDashboard();
    } else {
        showAuth();
    }
});

// Event Listeners
loginBtn.addEventListener('click', handleLogin);
exportBtn.addEventListener('click', exportToCSV);
refreshBtn.addEventListener('click', loadUsers);
logoutBtn.addEventListener('click', handleLogout);
backToGameBtn.addEventListener('click', () => {
    window.location.href = '/';
});

// Disclaimer Listeners
disclaimerSettingsBtn.addEventListener('click', openDisclaimerSettings);
saveDisclaimerBtn.addEventListener('click', saveDisclaimerSettings);
cancelDisclaimerBtn.addEventListener('click', closeDisclaimerSettings);

adminEmail.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

adminPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
});

// Functions
async function handleLogin() {
    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    authError.textContent = '';

    if (!email || !password) {
        authError.textContent = 'Please enter email and password';
        return;
    }

    loginBtn.textContent = 'LOGGING IN...';
    loginBtn.disabled = true;

    const result = await firebaseService.login(email, password);

    if (result.success) {
        showDashboard();
    } else {
        authError.textContent = result.error;
        loginBtn.textContent = 'LOGIN';
        loginBtn.disabled = false;
    }
}

async function handleLogout() {
    await firebaseService.logout();
    showAuth();
}

function showAuth() {
    authSection.style.display = 'block';
    dashboardSection.style.display = 'none';
    adminEmail.value = '';
    adminPassword.value = '';
    authError.textContent = '';
    loginBtn.textContent = 'LOGIN';
    loginBtn.disabled = false;
}

function showDashboard() {
    authSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadUsers();
}

async function loadUsers() {
    usersTbody.innerHTML = '<tr><td colspan="4" class="loading-row">Loading...</td></tr>';

    const result = await firebaseService.getAllUsers();

    if (result.success) {
        allUsers = result.users;
        displayUsers(allUsers);
        updateStats(allUsers);
    } else {
        usersTbody.innerHTML = `<tr><td colspan="4" class="loading-row">Error: ${result.error}</td></tr>`;
    }
}

function displayUsers(users) {
    if (users.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="4" class="loading-row">No users found</td></tr>';
        return;
    }

    // Sort by high score descending
    const sortedUsers = [...users].sort((a, b) => (b.highScore || 0) - (a.highScore || 0));

    usersTbody.innerHTML = sortedUsers.map(user => `
    <tr>
      <td>${escapeHtml(user.username || 'N/A')}</td>
      <td>${escapeHtml(user.email || 'N/A')}</td>
      <td style="color: #00FF99; font-weight: bold;">${user.highScore || 0}</td>
      <td>${formatDate(user.createdAt)}</td>
    </tr>
  `).join('');
}

function updateStats(users) {
    totalUsersEl.textContent = users.length;

    const highestScore = users.reduce((max, user) => {
        return Math.max(max, user.highScore || 0);
    }, 0);

    const totalGames = users.reduce((sum, user) => {
        return sum + (user.gamesPlayed || 0);
    }, 0);

    highestScoreEl.textContent = highestScore;
    totalGamesEl.textContent = totalGames;
}

function exportToCSV() {
    if (allUsers.length === 0) {
        alert('No data to export');
        return;
    }

    // Create CSV content
    const headers = ['Username', 'Email', 'High Score', 'Created At'];
    const rows = allUsers.map(user => [
        user.username || 'N/A',
        user.email || 'N/A',
        user.highScore || 0,
        formatDate(user.createdAt)
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `flappybird_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';

    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (e) {
        return 'Invalid Date';
    }
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Disclaimer Functions
async function openDisclaimerSettings() {
    disclaimerSection.style.display = 'block';
    disclaimerMessage.textContent = 'Loading settings...';
    saveDisclaimerBtn.disabled = true;

    try {
        const result = await firebaseService.getDisclaimerConfig();
        if (result.success) {
            const config = result.config;
            disclaimerEnabledFn.checked = config.enabled;
            disclaimerTextFn.value = config.text || '';
            disclaimerMessage.textContent = '';
        } else {
            disclaimerMessage.textContent = 'Error loading settings: ' + result.error;
        }
    } catch (error) {
        disclaimerMessage.textContent = 'Error: ' + error.message;
    } finally {
        saveDisclaimerBtn.disabled = false;
    }
}

function closeDisclaimerSettings() {
    disclaimerSection.style.display = 'none';
    disclaimerMessage.textContent = '';
}

async function saveDisclaimerSettings() {
    const enabled = disclaimerEnabledFn.checked;
    const text = disclaimerTextFn.value.trim();

    saveDisclaimerBtn.textContent = 'SAVING...';
    saveDisclaimerBtn.disabled = true;

    const result = await firebaseService.updateDisclaimerConfig(enabled, text);

    if (result.success) {
        disclaimerMessage.textContent = 'Settings saved successfully!';
        setTimeout(() => {
            disclaimerMessage.textContent = '';
            closeDisclaimerSettings();
        }, 1500);
    } else {
        disclaimerMessage.textContent = 'Error saving settings: ' + result.error;
    }

    saveDisclaimerBtn.textContent = 'SAVE CHANGES';
    saveDisclaimerBtn.disabled = false;
}
