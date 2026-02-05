import Phaser from 'phaser';
import { firebaseService } from '../services/firebaseService.js';
import { MuteButton } from '../components/MuteButton.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.isLogin = true;
    }

    create() {
        // SECURITY: Kill any lingering UIScene from previous sessions
        if (this.scene.get('UIScene')) {
            this.scene.stop('UIScene');
        }

        // Add background
        this.add.image(160, 240, 'bg_sky_night').setAlpha(0.5);

        // Add title
        const title = this.add.text(160, 80, 'FULLERTON\nFLYER', {
            fontFamily: 'Orbitron',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#00FF99',
            align: 'center',
            stroke: '#9D00FF',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: title,
            y: 70,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Create auth form container
        this.createAuthForm();

        // FORCE LOGOUT to require fresh login
        // firebaseService.logout(); 
        // Note: calling logout here might be async but we don't strictly need to wait for it 
        // if we just ignore the auth state callback for navigation.
        // However, to be safe and clean:
        firebaseService.logout().catch(err => console.error('Logout error:', err));

        // Mute Button (Integrated Component)
        new MuteButton(this, 280, 20);
    }


    createAuthForm() {
        // Create HTML form
        const formContainer = document.createElement('div');
        formContainer.className = 'auth-form';
        formContainer.id = 'auth-form';

        formContainer.innerHTML = `
      <h2 id="form-title">Welcome</h2></h2>
      <input type="text" id="username" placeholder="Username" required />

      <button id="submit-btn">Enter</button>
      <div class="toggle-link" id="toggle-link">
        New user? <span style="color: #00FF99;">Register Here</span>
      </div>
      <div class="error-message" id="error-message"></div>
      <button id="admin-btn" style="margin-top: 15px; background: linear-gradient(135deg, #444, #666); font-size: 14px;">ADMIN DASHBOARD</button>
    `;

        document.body.appendChild(formContainer);

        // Add event listeners
        document.getElementById('submit-btn').addEventListener('click', () => this.handleSubmit());
        document.getElementById('toggle-link').addEventListener('click', () => this.toggleForm());
        document.getElementById('admin-btn').addEventListener('click', () => {
            window.location.href = '/admin.html';
        });

        // Allow Enter key to submit
        const usernameInput = document.getElementById('username');

        // Restrict input to letters, numbers, and underscores
        usernameInput.addEventListener('input', (e) => {
            const start = usernameInput.selectionStart;
            const end = usernameInput.selectionEnd;

            // Remove any characters that are NOT letters, numbers, or underscores
            usernameInput.value = usernameInput.value.replace(/[^a-zA-Z0-9_]/g, '');

            // Restore selection position (improves UX when editing in middle)
            usernameInput.setSelectionRange(start, end);
        });

        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSubmit();
        });

    }

    toggleForm() {
        this.isLogin = !this.isLogin;
        const formTitle = document.getElementById('form-title');
        const submitBtn = document.getElementById('submit-btn');
        const toggleLink = document.getElementById('toggle-link');
        const errorMessage = document.getElementById('error-message');

        errorMessage.textContent = '';

        if (this.isLogin) {
            formTitle.textContent = 'Enter';
            submitBtn.textContent = 'Enter';
            toggleLink.innerHTML = 'New user? <span style="color: #00FF99;">Register Here</span>';
        } else {
            formTitle.textContent = 'REGISTER';
            submitBtn.textContent = 'REGISTER';
            toggleLink.innerHTML = 'Already a User? <span style="color: #00FF99;">Enter Here</span>';
        }
    }

    async handleSubmit() {
        const username = document.getElementById('username')?.value.trim();
        const errorMessage = document.getElementById('error-message');
        const submitBtn = document.getElementById('submit-btn');

        errorMessage.textContent = '';

        // Validation
        if (!username) {
            errorMessage.textContent = 'Please enter a username';
            return;
        }

        // Show loading
        submitBtn.innerHTML = '<div class="loading"></div>';
        submitBtn.disabled = true;

        let result;
        if (this.isLogin) {
            result = await firebaseService.login(username);
        } else {
            result = await firebaseService.register(username);
        }

        if (result.success) {
            this.registry.set('currentUser', result.user);
            await this.loadUserData(result.user.uid);
            this.removeAuthForm();
            await this.checkDisclaimer();
        } else {
            errorMessage.textContent = result.error;
            submitBtn.textContent = this.isLogin ? 'LOGIN' : 'REGISTER';
            submitBtn.disabled = false;
        }
    }

    async checkDisclaimer() {
        console.log('Checking disclaimer config...');
        const result = await firebaseService.getDisclaimerConfig();
        console.log('Disclaimer config result:', result);

        if (result.success && result.config && result.config.enabled && result.config.text) {
            console.log('Showing disclaimer:', result.config.text);
            this.showDisclaimer(result.config.text, () => {
                this.scene.start('CharacterSelectScene');
            });
        } else {
            console.log('Skipping disclaimer - enabled:', result?.config?.enabled, 'text:', result?.config?.text);
            this.scene.start('CharacterSelectScene');
        }
    }

    showDisclaimer(text, onAccept) {
        const overlay = document.createElement('div');
        overlay.className = 'disclaimer-overlay';

        const box = document.createElement('div');
        box.className = 'disclaimer-box';

        const title = document.createElement('h2');
        title.className = 'disclaimer-title';
        title.textContent = 'DISCLAIMER';

        const content = document.createElement('div');
        content.className = 'disclaimer-content';
        content.textContent = text;

        const btn = document.createElement('button');
        btn.className = 'disclaimer-btn';
        btn.textContent = 'I UNDERSTAND';
        btn.onclick = () => {
            overlay.remove();
            onAccept();
        };

        box.appendChild(title);
        box.appendChild(content);
        box.appendChild(btn);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
    }

    async loadUserData(uid) {
        const profileResult = await firebaseService.getUserProfile(uid);
        if (profileResult.success) {
            this.registry.set('highScore', profileResult.data.highScore || 0);
            this.registry.set('username', profileResult.data.username);
        }
    }

    removeAuthForm() {
        const form = document.getElementById('auth-form');
        if (form) {
            form.remove();
        }
    }
}
