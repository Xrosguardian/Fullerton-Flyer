import Phaser from 'phaser';
import { firebaseService } from '../services/firebaseService.js';
import { MuteButton } from '../components/MuteButton.js';

export default class CharacterSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CharacterSelectScene' });
        this.characters = ['player_plane', 'player_paperplane', 'player_destroyer'];
        this.currentIndex = 0;
    }

    init() {
        this.idleTimeout = 15000; // 15 seconds
        this.lastInputTime = 0;
        this.isPaused = false;
        this.isFirstUpdate = true;
    }

    create() {
        // SECURITY: Kill any lingering UIScene
        if (this.scene.get('UIScene')) {
            this.scene.stop('UIScene');
        }

        // Backgrounds list
        const backgrounds = [
            'bg_sky_day', 'bg_orchid_road', 'bg_flyer', 'bg_fullerton',
            'bg_siloso', 'bg_china', 'bg_merlion', 'bg_esplanade',
            'bg_supertrees', 'bg_marina'
        ];
        let currentBgIndex = 0;

        // Create two backgrounds for cross-fading
        this.bg1 = this.add.image(160, 240, backgrounds[0]).setAlpha(0.6);
        this.scaleBackground(this.bg1);

        this.bg2 = this.add.image(160, 240, backgrounds[1]).setAlpha(0);
        this.scaleBackground(this.bg2);

        // Background cycling event
        this.time.addEvent({
            delay: 4000,
            callback: () => {
                currentBgIndex = (currentBgIndex + 1) % backgrounds.length;
                const nextBgKey = backgrounds[currentBgIndex];

                // Swap: bg2 becomes the new target, bg1 fades out
                this.bg2.setTexture(nextBgKey).setAlpha(0);
                this.scaleBackground(this.bg2);

                // Tween: fade in bg2, fade out bg1
                this.tweens.add({
                    targets: this.bg2,
                    alpha: 0.6,
                    duration: 1000
                });

                this.tweens.add({
                    targets: this.bg1,
                    alpha: 0,
                    duration: 1000,
                    onComplete: () => {
                        const temp = this.bg1;
                        this.bg1 = this.bg2;
                        this.bg2 = temp;
                    }
                });
            },
            loop: true
        });

        // Add subtle movement to the visible background
        this.tweens.add({
            targets: [this.bg1, this.bg2],
            x: 170,
            duration: 3000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Title
        this.add.text(160, 60, 'SELECT YOUR FLYER', {
            fontFamily: 'Orbitron',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#9D00FF',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Character display
        const backdrop = this.add.graphics();
        backdrop.fillStyle(0xFFFFFF, 0.8);
        backdrop.fillRoundedRect(80, 140, 160, 120, 15);

        this.characterSprite = this.add.image(160, 200, this.characters[this.currentIndex])
            .setScale(0.12);

        // Animate character
        this.tweens.add({
            targets: this.characterSprite,
            y: 190,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Character name
        this.characterName = this.add.text(160, 280, this.getCharacterName(0), {
            fontFamily: 'Orbitron',
            fontSize: '18px',
            color: '#00D9FF',
            align: 'center'
        }).setOrigin(0.5);

        // Left arrow
        const leftArrow = this.add.text(60, 200, '◀', {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#9D00FF'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.previousCharacter())
            .on('pointerover', () => leftArrow.setColor('#00FF99'))
            .on('pointerout', () => leftArrow.setColor('#9D00FF'));

        // Right arrow
        const rightArrow = this.add.text(260, 200, '▶', {
            fontFamily: 'Arial',
            fontSize: '40px',
            color: '#9D00FF'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.nextCharacter())
            .on('pointerover', () => rightArrow.setColor('#00FF99'))
            .on('pointerout', () => rightArrow.setColor('#9D00FF'));

        // Fly Now button
        const flyButton = this.add.text(160, 380, 'FLY NOW', {
            fontFamily: 'Orbitron',
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            backgroundColor: '#9D00FF',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.startGame())
            .on('pointerover', () => {
                flyButton.setBackgroundColor('#00FF99');
                flyButton.setScale(1.1);
            })
            .on('pointerout', () => {
                flyButton.setBackgroundColor('#9D00FF');
                flyButton.setScale(1);
            });

        // Keyboard controls
        this.input.keyboard.on('keydown-LEFT', () => this.previousCharacter());
        this.input.keyboard.on('keydown-RIGHT', () => this.nextCharacter());
        this.input.keyboard.on('keydown-ENTER', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());

        // Logout Button
        const logoutBtn = this.add.text(160, 440, 'LOGOUT', {
            fontFamily: 'Orbitron',
            fontSize: '14px',
            color: '#FF3366',
            align: 'center'
        }).setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.handleLogout())
            .on('pointerover', () => logoutBtn.setColor('#FFFFFF'))
            .on('pointerout', () => logoutBtn.setColor('#FF3366'));

        // Track input for idle detection
        this.input.on('pointerdown', () => this.resetIdleTimer());
        this.input.keyboard.on('keydown', () => this.resetIdleTimer());
        this.resetIdleTimer();

        // Mute Button (Integrated Component)
        // Position passed is 280, 20. Component shifts it to 260 internally for safety.
        new MuteButton(this, 280, 20);
    }

    async handleLogout() {
        await firebaseService.logout();
        this.scene.start('MenuScene');
    }

    previousCharacter() {
        this.currentIndex = (this.currentIndex - 1 + this.characters.length) % this.characters.length;
        this.updateCharacter();
    }

    nextCharacter() {
        this.currentIndex = (this.currentIndex + 1) % this.characters.length;
        this.updateCharacter();
    }

    updateCharacter() {
        this.characterSprite.setTexture(this.characters[this.currentIndex]);
        this.characterName.setText(this.getCharacterName(this.currentIndex));
    }

    getCharacterName(index) {
        const names = ['BO ENG', 'PURPLE GLIDER', 'AIR BOSS'];
        return names[index];
    }

    startGame() {
        this.registry.set('selectedCharacter', this.characters[this.currentIndex]);
        this.scene.start('GameScene');
    }

    scaleBackground(image) {
        const scale = 480 / image.height;
        image.setScale(scale);
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

        // Small delay to prevent immediate trigger if bubbling
        this.time.delayedCall(100, () => {
            this.input.once('pointerdown', resumeHandler);
            this.input.keyboard.once('keydown', resumeHandler);
        });
    }

    resetIdleTimer() {
        this.lastInputTime = this.time.now;
    }
}
