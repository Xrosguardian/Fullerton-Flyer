export class MuteButton {
    constructor(scene, x, y, depth = 2000) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.depth = depth;

        this.create();
    }

    create() {
        // 1. Initialize State from Storage
        const rawStorage = localStorage.getItem('flappy_mute');
        const storedMute = rawStorage === 'true';

        console.log(`[${this.scene.sys.settings.key}] MuteButton Init. Storage raw: '${rawStorage}', Parsed: ${storedMute}`);

        this.scene.sound.mute = storedMute; // Apply initial state immediately

        // 2. Helper to get icon
        const getIcon = () => this.scene.sound.mute ? '🔇' : '🔊';

        // 3. Create Visual Text
        // Moved to 260 to ensure it's not cut off on edge
        // EXPLICIT: Use storedMute for initial render to ensure it matches storage visually
        const initialIcon = storedMute ? '🔇' : '🔊';
        this.text = this.scene.add.text(this.x - 20, this.y, initialIcon, {
            fontSize: '24px',
            padding: { x: 5, y: 5 }
        })
            .setOrigin(0, 0)
            .setDepth(this.depth)
            .setScrollFactor(0);

        // 4. Create Hit Zone
        // Larger 50x50 zone for easier tapping
        this.zone = this.scene.add.zone(this.x - 20, this.y, 50, 50)
            .setOrigin(0, 0)
            .setDepth(this.depth + 1)
            .setScrollFactor(0)
            .setInteractive({ useHandCursor: true });

        // 5. Interaction
        // Use pointerup for clicked behavior (safer than pointerdown)
        this.zone.on('pointerup', (pointer, localX, localY, event) => {
            // STRICT SAFETY CHECKS
            if (!this.scene.sys.isVisible() || !this.scene.sys.isActive()) {
                console.log(`Ignored click in hidden/inactive scene: [${this.scene.sys.settings.key}]`);
                return;
            }

            const now = this.scene.time.now;
            if (this.lastClickTime && now - this.lastClickTime < 300) {
                console.log('Mute Click Debounced');
                if (event && event.stopPropagation) event.stopPropagation();
                return;
            }
            this.lastClickTime = now;

            // Toggle Logic
            // FIX: drift causes !this.scene.sound.mute to always be !false (true).
            // Rely on localStorage (Source of Truth) for the toggle base.
            const currentStored = localStorage.getItem('flappy_mute') === 'true';
            const newState = !currentStored;

            this.scene.sound.mute = newState;
            localStorage.setItem('flappy_mute', newState);

            // Visual Update
            this.text.setText(newState ? '🔇' : '🔊');

            // Log for debugging
            console.log(`Mute Toggled in [${this.scene.sys.settings.key}]. New State: ${newState} (Derived from stored: ${currentStored})`);

            if (event && event.stopPropagation) event.stopPropagation();
        });

        // Debug: Draw zone outline (Uncomment if needed)
        // this.scene.add.rectangle(this.x - 20, this.y, 50, 50).setStrokeStyle(1, 0xFF0000).setOrigin(0,0).setDepth(2002);

        // 6. Failsafe: Watchdog timer
        // Checks every 100ms (Aggressive) to catch drifts instantly
        this.timer = this.scene.time.addEvent({
            delay: 100,
            callback: () => this.updateVisual(),
            loop: true
        });

        // 7. Cleanup on Scene Shutdown (CRITICAL)
        this.scene.events.once('shutdown', () => this.destroy());
        this.scene.events.once('destroy', () => this.destroy());
    }

    updateVisual() {
        if (!this.text.active) return; // Guard against destroyed object

        // Don't update visuals for hidden scenes to avoid ghost logs or state contention
        if (!this.scene.sys.isVisible()) return;

        // ENFORCER LOGIC: LocalStorage is the Source of Truth
        const storedMute = localStorage.getItem('flappy_mute') === 'true';
        const currentSoundMute = this.scene.sound.mute;

        // If actual sound state disagrees with storage, FORCE IT to match storage
        if (currentSoundMute !== storedMute) {
            console.warn(`[${this.scene.sys.settings.key}] Sound State Drift Detected! System: ${currentSoundMute}, Storage: ${storedMute}. Enforcing Storage...`);
            this.scene.sound.mute = storedMute;
        }

        const expectedIcon = storedMute ? '🔇' : '🔊';

        if (this.text.text !== expectedIcon) {
            console.log(`[${this.scene.sys.settings.key}] Visual updated to match storage: ${expectedIcon}`);
            this.text.setText(expectedIcon);
        }
    }

    destroy() {
        if (this.timer) this.timer.remove();
        if (this.zone) this.zone.destroy();
        if (this.text) this.text.destroy();
    }
}
