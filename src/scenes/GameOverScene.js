import Phaser from 'phaser';
import { firebaseService } from '../services/firebaseService.js';
import { MuteButton } from '../components/MuteButton.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;

        // Idle state
        this.idleTimeout = 15000;
        this.lastInputTime = 0;
        this.isPaused = false;
        this.isFirstUpdate = true;
    }

    async create() {
        // SECURITY: Kill any lingering UIScene
        if (this.scene.get('UIScene')) {
            this.scene.stop('UIScene');
        }

        // Add background
        this.add.image(160, 240, 'bg_sky_night').setAlpha(0.5);

        // Game Over logo
        const gameOverLogo = this.add.image(160, 60, 'logo').setOrigin(0.5);

        // Force linear filtering for better quality when scaling
        gameOverLogo.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);

        // Responsive scaling: 60% of screen width (screen width is 320)
        const targetWidth = 320 * 0.6;
        const scale = targetWidth / gameOverLogo.width;
        gameOverLogo.setScale(scale);

        const username = this.registry.get('username') || 'Player';

        // Congratulations text
        this.add.text(160, 110, `Congratulations ${username}`, {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00FF99',
            align: 'center'
        }).setOrigin(0.5);

        // Score display
        this.add.text(160, 140, `Your Score : ${this.finalScore}`, {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(160, 170, `Level Reached : ${this.finalLevel}`, {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00D9FF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Update high score
        const currentUser = this.registry.get('currentUser');
        const currentHighScore = this.registry.get('highScore') || 0;
        let isNewHighScore = false;

        if (currentUser) {
            // Increment games played
            firebaseService.incrementGamesPlayed(currentUser.uid);

            if (this.finalScore > currentHighScore) {
                isNewHighScore = true;
                const result = await firebaseService.updateHighScore(currentUser.uid, this.finalScore);

                if (result.success && result.newHighScore) {
                    this.registry.set('highScore', this.finalScore);

                    // New high score text
                    const newHighScoreText = this.add.text(160, 200, '★ NEW HIGH SCORE! ★', {
                        fontFamily: 'Orbitron',
                        fontSize: '18px',
                        fontStyle: 'bold',
                        color: '#FFD700',
                        stroke: '#9D00FF',
                        strokeThickness: 4
                    }).setOrigin(0.5);

                    this.tweens.add({
                        targets: newHighScoreText,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 600,
                        yoyo: true,
                        repeat: -1
                    });
                }
            } else {
                this.add.text(160, 200, `High Score: ${currentHighScore}`, {
                    fontFamily: 'Orbitron',
                    fontSize: '16px',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5);
            }

            // Leaderboard
            await this.createLeaderboard();

            // Buttons
            this.createButtons();

            // Social Sharing
            this.createSocialButtons();
        }

        // Track input for idle detection
        this.input.on('pointerdown', () => this.resetIdleTimer());
        this.input.keyboard.on('keydown', () => this.resetIdleTimer());
        this.resetIdleTimer();

        // Mute Button (Integrated Component)
        // Position passed is 280, 20. Component shifts it to 260 internally for safety.
        new MuteButton(this, 280, 20);
    }

    async createLeaderboard() {
        const result = await firebaseService.getLeaderboard();

        let topScore = 0;
        if (result.success && result.leaderboard.length > 0) {
            topScore = result.leaderboard[0].highScore;
        }

        this.add.text(160, 230, `Top Flyer Score : ${topScore}`, {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#9D00FF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
    }

    createSocialButtons() {
        this.add.text(160, 310, 'SHARE SCORE', {
            fontFamily: 'Orbitron',
            fontSize: '14px',
            color: '#FFFFFF',
            shadow: { blur: 5, color: '#9D00FF', fill: true }
        }).setOrigin(0.5);

        const highScore = this.registry.get('highScore') || 0;

        const shareData = {
            title: 'Fullerton Flyer',
            text: `I just scored ${this.finalScore} (Personal Best: ${highScore}) in Fullerton Flyer! Can you beat me?`,
            url: window.location.origin
        };

        // Handle localhost URL for better compatibility
        if (shareData.url.includes('localhost') || shareData.url.includes('127.0.0.1')) {
            shareData.url = 'https://fullertonflyer.com';
        }

        // Shared Button Creator Helper
        const btnSize = 35;
        const halfSize = btnSize / 2;

        const createBtn = (x, text, config, url, isCopy = false) => {
            const container = this.add.container(x, 350);

            // Background
            const bg = this.add.graphics();
            if (config.gradient) {
                bg.fillGradientStyle(config.gradient[0], config.gradient[1], config.gradient[2], config.gradient[3], 1, 1, 1, 1);
            } else {
                bg.fillStyle(config.color, 1);
            }
            bg.fillRoundedRect(-halfSize, -halfSize, btnSize, btnSize, 8);

            // White Border
            bg.lineStyle(2, 0xFFFFFF, 1);
            bg.strokeRoundedRect(-halfSize, -halfSize, btnSize, btnSize, 8);

            container.add(bg);

            // Icon/Text
            const icon = this.add.text(0, 0, text, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: '#FFFFFF',
                fontStyle: config.bold ? 'bold' : 'normal'
            }).setOrigin(0.5).setPadding(0, 2);
            container.add(icon);

            // Interaction
            const hitArea = new Phaser.Geom.Rectangle(-halfSize, -halfSize, btnSize, btnSize);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            container.on('pointerup', () => {
                if (isCopy) {
                    const copyText = `${shareData.text}\n${shareData.url}`;
                    navigator.clipboard.writeText(copyText).then(() => {
                        icon.setText('✓');
                        this.time.delayedCall(1000, () => icon.setText(text));
                    });
                } else if (url) {
                    window.open(url, '_blank');
                }
            });

            container.on('pointerover', () => {
                this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
            });
            container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1.0, duration: 100 }));

            return container;
        };

        // Web Share API (Mobile/Native) - Main Button + Copy
        if (navigator.share) {
            // 1. Native Share Button (Shifted Left)
            const container = this.add.container(130, 350);

            const bg = this.add.graphics();
            bg.fillGradientStyle(0x9D00FF, 0x00D9FF, 0x9D00FF, 0x00D9FF, 1, 1, 1, 1);
            bg.fillRoundedRect(-50, -20, 100, 40, 10); // Slightly smaller width (100)
            bg.lineStyle(2, 0xFFFFFF, 1);
            bg.strokeRoundedRect(-50, -20, 100, 40, 10);
            container.add(bg);

            const text = this.add.text(0, 0, 'SHARE', {
                fontFamily: 'Orbitron',
                fontSize: '16px',
                fontStyle: 'bold',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            container.add(text);

            const hitArea = new Phaser.Geom.Rectangle(-50, -20, 100, 40);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

            container.on('pointerup', async () => {
                try {
                    const sharePayload = {
                        title: shareData.title,
                        text: shareData.text,
                        url: shareData.url
                    };
                    await navigator.share(sharePayload);
                } catch (err) {
                    console.log('Share failed:', err);
                }
            });

            container.on('pointerover', () => {
                this.tweens.add({ targets: container, scale: 1.1, duration: 100 });
                bg.clear();
                bg.fillGradientStyle(0x00FF99, 0x00D9FF, 0x00FF99, 0x00D9FF, 1, 1, 1, 1);
                bg.fillRoundedRect(-50, -20, 100, 40, 10);
                bg.strokeRoundedRect(-50, -20, 100, 40, 10);
            });
            container.on('pointerout', () => {
                this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
                bg.clear();
                bg.fillGradientStyle(0x9D00FF, 0x00D9FF, 0x9D00FF, 0x00D9FF, 1, 1, 1, 1);
                bg.fillRoundedRect(-50, -20, 100, 40, 10);
                bg.strokeRoundedRect(-50, -20, 100, 40, 10);
            });

            // 2. Copy Button (Shifted Right)
            createBtn(220, '📋', { gradient: [0x9D00FF, 0x00D9FF, 0x9D00FF, 0x00D9FF] }, null, true);

            return;
        }

        // --- FALLBACK (Desktop/Non-supporting browsers) ---
        // Layout: 5 buttons centered
        const btnCount = 5;
        const spacing = 45;
        const totalWidth = (btnCount - 1) * spacing;
        const startX = 160 - (totalWidth / 2);

        // 1. Twitter
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        createBtn(startX, '𝕏', { color: 0x000000 }, twitterUrl);

        // 2. Facebook
        const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}&quote=${encodeURIComponent(shareData.text)}`;
        createBtn(startX + spacing, 'f', { color: 0x1877F2, bold: true }, fbUrl);

        // 3. WhatsApp
        const waUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;
        createBtn(startX + spacing * 2, '💬', { color: 0x25D366 }, waUrl);

        // 4. Reddit
        const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareData.url)}&title=${encodeURIComponent(shareData.text)}`;
        createBtn(startX + spacing * 3, '👽', { color: 0xFF4500 }, redditUrl);

        // 5. Copy Link
        createBtn(startX + spacing * 4, '📋', { color: 0x666666 }, null, true);
    }
    createButtons() {
        // Retry button
        const retryButton = this.add.text(160, 400, 'RETRY', {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            backgroundColor: '#00FF99',
            padding: { x: 40, y: 12 }
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.retry())
            .on('pointerover', () => {
                retryButton.setBackgroundColor('#9D00FF');
                retryButton.setScale(1.1);
            })
            .on('pointerout', () => {
                retryButton.setBackgroundColor('#00FF99');
                retryButton.setScale(1);
            });

        // Log Out button
        const logoutButton = this.add.text(160, 445, 'LOG OUT', {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00D9FF',
            backgroundColor: '#220033',
            padding: { x: 30, y: 10 }
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleLogout())
            .on('pointerover', () => {
                logoutButton.setColor('#FF3366');
                logoutButton.setScale(1.05);
            })
            .on('pointerout', () => {
                logoutButton.setColor('#00D9FF');
                logoutButton.setScale(1);
            });

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-SPACE', () => this.retry());
        this.input.keyboard.on('keydown-ENTER', () => this.retry());
        this.input.keyboard.on('keydown-ESC', () => this.handleLogout());
    }

    retry() {
        this.scene.start('CharacterSelectScene');
    }

    async handleLogout() {
        await firebaseService.logout();
        this.registry.set('currentUser', null);
        this.scene.start('MenuScene');
    }

    update(time, delta) {
        if (this.isFirstUpdate) {
            this.lastInputTime = time;
            this.isFirstUpdate = false;
        }

        if (this.isPaused) return;

        // Check idle timeout
        if (time - this.lastInputTime > this.idleTimeout) {
            this.showIdleOverlay();
        }
    }

    showIdleOverlay() {
        if (this.isPaused) return;
        this.isPaused = true;

        // Create overlay
        const overlay = this.add.rectangle(160, 240, 320, 480, 0x000000, 0.7).setDepth(1000);

        const idleText = this.add.text(160, 200, 'ARE YOU THERE?', {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1001);

        const tapText = this.add.text(160, 260, 'Tap to continue', {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00D9FF'
        }).setOrigin(0.5).setDepth(1001);

        // Resume on input
        const resumeHandler = () => {
            overlay.destroy();
            idleText.destroy();
            tapText.destroy();
            this.isPaused = false;
            this.resetIdleTimer();

            this.input.off('pointerdown', resumeHandler);
            this.input.keyboard.off('keydown', resumeHandler);
        };

        // Small delay
        this.time.delayedCall(100, () => {
            this.input.once('pointerdown', resumeHandler);
            this.input.keyboard.once('keydown', resumeHandler);
        });
    }

    resetIdleTimer() {
        this.lastInputTime = this.time.now;
    }
}
