import Phaser from 'phaser';
import { MuteButton } from '../components/MuteButton.js';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        // Game state
        this.score = 0;
        this.level = 1;
        this.gameSpeed = 160;
        this.obstacleTimer = 1000; // Start with a head start so the first pipe appears sooner
        this.obstacleInterval = 1600; // Adjusted for slower speed to keep pipe spacing similar
        this.isGameOver = false;
        this.isStarting = true;
        this.lastInputTime = 0;
        this.idleTimeout = 15000; // 15 seconds
        this.isPaused = false;
        this.isFirstUpdate = true;

        // Background state
        this.timeOfDay = 0; // 0 = day, 1 = evening, 2 = night
    }

    create() {
        // SECURITY: Kill any lingering UIScene
        if (this.scene.get('UIScene')) {
            this.scene.stop('UIScene');
        }

        // Get selected character
        const selectedCharacter = this.registry.get('selectedCharacter') || 'player_plane';

        // Create parallax backgrounds
        this.createBackgrounds();

        // Create ground
        this.createGround();

        // Create player (Centered to avoid wall collisions)
        this.player = this.physics.add.sprite(160, 240, selectedCharacter);
        this.player.setScale(0.08);
        // Set circular body (Radius 150 * 0.08 = 12px effective) - Scaled down for tighter collision
        this.player.setCircle(150);
        this.player.setCollideWorldBounds(true);

        // Create particle emitter for smoke trail (Updated for Phaser 3.60+)
        this.smokeParticles = this.add.particles(0, 0, 'particle', {
            follow: this.player,
            followOffset: { x: -20, y: 0 },
            speed: { min: 20, max: 50 },
            scale: { start: 1.2, end: 0.2 },
            alpha: { start: 0.9, end: 0 },
            lifespan: 800,
            frequency: 50,
            tint: [0x9D00FF, 0x00D9FF, 0x00FF99]
        });
        this.smokeEmitter = this.smokeParticles;

        // Create obstacle group
        this.obstacles = this.physics.add.group();

        // Create coin group
        this.coins = this.physics.add.group();

        // Create HUD
        this.createHUD();

        // Mute Button (Integrated Component)
        // Position passed is 280, 20. Component shifts it to 260 internally for safety.
        new MuteButton(this, 280, 20);

        // Input handling
        this.input.on('pointerdown', () => this.jump());
        this.input.keyboard.on('keydown-SPACE', () => this.jump());
        this.input.keyboard.on('keydown-UP', () => this.jump());

        // Collisions
        // Collisions
        this.physics.add.overlap(this.player, this.obstacles, this.hitObstacle, null, this);
        this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);

        // Track input for idle detection
        this.input.on('pointerdown', () => this.resetIdleTimer());
        this.input.keyboard.on('keydown', () => this.resetIdleTimer());

        this.resetIdleTimer();
        this.startCountdown();
    }

    createBackgrounds() {
        // Layer 0: Solid backing (to prevent transparency/gaps)
        this.add.rectangle(160, 240, 320, 480, 0x000000).setDepth(-10);

        // Layer 1: Sky (slowest)
        this.bgSky = this.add.tileSprite(160, 240, 320, 480, 'bg_sky_day');

        // Fit background height to screen, maintain aspect ratio
        // Fit background height to screen, maintain aspect ratio, BUT allow covering
        const bgTexture = this.textures.get('bg_sky_day').getSourceImage();
        if (bgTexture) {
            const scaleX = 320 / bgTexture.width;
            const scaleY = 480 / bgTexture.height;
            const scale = Math.max(scaleX, scaleY) * 1.02;
            this.bgSky.setTileScale(scale, scale);
        }



        // Layer 3: Ground will be created separately

        // Add dark overlay to improve sprite visibility (bg_marina etc are too bright)
        this.add.rectangle(160, 240, 320, 480, 0x000000, 0.5);
    }

    createGround() {
        // this.ground = this.add.tileSprite(160, 450, 320, 60, 'bg_ground');

        // Add ground collider
        this.groundCollider = this.add.rectangle(160, 480, 320, 20, 0x000000, 0);
        this.physics.add.existing(this.groundCollider, true);
        // Collider disabled in favor of manual check in update()
        // this.physics.add.collider(this.player, this.groundCollider, this.hitGround, null, this);
    }

    createHUD() {
        // Score text
        this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
            fontFamily: 'Orbitron',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);

        // Level text
        this.levelText = this.add.text(20, 50, 'LEVEL: 1', {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00D9FF',
            stroke: '#000000',
            strokeThickness: 4
        }).setScrollFactor(0).setDepth(100);


    }

    update(time, delta) {
        if (this.isFirstUpdate) {
            this.lastInputTime = time;
            this.isFirstUpdate = false;
        }

        if (this.isGameOver || this.isPaused || this.isStarting) return;

        // Manual Ground and Ceiling Check
        // Check if player hit ground (> 480) or hit world ceiling (blocked.up)
        // Adjusted to 480 since we removed the visual ground
        // Manual Ground and Ceiling Check
        // Check if player hit ground (blocked.down) or hit world ceiling (blocked.up)
        // Adjusted to check world bounds collision since setCollideWorldBounds is true
        if (this.player.body.blocked.down || this.player.body.blocked.up) {
            this.hitGround(this.player, null);
        }

        // Check idle timeout
        if (time - this.lastInputTime > this.idleTimeout) {
            this.showIdleOverlay();
            return;
        }

        // Update backgrounds (parallax effect)
        this.bgSky.tilePositionX += this.gameSpeed * delta / 1000 * 0.1;
        // this.bgCity.tilePositionX += this.gameSpeed * delta / 1000 * 0.3;
        // this.ground.tilePositionX += this.gameSpeed * delta / 1000;

        // Spawn obstacles
        this.obstacleTimer += delta;
        if (this.obstacleTimer > this.obstacleInterval) {
            this.spawnObstacle();
            this.obstacleTimer = 0;
        }

        // Move obstacles and coins
        this.obstacles.getChildren().forEach((obstacle) => {
            obstacle.x -= this.gameSpeed * delta / 1000;

            // Remove off-screen obstacles
            if (obstacle.x < -50) {
                // Award point for passing obstacle
                if (!obstacle.scored) {
                    this.addScore(1);
                    this.sound.play('score');
                    obstacle.scored = true;
                }
                obstacle.destroy();
            }
        });

        this.coins.getChildren().forEach((coin) => {
            coin.x -= this.gameSpeed * delta / 1000;

            // Remove off-screen coins
            if (coin.x < -30) {
                coin.destroy();
            }
        });

        // Rotate player based on velocity
        this.player.angle = Phaser.Math.Clamp(this.player.body.velocity.y * 0.05, -20, 45);
    }

    jump() {
        if (this.isGameOver || this.isPaused || this.isStarting) return;

        this.player.setVelocityY(-350);
        this.sound.play('jump');
        this.resetIdleTimer();
    }

    spawnObstacle() {
        const gapSize = 120;
        const minHeight = 80;
        const maxHeight = 320;
        const gapY = Phaser.Math.Between(minHeight + gapSize / 2, maxHeight);

        // Randomly select obstacle type
        const obstacleType = Phaser.Math.RND.pick(['obstacle_crane', 'obstacle_skyscraper', 'obstacle_supertree']);

        // Determine hitbox dimensions
        let widthFactor = 0.6;
        const heightFactor = 0.85;

        // Reduce hitbox for Super Tree to make it more forgiving
        if (obstacleType === 'obstacle_supertree') {
            widthFactor = 0.4;
        }

        const offsetX = (1 - widthFactor) / 2;
        const offsetY = (1 - heightFactor) / 2;

        // Top obstacle
        const topObstacle = this.obstacles.create(370, gapY - gapSize / 2, obstacleType);
        topObstacle.setOrigin(0.5, 1);
        topObstacle.setFlipY(true);
        topObstacle.body.allowGravity = false;
        topObstacle.body.setImmovable(true);
        // Scale note: Use actual height for scaling and add buffer to ensure overlap off-screen
        const topHeightNeeded = gapY - gapSize / 2 + 20; // +20px buffer to go off-screen
        topObstacle.setScale(1, topHeightNeeded / topObstacle.height);

        // Apply calculated hitbox size
        topObstacle.body.setSize(topObstacle.width * widthFactor, topObstacle.height * heightFactor);
        topObstacle.body.setOffset(topObstacle.width * offsetX, topObstacle.height * offsetY);
        topObstacle.scored = false;

        // Bottom obstacle
        const bottomObstacle = this.obstacles.create(370, gapY + gapSize / 2, obstacleType);
        bottomObstacle.setOrigin(0.5, 0);
        bottomObstacle.body.allowGravity = false;
        bottomObstacle.body.setImmovable(true);
        // Extended to bottom (480) with buffer
        const bottomHeightNeeded = 480 - (gapY + gapSize / 2) + 20; // +20px buffer
        bottomObstacle.setScale(1, bottomHeightNeeded / bottomObstacle.height);

        // Apply calculated hitbox size
        bottomObstacle.body.setSize(bottomObstacle.width * widthFactor, bottomObstacle.height * heightFactor);
        bottomObstacle.body.setOffset(bottomObstacle.width * offsetX, bottomObstacle.height * offsetY);
        bottomObstacle.scored = false;


        // Spawn coin in gap (50% chance)
        if (Math.random() > 0.5) {
            const coin = this.coins.create(370, gapY, 'coin');
            coin.setScale(0.07);
            coin.body.allowGravity = false;
            // Set circular body for coin (Radius 500 * 0.05 = 25px effective)
            coin.setCircle(500);

            // Animate coin
            this.tweens.add({
                targets: coin,
                scaleX: 0.025,
                scaleY: 0.025,
                duration: 300,
                yoyo: true,
                repeat: -1
            });
        }
    }

    collectCoin(player, coin) {
        coin.destroy();
        this.addScore(5);

        // Play coin sound effect
        this.sound.play('coin');

        // Visual feedback
        const coinText = this.add.text(coin.x, coin.y, '+5', {
            fontFamily: 'Orbitron',
            fontSize: '20px',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 3
        });

        this.tweens.add({
            targets: coinText,
            y: coin.y - 50,
            alpha: 0,
            duration: 800,
            onComplete: () => coinText.destroy()
        });
    }

    addScore(points) {
        this.score += points;
        this.scoreText.setText(`SCORE: ${this.score}`);

        // Check for level up (every 30 points)
        const nextLevelThreshold = this.level * 30;
        if (this.score >= nextLevelThreshold) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.sound.play('levelup');
        this.levelText.setText(`LEVEL: ${this.level}`);

        // Increase speed - DISABLED for constant difficulty
        // this.gameSpeed += 20;
        // this.obstacleInterval = Math.max(1200, this.obstacleInterval - 100);

        // Change time of day
        this.timeOfDay = (this.timeOfDay + 1) % 3;
        this.updateBackground();

        // Show level up text
        const levelUpText = this.add.text(160, 240, 'LEVEL UP!', {
            fontFamily: 'Orbitron',
            fontSize: '40px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#9D00FF',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: levelUpText,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 1000,
            onComplete: () => levelUpText.destroy()
        });
    }

    updateBackground() {
        let textureKey;
        if (this.level === 1) {
            const skyTextures = ['bg_sky_day', 'bg_sky_evening', 'bg_sky_night'];
            textureKey = skyTextures[this.timeOfDay];
        } else {
            // Cycle through location backgrounds starting from Level 2
            const locationBackgrounds = [
                'bg_orchid_road', // Level 2
                'bg_flyer',       // Level 3
                'bg_fullerton',   // Level 4
                'bg_siloso',      // Level 5
                'bg_china',       // Level 6
                'bg_merlion',     // Level 7
                'bg_esplanade',   // Level 8
                'bg_supertrees',  // Level 9
                'bg_marina'       // Level 10
            ];

            // (Level 2 -> Index 0), (Level 11 -> Index 0)
            const index = (this.level - 2) % locationBackgrounds.length;
            textureKey = locationBackgrounds[index];
        }

        this.bgSky.setTexture(textureKey);
        // this.bgCity.setTexture(cityTextures[this.timeOfDay]);

        // Fit background height to screen, maintain aspect ratio
        // Fit background height to screen, maintain aspect ratio, BUT allow covering
        const bgTexture = this.textures.get(textureKey).getSourceImage();
        if (bgTexture) {
            const scaleX = 320 / bgTexture.width;
            const scaleY = 480 / bgTexture.height;
            const scale = Math.max(scaleX, scaleY) * 1.02;
            this.bgSky.setTileScale(scale, scale);
        }
    }

    hitObstacle(player, obstacle) {
        this.gameOver();
    }

    hitGround(player, ground) {
        this.gameOver();
    }

    gameOver() {
        if (this.isGameOver) return;

        this.isGameOver = true;
        this.sound.play('crash');
        this.physics.pause();
        this.smokeEmitter.stop();

        // Flash player
        this.tweens.add({
            targets: this.player,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 3,
            onComplete: () => {
                this.scene.start('GameOverScene', {
                    score: this.score,
                    level: this.level
                });
            }
        });
    }

    showIdleOverlay() {
        if (this.isPaused) return;

        this.isPaused = true;
        this.physics.pause();

        // Create overlay
        const overlay = this.add.rectangle(160, 240, 320, 480, 0x000000, 0.7).setDepth(150);

        const idleText = this.add.text(160, 200, 'ARE YOU THERE?', {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(151);

        const tapText = this.add.text(160, 260, 'Tap to continue', {
            fontFamily: 'Orbitron',
            fontSize: '16px',
            color: '#00D9FF'
        }).setOrigin(0.5).setDepth(151);

        // Resume on input
        const resumeHandler = () => {
            overlay.destroy();
            idleText.destroy();
            tapText.destroy();
            this.isPaused = false;
            this.physics.resume();
            this.resetIdleTimer();

            this.input.off('pointerdown', resumeHandler);
            this.input.keyboard.off('keydown', resumeHandler);
        };

        this.input.once('pointerdown', resumeHandler);
        this.input.keyboard.once('keydown', resumeHandler);
    }

    resetIdleTimer() {
        this.lastInputTime = this.time.now;
    }

    startCountdown() {
        this.player.body.allowGravity = false;
        this.player.setVelocityY(0);

        let count = 3;
        const countText = this.add.text(160, 240, count.toString(), {
            fontFamily: 'Orbitron',
            fontSize: '80px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 8
        }).setOrigin(0.5).setDepth(200);

        const tick = () => {
            if (count > 0) {
                countText.setText(count.toString());
                countText.setScale(1);
                this.tweens.add({
                    targets: countText,
                    scaleX: 1.5,
                    scaleY: 1.5,
                    yoyo: true,
                    duration: 300,
                    ease: 'Sine.easeInOut'
                });
            } else {
                countText.setText('GO!');
                countText.setScale(1);
                this.tweens.add({
                    targets: countText,
                    scaleX: 2,
                    scaleY: 2,
                    alpha: 0,
                    duration: 800,
                    ease: 'Power2',
                    onComplete: () => {
                        countText.destroy();
                        this.showTapToPlay();
                    }
                });
            }
        };

        tick();

        this.time.addEvent({
            delay: 1000,
            callback: () => {
                count--;
                tick();
            },
            repeat: 2
        });
    }

    showTapToPlay() {
        const tapText = this.add.text(160, 240, 'Tap to play!', {
            fontFamily: 'Orbitron',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#00FF99',
            stroke: '#000000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(200);

        this.tweens.add({
            targets: tapText,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const startGameHandler = () => {
            tapText.destroy();
            this.isStarting = false;
            this.player.body.allowGravity = true;
            this.resetIdleTimer();
            this.jump(); // initial jump

            this.input.off('pointerdown', startGameHandler);
            this.input.keyboard.off('keydown', startGameHandler);
        };

        this.input.once('pointerdown', startGameHandler);
        this.input.keyboard.once('keydown', startGameHandler);
    }
}
