import Phaser from 'phaser';

export default class UIScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UIScene' });
    }

    create() {
        // Mute button - Global
        const isMuted = this.sound.mute;
        this.muteBtn = this.add.text(280, 20, isMuted ? '🔇' : '🔊', {
            fontSize: '24px',
            padding: { x: 5, y: 5 }
        }).setScrollFactor(0).setDepth(9999).setInteractive({ useHandCursor: true });

        this.muteBtn.on('pointerdown', () => {
            this.sound.mute = !this.sound.mute;
            this.muteBtn.setText(this.sound.mute ? '🔇' : '🔊');
        });

        // Ensure this scene holds onto top display priority if needed, 
        // essentially just by being launched last or brought to top.
        this.scene.bringToTop();
    }
}
