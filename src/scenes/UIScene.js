import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // Initialize from localStorage
        const storedMute = localStorage.getItem('flappy_mute') === 'true';
        this.sound.mute = storedMute;

        // Mute button - Global
        const isMuted = this.sound.mute;
        this.muteBtn = this.add.text(280, 20, isMuted ? '🔇' : '🔊', {
            fontSize: '24px',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0).setDepth(9999); // Text is display only now

        // Create a large hit zone (40x40) for reliable clicking
        const hitZone = this.add.zone(280, 20, 40, 40)
            .setOrigin(0, 0) // Match text origin (default for text is top-left usually, but let's align carefully)
            .setScrollFactor(0)
            .setDepth(10000)
            .setInteractive({ useHandCursor: true });

        // Align zone to text center-ish if needed, or just cover the area
        // Text at 280, 20. Zone at 280, 20. size 40x40 covers it well.

        hitZone.on('pointerdown', (pointer, localX, localY, event) => {
            this.sound.mute = !this.sound.mute;
            localStorage.setItem('flappy_mute', this.sound.mute);
            this.updateMuteStatus(); // Immediate visual update
            if (event && event.stopPropagation) event.stopPropagation();
        });

        // Ensure this scene holds onto top display priority if needed, 
        // essentially just by being launched last or brought to top.
        this.scene.bringToTop();

        // Listen for wake events (in case other scenes sleep/wake this one)
        this.events.on('wake', () => {
            this.updateMuteStatus();
            this.scene.bringToTop();
        });

        // Failsafe: Force check every 500ms
        this.time.addEvent({
            delay: 500,
            callback: () => {
                this.updateMuteStatus();
                this.scene.bringToTop();
            },
            loop: true
        });
    }

    update() {
        this.updateMuteStatus(); // Continuous sync
        // Removed per-frame bringToTop to avoid overhead, relying on timer/events
    }

    updateMuteStatus() {
        const isMuted = this.sound.mute;
        const expectedText = isMuted ? '🔇' : '🔊';

        if (this.muteBtn.text !== expectedText) {
            this.muteBtn.setText(expectedText);
        }
    }
}
