import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading text
        const loadingText = this.add.text(160, 240, 'LOADING...', {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            color: '#00FF99',
            align: 'center'
        }).setOrigin(0.5);

        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x220033, 0.8);
        progressBox.fillRect(60, 270, 200, 30);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x9D00FF, 1);
            progressBar.fillRect(65, 275, 190 * value, 20);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load player sprites
        this.load.image('player_plane', 'assets/sprites/player_plane.png');
        this.load.image('player_paperplane', 'assets/sprites/player_paperplane.png');
        this.load.image('player_paperplane2', 'assets/sprites/player_paperplane2.png');
        this.load.image('player_destroyer', 'assets/sprites/destroyer.png');

        // Load coin
        this.load.image('coin', 'assets/sprites/coin.png');

        // Load backgrounds
        this.load.image('bg_sky_day', 'assets/backgrounds/bg_boat_quay.webp');
        this.load.image('bg_sky_evening', 'assets/backgrounds/bg_sky_evening.png');
        this.load.image('bg_orchid_road', 'assets/backgrounds/bg_orchid_road.webp');
        this.load.image('bg_flyer', 'assets/backgrounds/bg_flyer.webp');
        this.load.image('bg_fullerton', 'assets/backgrounds/bg_fullerton.webp');
        this.load.image('bg_siloso', 'assets/backgrounds/bg_siloso.webp');
        this.load.image('bg_china', 'assets/backgrounds/bg_china.webp');
        this.load.image('bg_merlion', 'assets/backgrounds/bg_merlion.webp');
        this.load.image('bg_esplanade', 'assets/backgrounds/bg_esplanade.webp');
        this.load.image('bg_supertrees', 'assets/backgrounds/bg_supertrees.webp');
        this.load.image('bg_marina', 'assets/backgrounds/bg_marina.webp');

        // Load obstacle assets
        this.load.image('obstacle_crane', 'assets/obstacles/obstacle_crane.png');
        this.load.image('obstacle_skyscraper', 'assets/obstacles/obstacle_skyscraper.png');
        this.load.image('obstacle_supertree', 'assets/obstacles/obstacle_supertree.png');

        // Load audio assets
        this.load.audio('jump', 'assets/audio/jump.wav');
        this.load.audio('coin', 'assets/audio/coin.wav');
        this.load.audio('crash', 'assets/audio/crash.wav');
        this.load.audio('levelup', 'assets/audio/levelup.wav');
        this.load.audio('score', 'assets/audio/score.wav');

        // Load logo
        this.load.image('logo', 'assets/backgrounds/logo1.png');
    }

    create() {
        // Create procedural graphics for missing assets
        this.createProceduralAssets();

        // Initialize game state
        this.registry.set('selectedCharacter', 'player_plane');
        this.registry.set('highScore', 0);
        this.registry.set('currentUser', null);

        // Start menu scene
        this.scene.start('MenuScene');
    }

    createProceduralAssets() {
        // Create night sky background
        const nightSky = this.add.graphics();
        nightSky.fillGradientStyle(0x1a0026, 0x1a0026, 0x220033, 0x220033, 1);
        nightSky.fillRect(0, 0, 320, 480);

        // Add stars
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 320;
            const y = Math.random() * 480;
            const size = Math.random() * 2;
            nightSky.fillStyle(0xFFFFFF, Math.random() * 0.8 + 0.2);
            nightSky.fillCircle(x, y, size);
        }

        nightSky.generateTexture('bg_sky_night', 320, 480);
        nightSky.destroy();

        // Create city skyline
        const cityDay = this.add.graphics();
        cityDay.fillStyle(0x4a4a6a, 1);

        // Draw building silhouettes
        for (let i = 0; i < 10; i++) {
            const x = i * 35;
            const height = 80 + Math.random() * 100;
            cityDay.fillRect(x, 480 - height, 30, height);
        }

        cityDay.generateTexture('bg_city_day', 320, 480);
        cityDay.destroy();

        // Create city skyline night (with neon lights)
        const cityNight = this.add.graphics();
        cityNight.fillStyle(0x0a0a1a, 1);

        for (let i = 0; i < 10; i++) {
            const x = i * 35;
            const height = 80 + Math.random() * 100;
            cityNight.fillRect(x, 480 - height, 30, height);

            // Add neon windows
            for (let j = 0; j < height / 15; j++) {
                const windowY = 480 - height + j * 15;
                const color = Math.random() > 0.5 ? 0x9D00FF : 0x00D9FF;
                cityNight.fillStyle(color, 0.8);
                cityNight.fillRect(x + 5, windowY + 3, 8, 8);
                cityNight.fillRect(x + 17, windowY + 3, 8, 8);
            }
        }

        cityNight.generateTexture('bg_city_night', 320, 480);
        cityNight.destroy();

        // Create ground
        const ground = this.add.graphics();
        ground.fillStyle(0x2a2a4a, 1);
        ground.fillRect(0, 0, 320, 60);

        // Add grid pattern
        ground.lineStyle(1, 0x9D00FF, 0.3);
        for (let i = 0; i < 320; i += 20) {
            ground.lineBetween(i, 0, i, 60);
        }
        for (let i = 0; i < 60; i += 20) {
            ground.lineBetween(0, i, 320, i);
        }

        ground.generateTexture('bg_ground', 320, 60);
        ground.destroy();

        // Create particle for smoke trail
        const particle = this.add.graphics();
        particle.fillStyle(0xFFFFFF, 0.6);
        particle.fillCircle(4, 4, 4);
        particle.generateTexture('particle', 8, 8);
        particle.destroy();
    }
}
