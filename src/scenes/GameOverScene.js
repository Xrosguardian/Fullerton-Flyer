import Phaser from 'phaser';
import { firebaseService } from '../services/firebaseService.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.finalLevel = data.level || 1;
    }

    async create() {
        // Add background
        this.add.image(160, 240, 'bg_sky_night').setAlpha(0.5);

        // Game Over title
        const gameOverText = this.add.text(160, 60, 'GAME OVER', {
            fontFamily: 'Orbitron',
            fontSize: '36px',
            fontStyle: 'bold',
            color: '#FF3366',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Pulse animation
        this.tweens.add({
            targets: gameOverText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Score display
        this.add.text(160, 120, `FINAL SCORE: ${this.finalScore}`, {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(160, 150, `LEVEL REACHED: ${this.finalLevel}`, {
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
                    const newHighScoreText = this.add.text(160, 180, '★ NEW HIGH SCORE! ★', {
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
                this.add.text(160, 180, `High Score: ${currentHighScore}`, {
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
        }
    }

    async createLeaderboard() {
        this.add.text(160, 220, 'TOP FLYERS', {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#9D00FF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        const result = await firebaseService.getLeaderboard();

        if (result.success) {
            if (result.leaderboard.length > 0) {
                const leaderboard = result.leaderboard.slice(0, 5); // Top 5

                leaderboard.forEach((user, index) => {
                    const y = 250 + index * 25;
                    const rank = index + 1;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

                    const entryText = `${medal} ${user.username}: ${user.highScore}`;

                    this.add.text(160, y, entryText, {
                        fontFamily: 'Orbitron',
                        fontSize: '12px',
                        color: rank <= 3 ? '#00FF99' : '#00D9FF',
                        stroke: '#000000',
                        strokeThickness: 2
                    }).setOrigin(0.5);
                });
            } else {
                this.add.text(160, 260, 'No leaderboard data', {
                    fontFamily: 'Orbitron',
                    fontSize: '12px',
                    color: '#666666'
                }).setOrigin(0.5);
            }
        } else {
            console.error('Leaderboard error:', result.error);
            this.add.text(160, 260, `Error: ${result.error}`, {
                fontFamily: 'Orbitron',
                fontSize: '12px',
                color: '#FF3366',
                wordWrap: { width: 300 }
            }).setOrigin(0.5);
        }
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
}
