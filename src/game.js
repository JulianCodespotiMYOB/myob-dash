/**
 * Represents the main game scene for MYOB Dash.
 * Handles game logic, rendering, player interactions, and effects.
 */
class GameScene extends Phaser.Scene {
  constructor() {
      super('GameScene');

      // --- Game Object References ---
      this.player = null;
      this.ground = null;
      this.coins = null;
      this.enemies = null;
      this.flyingEnemies = null; // New group for flying obstacles
      this.background = null;
      this.backgroundFar = null; // Distant mountains (slow parallax)
      this.backgroundMid = null; // Mid-distance hills (medium parallax)
      this.gapGroup = null; // Group for platform gaps

      // --- Juice Elements ---
      this.scorePopups = [];         // For floating score text
      this.comboCount = 0;           // Track consecutive coin collection
      this.comboTimer = null;        // Timer to reset combo
      this.comboText = null;         // Display current combo
      this.screenFlash = null;       // Screen flash effect
      this.timeDilation = 1;         // Time dilation factor
      this.timeWarpTween = null;     // Time warp tween
      this.hitStop = false;          // Freeze frames boolean
      this.hitStopTimer = null;      // Timer for freeze frames
      this.lastCoinCollectTime = 0;  // Time of last coin collection
      this.cameraOriginalZoom = 1;   // Store original camera zoom
      this.environmentEmitters = []; // Array of background particle emitters

      // --- UI Elements ---
      this.scoreText = null;
      this.gameOverText = null;
      this.restartText = null;
      this.powerUpText = null;
      this.highScoreText = null;
      this.multiplierText = null;

      // --- Audio ---
      this.sounds = {
          jump: null,
          doublejump: null,
          coin: null,
          hit: null,
          powerup: null,
          gameOver: null,
          music: null,
          shieldActivate: null,
          shieldHit: null
      };
      this.musicPlaying = false;

      // --- Particle Emitters ---
      this.coinEmitter = null;     // Emitter for coin collection
      this.jumpEmitter = null;     // Emitter for player jump dust
      this.powerUpEmitter = null;  // Emitter for power-up trail
      this.doubleJumpEmitter = null; // Emitter for double jump effect

      // --- Game State & Mechanics ---
      this.score = 0;
      this.highScore = 0;
      this.scoreMultiplier = 1;
      this.multiplierTimer = null;
      this.gameOver = false;
      this.groundY = 0;
      this.coinsCollectedForPowerUp = 0;

      // --- Jump Mechanics ---
      this.hasDoubleJumped = false; // Track if player has used double jump
      this.jumpDownActive = false; // Track if player is jumping down

      // --- Coyote Time --- (Allows jumping shortly after leaving ground)
      this.coyoteTimeDuration = 100; // ms
      this.coyoteTimeCounter = 0; // Current counter

      // --- Jump Buffering --- (Allows queuing a jump shortly before landing)
      this.jumpBufferDuration = 100; // ms
      this.jumpBufferCounter = 0; // Current counter

      // --- Player State for Effects ---
      this.wasInAir = false;

      // --- Difficulty & Progression ---
      this.baseScrollSpeed = 250;
      this.scrollSpeed = 0;
      this.maxScrollSpeed = 750; // Slightly increased max speed
      this.speedIncreaseFactor = 6; // Slightly faster increase

      this.baseSpawnDelay = 1700; // Slightly shorter initial delay
      this.spawnDelay = 0;
      this.minSpawnDelay = 400;   // Slightly shorter min delay
      this.spawnDecreaseFactor = 18; // Faster decrease

      // --- Timers ---
      this.coinSpawnTimer = null;
      this.enemySpawnTimer = null; // Will now spawn ground or flying enemies
      this.gapSpawnTimer = null;  // Timer for spawning gaps in the platform
      this.powerUpTimer = null;
      this.powerUpFlashEvent = null;

      // --- Power-Up State ---
      this.powerUpActive = false;
      this.powerUpDuration = 10000;
      this.powerUpSpeedBoost = 1.6;
      this.activePowerUpType = null; // Current active power-up
      // Power-up types: 'speed', 'shield', 'magnet', 'multiplier'
      this.shieldSprite = null; // Visual for the shield
      this.shieldTextureKey = 'shield_visual';

      // --- Input ---
      this.cursors = null;
      this.spaceKey = null;
      this.downKey = null; // Track down key for jump down

      // --- Animation Keys ---
      this.playerRunAnimKey = 'player-run';
      this.playerJumpAnimKey = 'player-jump';
      this.playerDoubleJumpAnimKey = 'player-double-jump';
      this.playerJumpDownAnimKey = 'player-jump-down';
      this.coinIdleAnimKey = 'coin-idle'; // For coin animation/tween

      // --- Asset Keys ---
      this.particleTextureKey = 'particle'; // Key for particle texture
      this.flyingEnemyKey = 'enemy_flying'; // Key for the new enemy type

      // --- Player Original Dimensions ---
      this.playerOriginalWidth = 0;
      this.playerOriginalHeight = 0;

      // --- Player Scale ---
      this.playerScaleX = 1;
      this.playerScaleY = 1;

      // --- Pit/Gap Properties ---
      // this.gapGroup is already declared
      // this.gapSpawnTimer is already declared
  }

  /**
   * Preloads game assets (images, spritesheets, particle textures).
   */
  preload() {
      this.load.setBaseURL('assets/');

      // Define target sizes for game objects
      this.targetSizes = {
          player: { width: 24, height: 48 },
          coin: { width: 24, height: 24 },
          enemy: { width: 30, height: 40 },
          flyingEnemy: { width: 35, height: 35 },
          particle: { width: 10, height: 10 }
          // pit: { width: 120, height: 32 } // Removed, will generate lava texture
      };

      // Define what background colors to make transparent for each asset
      this.transparentColors = {
          'player_sheet': 0x0000ff, // Blue background
          'enemy': 0xffffff,         // White background
          'coin': 0xffffff,          // White background
          [this.flyingEnemyKey]: 0xffffff // White background
          // 'pit': 0x1a1a1a // Removed
      };

      // --- Audio Files ---
      // Fallback audio names to try loading
      const audioFiles = {
          'jump': ['jump.mp3', 'jump.wav', 'jump.ogg'],
          'doublejump': ['doublejump.mp3', 'doublejump.wav', 'double_jump.mp3'],
          'coin': ['coin.mp3', 'coin.wav', 'coin_collect.mp3'],
          'hit': ['hit.mp3', 'hit.wav', 'collision.mp3'],
          'powerup': ['powerup.mp3', 'powerup.wav', 'power_up.mp3'], // Generic powerup sound for speed
          'gameOver': ['gameover.mp3', 'game_over.mp3', 'lose.mp3'],
          'music': ['music.mp3', 'background.mp3', 'bgm.mp3'],
          'shieldActivate': ['shield_activate.mp3', 'shield_on.wav', 'powerup_shield.mp3', 'sfx_shield_up.wav'],
          'shieldHit': ['shield_hit.mp3', 'shield_break.wav', 'sfx_shield_down.wav']
      };

      // Try to load audio with fallbacks
      Object.entries(audioFiles).forEach(([key, variations]) => {
          for (const variation of variations) {
              try {
                  this.load.audio(key, variation);
                  break;  // Stop if successfully loaded
              } catch (e) {
                  console.warn(`Failed to load audio ${variation}`);
              }
          }
      });

      // Define possible filename variations to try for each asset
      const filenameVariations = {
          'enemy': ['taxman.png', 'enemy.png', 'taxman', 'enemy'],
          'coin': ['coin.png', 'coin'],
          [this.flyingEnemyKey]: ['tax_drone.png', 'tax_drone', 'flying_enemy.png', 'flying_enemy'],
          'background': ['background.png', 'background'],
          'background_far': ['mountains.png', 'background_far.png', 'parallax_bg_1.png'],
          'background_mid': ['hills.png', 'background_mid.png', 'parallax_bg_2.png'],
          [this.particleTextureKey]: ['particle.png', 'particle']
          // 'pit': ['pit.png', 'pit'] // Removed
      };

      // Try to load assets with fallbacks
      Object.entries(filenameVariations).forEach(([key, variations]) => {
          // Try each variation in order until one loads
          this.loadWithFallbacks(key, variations);
      });

      // Load player spritesheet with variations
      const sheetVariations = ['player_sheet.png', 'player_sheet', 'player.png', 'player'];

      // Try to detect optimal frame size for first available spritesheet
      for (const variation of sheetVariations) {
          const img = new Image();
          img.src = `assets/${variation}`;

          // Use closure to keep the variation reference
          ((imgPath) => {
              img.onload = () => {
                  // For player sheet, assume 6 frames horizontally
                  const totalFrames = 6;
                  const frameWidth = Math.floor(img.width / totalFrames);
                  const frameHeight = img.height;

                  console.log(`Detected frame dimensions: ${frameWidth}x${frameHeight} from ${img.width}x${img.height}`);

                  // Now load the spritesheet with correct dimensions
                  this.load.spritesheet('player_sheet', imgPath, {
                      frameWidth,
                      frameHeight
                  });

                  // Make sure preload doesn't finish until this asset loads
                  if (!this.load.isLoading()) {
                      this.load.start(); // Start loading if not already in progress
                  }
              };
          })(variation);

          // If the image loads successfully, stop trying other variations
          if (img.complete && img.naturalWidth) {
              break;
          }
      }

      // Fallback: If no spritesheet was detected, use default dimensions
      this.load.once('complete', () => {
          if (!this.textures.exists('player_sheet')) {
              console.warn('No player_sheet detected, using fallback with default dimensions');
              this.load.spritesheet('player_sheet', 'player_sheet.png', {
                  frameWidth: 102,
                  frameHeight: 408
              });
              this.load.start();
          }
      });

      // Process images after they're loaded to make backgrounds transparent
      this.load.on('complete', () => {
          // Apply transparency to all assets with defined transparent colors
          Object.entries(this.transparentColors).forEach(([key, color]) => {
              if (this.textures.exists(key)) {
                  if (key === 'player_sheet') {
                      // For spritesheets, handle differently since they need animation frames preserved
                      this.removeSpritesheetBackground(key, color);
                  } else {
                      this.removeBackgroundColor(key, color);
                  }
              }
          });
      });

      // Handle missing textures
      this.load.once('complete', () => {
          if (!this.textures.exists('player_sheet')) {
               console.warn("Spritesheet 'player_sheet.png' not found. Creating static placeholder 'player'.");
               this.ensureTextureExists('player', 32, 48, '007bff');
          }
          this.ensureTextureExists('coin', 24, 24, 'ffd700', true);
          this.ensureTextureExists('enemy', 30, 40, 'dc3545');
          this.ensureTextureExists(this.flyingEnemyKey, 35, 35, '888888'); // Grey placeholder for drone
          this.ensureTextureExists(this.particleTextureKey, 10, 10, 'ffff00', true); // Yellow particle placeholder
          this.ensureTextureExists(this.shieldTextureKey, 48, 48, '00ccff', true); // Placeholder for shield visual
          // this.ensureTextureExists('pit', 120, 32, '1a1a1a'); // Removed

          // Create dynamic lava texture for pits
          const lavaGfx = this.make.graphics({ x: 0, y: 0 }, false);
          const lavaWidth = 128; // A base width for the texture, can be tiled or stretched
          const lavaHeight = 32; // Should match platform height or desired pit depth visual

          // Base lava color (dark red/orange)
          lavaGfx.fillStyle(0xcc3300, 1);
          lavaGfx.fillRect(0, 0, lavaWidth, lavaHeight);

          // Add some lighter "hot spots" / "bubbles"
          for (let i = 0; i < 20; i++) { // Increased bubble count
              const x = Phaser.Math.Between(0, lavaWidth - 8); // Ensure bubbles are within bounds
              const y = Phaser.Math.Between(3, lavaHeight - 8);
              const radius = Phaser.Math.Between(2, 6); // Smaller, more numerous bubbles
              const color = Phaser.Math.RND.pick([0xff6600, 0xff9933, 0xffcc00, 0xff3300]); // Oranges, yellows, dark red
              lavaGfx.fillStyle(color, Phaser.Math.FloatBetween(0.6, 0.9)); // Varied alpha
              lavaGfx.fillCircle(x + radius, y + radius, radius);
          }
          // Add some darker lines/streaks for variation
          for (let i = 0; i < 5; i++) {
            const x1 = Phaser.Math.Between(0, lavaWidth);
            const y1 = Phaser.Math.Between(0, lavaHeight);
            const x2 = x1 + Phaser.Math.Between(-30, 30);
            const y2 = y1 + Phaser.Math.Between(-10, 10);
            lavaGfx.lineStyle(Phaser.Math.Between(1,2), 0x990000, Phaser.Math.FloatBetween(0.3, 0.6));
            lavaGfx.beginPath();
            lavaGfx.moveTo(x1,y1);
            lavaGfx.lineTo(x2,y2);
            lavaGfx.strokePath();
          }

          lavaGfx.generateTexture('pit_lava', lavaWidth, lavaHeight);
          lavaGfx.destroy();
      });
  }

  /**
   * Attempts to load an asset using multiple filename variations.
   * @param {string} key - The texture key to assign
   * @param {Array<string>} variations - Array of filename variations to try
   * @returns {boolean} - Whether loading succeeded
   */
  loadWithFallbacks(key, variations) {
      for (const filename of variations) {
          try {
              this.load.image(key, filename);
              return true;
          } catch (e) {
          }
      }
      console.warn(`Could not load ${key} from any variation`);
      return false;
  }

  /**
   * Creates game objects, physics, animations, particles, and initializes state.
   */
  create() {
      // --- Reset State Variables ---
      this.score = 0;
      this.gameOver = false;
      this.scrollSpeed = this.baseScrollSpeed;
      this.spawnDelay = this.baseSpawnDelay;
      this.powerUpActive = false;
      this.coinsCollectedForPowerUp = 0;
      this.hasDoubleJumped = false;
      this.jumpDownActive = false;
      this.coyoteTimeCounter = 0; // Reset coyote timer
      this.jumpBufferCounter = 0; // Reset jump buffer
      this.wasInAir = false; // Reset air state
      this.cleanupTimers();
      this.activePowerUpType = null; // Reset active power-up type

      // Destroy shield sprite if it exists from a previous game
      if (this.shieldSprite) {
          this.shieldSprite.destroy();
          this.shieldSprite = null;
      }

      const { width, height } = this.scale;
      this.groundY = height * 0.9;

      // --- Background ---
      if (this.textures.exists('background')) {
          this.background = this.add.tileSprite(0, 0, width, height, 'background')
              .setOrigin(0, 0).setScrollFactor(0);
      } else {
          this.cameras.main.setBackgroundColor('#e0f0f8');
      }

      // --- Ground ---
      this.ground = this.physics.add.staticImage(width / 2, this.groundY + 10);
      this.ground.setSize(width, 20).setVisible(false);
      this.ground.body.immovable = true;
      this.ground.body.allowGravity = false;

      // --- Visual Platform ---
      // Create ground texture if it doesn't exist
      if (!this.textures.exists('ground')) {
          const gfx = this.make.graphics({ x: 0, y: 0 }, false);

          // Main platform fill - brown
          gfx.fillStyle(0x8B4513, 1);
          gfx.fillRect(0, 0, 128, 32);

          // Top edge - lighter color
          gfx.fillStyle(0xA0522D, 1);
          gfx.fillRect(0, 0, 128, 5);

          // Add texture details - small dots and lines
          gfx.fillStyle(0x704214, 1);

          // Random small dots
          for (let i = 0; i < 20; i++) {
              const x = Phaser.Math.Between(5, 123);
              const y = Phaser.Math.Between(8, 28);
              gfx.fillRect(x, y, 2, 2);
          }

          // A few horizontal lines
          for (let i = 0; i < 3; i++) {
              const y = Phaser.Math.Between(10, 25);
              const width = Phaser.Math.Between(30, 60);
              const x = Phaser.Math.Between(5, 128 - width - 5);
              gfx.fillRect(x, y, width, 1);
          }

          gfx.generateTexture('ground', 128, 32);
          gfx.destroy();
      }
      // Add scrolling platform visual
      this.platformSprite = this.add.tileSprite(
          width / 2,
          this.groundY + 10,
          width,
          32,
          'ground'
      );
      // Style the platform
      this.platformSprite.setDepth(0.5); // Above background, below player
      // Keep platform collision using invisible ground object

      // --- Player ---
      const playerX = width * 0.15;
      const playerTextureKey = this.textures.exists('player_sheet') ? 'player_sheet' : 'player';
      this.player = this.physics.add.sprite(playerX, this.groundY - 50, playerTextureKey);

      // Check if we have saved scale data from previous game
      const hasSavedScale = this.data && this.data.has('playerScaleData');

      if (hasSavedScale) {
          // Restore player scale from saved data
          const scaleData = this.data.get('playerScaleData');
          this.playerOriginalWidth = scaleData.originalWidth;
          this.playerOriginalHeight = scaleData.originalHeight;
          this.playerScaleX = scaleData.scaleX;
          this.playerScaleY = scaleData.scaleY;

          // Apply the saved scale explicitly
          this.player.setScale(this.playerScaleX, this.playerScaleY);
      } else {
          // First time, store original dimensions
          this.playerOriginalWidth = this.player.width;
          this.playerOriginalHeight = this.player.height;

          // Scale down the large spritesheet to appropriate game size
          if (this.textures.exists('player_sheet')) {
              this.scaleToTargetSize(this.player, 'player');
              // Store the computed scale for future reference
              this.playerScaleX = this.player.scaleX;
              this.playerScaleY = this.player.scaleY;
          }
      }

      // --- Player Animations ---
      if (this.textures.exists('player_sheet')) {
          // Manually analyze the image
          const texture = this.textures.get('player_sheet');
          const source = texture.getSourceImage();
          const framesHorizontal = 5;
          if (source) {
              const imgWidth = source.width - 95;
              const imgHeight = source.height;

              // Calculate frame details
              const frameWidth = Math.floor(imgWidth / framesHorizontal);
              const frameHeight = imgHeight;

              // Remove existing spritesheet and recreate it with exact frame coordinates
              this.textures.remove('player_sheet');

              // Create a new texture atlas with explicit frame definitions
              const atlasKey = 'player_atlas';
              const atlasData = {
                  frames: {}
              };

              // Define each frame with explicit coordinates
              for (let i = 0; i < framesHorizontal; i++) {
                  atlasData.frames[`run_${i}`] = {
                      frame: {
                          x: i * frameWidth,
                          y: 0,
                          w: frameWidth,
                          h: frameHeight
                      },
                      rotated: false,
                      trimmed: false,
                      spriteSourceSize: {
                          x: 0,
                          y: 0,
                          w: frameWidth,
                          h: frameHeight
                      },
                      sourceSize: {
                          w: frameWidth,
                          h: frameHeight
                      }
                  };
              }

              // Add the texture atlas using the source image
              this.textures.addAtlas(atlasKey, source, atlasData);

              // Create animations using the explicit frame names
              this.anims.create({
                  key: this.playerRunAnimKey,
                  frames: [
                      { key: atlasKey, frame: 'run_0' },
                      { key: atlasKey, frame: 'run_1' },
                      { key: atlasKey, frame: 'run_2' },
                      { key: atlasKey, frame: 'run_3' }
                  ],
                  frameRate: 8,
                  repeat: -1
              });

              // Other animations with explicit frames
              this.anims.create({
                  key: this.playerJumpAnimKey,
                  frames: [{ key: atlasKey, frame: 'run_4' }],
                  frameRate: 20
              });

              this.anims.create({
                  key: this.playerDoubleJumpAnimKey,
                  frames: [{ key: atlasKey, frame: 'run_5' }],
                  frameRate: 20
              });

              const jumpDownFrame = framesHorizontal > 6 ? 'run_6' : 'run_4';
              this.anims.create({
                  key: this.playerJumpDownAnimKey,
                  frames: [{ key: atlasKey, frame: jumpDownFrame }],
                  frameRate: 20
              });

              // Update player to use the new atlas texture
              this.player.setTexture(atlasKey, 'run_0');
              this.player.play(this.playerRunAnimKey);
          }
      } else {
           this.player.setSize(32, 48);
      }

      // Improved hitbox - more precise for collision detection
      this.player.setBounce(0.1);
      this.player.setGravityY(1000);
      this.player.setCollideWorldBounds(false);

      // Apply consistent hitbox
      this.setupPlayerHitbox();

      this.player.setDepth(2); // Above platform

      // --- Particle Emitters ---
      // Coin collection emitter (configured but not started)
      this.coinEmitter = this.add.particles(0, 0, this.particleTextureKey, {
          speed: { min: 100, max: 250 },
          angle: { min: 225, max: 315 }, // Burst upwards and outwards
          scale: { start: 0.8, end: 0 },
          blendMode: 'ADD', // Bright effect
          lifespan: 400,
          gravityY: 300,
          frequency: -1, // Emit only on explode
          quantity: 15 // Number of particles per burst
      }).setDepth(5);

      // Jump dust emitter (configured but not started)
      this.jumpEmitter = this.add.particles(0, 0, this.particleTextureKey, {
          speed: { min: 20, max: 50 },
          angle: { min: 250, max: 290 }, // Burst slightly upwards
          scale: { start: 0.4, end: 0 },
          alpha: { start: 0.5, end: 0 },
          blendMode: 'NORMAL',
          lifespan: 300,
          gravityY: -100, // Slight upward drift
          frequency: -1,
          quantity: 8,
          tint: 0xaaaaaa // Greyish tint for dust
      }).setDepth(0); // Behind player

      // Double jump special effect emitter
      this.doubleJumpEmitter = this.add.particles(0, 0, this.particleTextureKey, {
          speed: { min: 50, max: 100 },
          angle: { min: 0, max: 360 }, // Circular burst
          scale: { start: 0.5, end: 0 },
          alpha: { start: 0.8, end: 0 },
          blendMode: 'ADD',
          lifespan: 400,
          gravityY: 0, // No gravity effect
          frequency: -1,
          quantity: 12,
          tint: 0x00ffff // Cyan tint for double jump
      }).setDepth(2); // Above player

      // Power-up trail emitter (attached to player, initially off)
      this.powerUpEmitter = this.add.particles(0, 0, this.particleTextureKey, {
          speed: 50,
          scale: { start: 0.4, end: 0 },
          blendMode: 'ADD',
          lifespan: 300,
          frequency: 80, // Emit particles regularly while active
          tint: 0xffff00, // Yellow power-up color
          follow: this.player, // Attach to player
          followOffset: { x: -this.player.width * 0.4, y: 0 } // Emit from behind player center
      }).setDepth(0).stop(); // Start inactive

      // --- Physics Colliders ---
      this.physics.add.collider(this.player, this.ground);

      // --- Object Groups with Consistent Physics ---
      // Create coin group with specific physics properties
      this.coins = this.physics.add.group({
          bounceX: 0,
          bounceY: 0,
          allowGravity: false,
          immovable: true
      });

      // Create enemy groups with specific physics properties
      this.enemies = this.physics.add.group({
          bounceX: 0,
          bounceY: 0,
          allowGravity: false,
          immovable: true
      });

      this.flyingEnemies = this.physics.add.group({
          bounceX: 0,
          bounceY: 0,
          allowGravity: false,
          immovable: true
      });

      this.gapGroup = this.physics.add.group({ // Instantiated gapGroup
          allowGravity: false,
          immovable: true
      });

      // --- Collision/Overlap Handlers ---
      this.physics.add.overlap(this.player, this.coins, this.collectCoin, null, this);
      // Check collisions with both enemy types
      this.physics.add.collider(this.player, this.enemies, this.hitEnemy, () => !this.powerUpActive && !this.gameOver, this);
      this.physics.add.collider(this.player, this.flyingEnemies, this.hitEnemy, () => !this.powerUpActive && !this.gameOver, this);
      this.physics.add.overlap(this.player, this.gapGroup, this.playerFellInPit, null, this); // Overlap for pits

      // --- Input Setup ---
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
      this.input.on('pointerdown', this.handleJumpInput, this);

      // --- UI Text ---
      const textStyle = { fontSize: '24px', fill: '#1a1a1a', fontStyle: 'bold' };
      this.scoreText = this.add.text(16, 16, 'Score: 0', textStyle).setScrollFactor(0).setDepth(10);
      this.powerUpText = this.add.text(width - 16, 16, '', { ...textStyle, align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(10);

      // --- Game Over UI (Initially Hidden) ---
      const gameOverStyle = { fontSize: '48px', fill: '#e74c3c', fontStyle: 'bold', align: 'center' };
      this.gameOverText = this.add.text(width / 2, height / 2 - 40, 'Game Over', gameOverStyle)
          .setOrigin(0.5).setScrollFactor(0).setDepth(11).setVisible(false);
      const restartStyle = { fontSize: '24px', fill: '#1a1a1a', align: 'center' };
      this.restartText = this.add.text(width / 2, height / 2 + 20, 'Click or Space to Restart', restartStyle)
          .setOrigin(0.5).setScrollFactor(0).setDepth(11).setVisible(false);

      // --- Start Spawning Timers ---
      this.startSpawning();

      // Setup combo text
      this.comboText = this.add.text(
          width / 2,
          height * 0.3,
          '',
          { fontSize: '32px', fill: '#f8b200', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10)
      .setAlpha(0);

      // Create multiplier text
      this.multiplierText = this.add.text(
          width - 16,
          60,
          '',
          { fontSize: '20px', fill: '#f8d700', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }
      )
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(10);

      // Setup environmental particles
      if (this.textures.exists(this.particleTextureKey)) {
          // Subtle background particles
          this.environmentEmitters.push(
              this.add.particles(0, 0, this.particleTextureKey, {
                  x: { min: 0, max: width },
                  y: { min: 0, max: height * 0.7 },
                  scale: { start: 0.2, end: 0 },
                  alpha: { start: 0.2, end: 0 },
                  speed: 20,
                  angle: { min: 180, max: 360 },
                  frequency: 400,
                  lifespan: 5000,
                  blendMode: Phaser.BlendModes.ADD,
                  tint: 0xffffff
              }).setDepth(-1)
          );
      }
  }

  /**
   * The main game loop, called every frame.
   */
  update(time, delta) {
      if (this.gameOver) {
          return;
      }

      // Safety check to prevent freezing if player animations aren't properly set up
      if (!this.player || !this.player.body) {
          console.warn("Player not properly initialized, attempting recovery");
          return;
      }

      const deltaSeconds = delta / 1000;
      const currentScrollSpeed = this.powerUpActive ? this.scrollSpeed * this.powerUpSpeedBoost : this.scrollSpeed;

      // --- Background Scrolling ---
      if (this.background) {
          this.background.tilePositionX += currentScrollSpeed * deltaSeconds;
      }

      // --- Platform Scrolling ---
      if (this.platformSprite) {
          this.platformSprite.tilePositionX += currentScrollSpeed * deltaSeconds;
      }

      // --- Player Input & Jump & Effects ---
      const isJumpKeyDown = Phaser.Input.Keyboard.JustDown(this.spaceKey) || Phaser.Input.Keyboard.JustDown(this.cursors.up);
      const isDownKeyDown = Phaser.Input.Keyboard.JustDown(this.downKey) || Phaser.Input.Keyboard.JustDown(this.cursors.down);
      const touchingGround = this.player.body.touching.down;

      // --- Landing Logic ---
      if (touchingGround) {
          if (this.wasInAir) { // Just landed
              this.triggerSquashTween();
              this.wasInAir = false;
          }
          this.hasDoubleJumped = false;
          this.jumpDownActive = false;
          this.coyoteTimeCounter = this.coyoteTimeDuration;

          // Check for buffered jump
          if (this.jumpBufferCounter > 0) {
              this.player.setVelocityY(-575);
              this.coyoteTimeCounter = 0; // Consume coyote time as well, as we're jumping
              this.jumpBufferCounter = 0; // Consume buffer
              this.jumpEmitter.explode(8, this.player.x, this.player.y + this.player.displayHeight / 2);
              if (this.sounds.jump) this.sounds.jump.play();
              this.triggerStretchTween(); // Stretch on buffered jump
          }
      } else { // Player is in the air
          this.wasInAir = false;
          this.coyoteTimeCounter -= delta;
      }

      // --- Player Jump Logic ---
      if (isJumpKeyDown) {
          // Check for initial jump (Ground OR Coyote Time)
          if (touchingGround || this.coyoteTimeCounter > 0) {
              this.player.setVelocityY(-575);
              this.coyoteTimeCounter = 0; // Consume jump/coyote time
              this.jumpBufferCounter = 0; // Clear buffer if jump is successful
              this.jumpEmitter.explode(8, this.player.x, this.player.y + this.player.displayHeight / 2);
              if (this.sounds.jump) this.sounds.jump.play();
              this.triggerStretchTween(); // Stretch on initial jump
          }
          // Check for double jump (Only if in air and haven't double jumped)
          else if (!touchingGround && !this.hasDoubleJumped) {
              this.player.setVelocityY(-500);
              this.hasDoubleJumped = true;
              this.coyoteTimeCounter = 0; // Consume jump
              this.jumpBufferCounter = 0; // Clear buffer
              this.doubleJumpEmitter.explode(12, this.player.x, this.player.y);
              if (this.sounds.doublejump) this.sounds.doublejump.play();
              this.triggerStretchTween(); // Stretch on double jump
          }
          // If in air and cannot double jump, buffer the jump
          else if (!touchingGround) {
              this.jumpBufferCounter = this.jumpBufferDuration;
          }
      }

      // Decrement jump buffer counter
      if (this.jumpBufferCounter > 0) {
          this.jumpBufferCounter -= delta;
      }

      // Jump down (separate logic for down key)
      else if (isDownKeyDown && !touchingGround) {
          this.player.setVelocityY(500); // Fast downward movement
          this.jumpDownActive = true;
      }

      // --- Player Animation Control ---
      if (this.textures.exists('player_sheet')) {
          try {
              if (!touchingGround) {
                  if (this.jumpDownActive) {
                      this.player.play(this.playerJumpDownAnimKey, true);
                  } else if (this.hasDoubleJumped) {
                      this.player.play(this.playerDoubleJumpAnimKey, true);
                  } else {
                      this.player.play(this.playerJumpAnimKey, true);
                  }
              } else {
                  this.player.play(this.playerRunAnimKey, true);
              }
          } catch (error) {
              console.error("Animation error:", error);

              // Attempt recovery by forcing a frame if possible
              try {
                  this.player.stop();
                  if (this.player.setFrame) {
                      this.player.setFrame(0);
                  }
              } catch (e) {
                  console.warn("Failed animation recovery:", e);
              }
          }
      }

      // --- Player Vertical Bounds Check ---
      if (this.player.y < -this.player.height) {
          this.player.y = -this.player.height;
          this.player.setVelocityY(0);
      }
      if (this.player.y > this.scale.height + this.player.height) {
          this.endGame();
      }

      // --- Move Collectibles and Enemies ---
      const displacement = -currentScrollSpeed * deltaSeconds;
      this.moveGroupChildren(this.coins, displacement);
      this.moveGroupChildren(this.enemies, displacement);
      this.moveGroupChildren(this.flyingEnemies, displacement); // Move flying enemies too
      this.moveGroupChildren(this.gapGroup, displacement); // Move pits

      // --- Despawn Off-screen Objects ---
      this.despawnOffscreenObjects(this.coins);
      this.despawnOffscreenObjects(this.enemies);
      this.despawnOffscreenObjects(this.flyingEnemies); // Despawn flying enemies
      this.despawnOffscreenObjects(this.gapGroup); // Despawn pits

      // --- Increase Difficulty Over Time ---
      this.increaseDifficulty(deltaSeconds);

      // --- Update Power-Up Timer Display ---
      this.updatePowerUpDisplay();

      // --- Shield Sprite Update ---
      if (this.activePowerUpType === 'shield' && this.shieldSprite && this.shieldSprite.active) {
          this.shieldSprite.setPosition(this.player.x, this.player.y);
          // Optional: add a little visual bob or rotation to the shield
          // this.shieldSprite.angle += 1;
      }
  }

  // --- Helper Methods ---

  /**
   * Moves all active children of a group horizontally.
   */
  moveGroupChildren(group, displacement) {
      group.children.each(child => {
          if (child.active) {
              child.x += displacement;
          }
      });
  }

  /**
   * Deactivates and hides group children that move off the left edge of the screen.
   */
  despawnOffscreenObjects(group) {
      group.children.each(child => {
          if (child.active && child.getBounds().right < 0) {
              // Stop any tweens associated with the object before killing
              const tween = child.getData('bobTween');
              if (tween) {
                  tween.stop();
                  child.setData('bobTween', null); // Clear data
              }

              const hoverTween = child.getData('hoverTween');
              if (hoverTween) {
                  hoverTween.stop();
                  child.setData('hoverTween', null); // Clear data
              }

              // Properly disable physics body
              if (child.body) {
                  child.body.enable = false;
                  // Reset velocity
                  child.body.velocity.x = 0;
                  child.body.velocity.y = 0;
              }

              // Deactivate the object
              group.killAndHide(child);
          }
      });
  }

  /**
   * Gradually increases scroll speed and decreases spawn delay over time.
   */
  increaseDifficulty(deltaSeconds) {
      this.scrollSpeed = Math.min(
          this.scrollSpeed + this.speedIncreaseFactor * deltaSeconds,
          this.maxScrollSpeed
      );
      this.spawnDelay = Math.max(
          this.spawnDelay - this.spawnDecreaseFactor * deltaSeconds,
          this.minSpawnDelay
      );

      if (this.coinSpawnTimer) this.coinSpawnTimer.delay = this.spawnDelay * 1.1; // Coins slightly more frequent
      if (this.enemySpawnTimer) this.enemySpawnTimer.delay = this.spawnDelay; // Enemies use base delay
      if (this.gapSpawnTimer) this.gapSpawnTimer.delay = Math.max(this.spawnDelay * 1.8, this.minSpawnDelay * 2.5); // Pits less frequent
  }

  /**
   * Handles jump input from touch or mouse click.
   */
  handleJumpInput() {
      if (this.gameOver) {
          this.restartGame();
          return; // Don't process jump if game over
      }

      // Check for buffered jump on landing (if jump button wasn't pressed this exact frame)
      if (this.player.body.touching.down && this.jumpBufferCounter > 0) {
          this.player.setVelocityY(-575);
          this.coyoteTimeCounter = 0;
          this.jumpBufferCounter = 0;
          this.jumpEmitter.explode(8, this.player.x, this.player.y + this.player.displayHeight / 2);
          if (this.sounds.jump) this.sounds.jump.play();
          this.hasDoubleJumped = false; // Reset double jump as we're doing a ground jump
          this.triggerStretchTween(); // Stretch on buffered jump (pointer)
          return; // Jump executed, skip other jump logic for this input
      }

      // Check for initial jump (Ground OR Coyote Time)
      if (this.player.body.touching.down || this.coyoteTimeCounter > 0) {
          this.player.setVelocityY(-575); // Match keyboard jump strength
          this.coyoteTimeCounter = 0; // Consume jump/coyote time
          this.jumpBufferCounter = 0; // Clear buffer
          this.jumpEmitter.explode(8, this.player.x, this.player.y + this.player.displayHeight / 2);
          if (this.sounds.jump) this.sounds.jump.play();
          this.triggerStretchTween(); // Stretch on initial jump (pointer)
      }
      // Check for double jump (Only if in air and haven't double jumped)
      else if (!this.player.body.touching.down && !this.hasDoubleJumped) {
          this.player.setVelocityY(-500);
          this.hasDoubleJumped = true;
          this.coyoteTimeCounter = 0; // Consume jump
          this.jumpBufferCounter = 0; // Clear buffer
          this.doubleJumpEmitter.explode(12, this.player.x, this.player.y);
          if (this.sounds.doublejump) this.sounds.doublejump.play();
          this.triggerStretchTween(); // Stretch on double jump (pointer)
      }
      // If in air and cannot double jump (and not game over), buffer the jump for pointer input
      else if (!this.player.body.touching.down && !this.gameOver) {
           this.jumpBufferCounter = this.jumpBufferDuration;
      }
  }

  /**
   * Initializes the timers for spawning coins and enemies.
   */
  startSpawning() {
      if (this.coinSpawnTimer) this.coinSpawnTimer.remove(false);
      if (this.enemySpawnTimer) this.enemySpawnTimer.remove(false);
      if (this.gapSpawnTimer) this.gapSpawnTimer.remove(false); // Clear existing gap timer

      // Spawn coins
      this.coinSpawnTimer = this.time.addEvent({
          delay: this.spawnDelay * 1.1, // Start slightly less frequent than enemies
          callback: this.spawnCoin,
          callbackScope: this,
          loop: true
      });

      // Spawn enemies (ground or flying)
      this.enemySpawnTimer = this.time.addEvent({
           delay: this.spawnDelay,
           callback: this.spawnEnemyType, // Calls the new function
           callbackScope: this,
           loop: true
       });

      // Spawn pits
      this.gapSpawnTimer = this.time.addEvent({
          delay: this.spawnDelay * 2.0, // Pits are less frequent initially
          callback: this.spawnPit,
          callbackScope: this,
          loop: true
      });
  }

  /**
   * Sets up a consistent coin hitbox.
   */
  setupCoinHitbox(coin) {
      // Ensure physics body exists and is enabled FIRST
      if (!coin.body || !coin.body.enable) {
          this.physics.world.enable(coin);
          if (coin.body) coin.body.enable = true; // Make sure it's really enabled
          else {
               console.error("Failed to enable physics body for coin");
               return; // Cannot proceed without a body
          }
      }
      // Double check just in case
      if (coin.body && !coin.body.enable) {
          console.warn("Coin body still not enabled before setSize/Offset");
          coin.body.enable = true; // Try again
      }

      // Make sure target sizes are defined
      if (!this.targetSizes || !this.targetSizes.coin) {
          console.warn('Target size for coin not defined, using default');
          const width = 20;
          const height = 20;
          coin.body.setSize(width, height);
          // Center default hitbox
          coin.body.setOffset((coin.width * coin.scaleX - width) / 2, (coin.height * coin.scaleY - height) / 2);
          return;
      }

      // Use target dimensions directly for calculation
      const targetWidth = coin.width ;
      const targetHeight = coin.height;

      // Create hitbox based on target sprite dimensions
      const hitboxWidth = targetWidth * 0.7;
      const hitboxHeight = targetHeight * 0.7;

      // Calculate offset to center the hitbox within the target dimensions
      const offsetX = (targetWidth - hitboxWidth) / 2;
      const offsetY = (targetHeight - hitboxHeight) / 2;

      coin.body.setSize(hitboxWidth, hitboxHeight);
      coin.body.setOffset(offsetX, offsetY);

      console.log(`Coin hitbox SET: width=${hitboxWidth}, height=${hitboxHeight}, offsetX=${offsetX}, offsetY=${offsetY}, targetWidth=${targetWidth}, targetHeight=${targetHeight}`);

      // Enable physics properties
      coin.body.allowGravity = false;
      coin.body.immovable = true;
  }

  /**
   * Spawns a coin with a bobbing animation.
   */
  spawnCoin() {
      if (this.gameOver) return;

      const { width, height } = this.scale;
      const spawnY = Phaser.Math.Between(height * 0.4, this.groundY - 60); // Ensure space below for bobbing

      // Use explicit texture key when creating the coin
      let coin = this.coins.get(width + 50, spawnY, 'coin');

      if (!coin) {
          // If no recycled coin available, create one with explicit texture
          coin = this.physics.add.sprite(width + 50, spawnY, 'coin');
          coin.setTexture('coin'); // Explicitly set texture
          this.coins.add(coin);
      } else {
          // Explicitly re-enable the physics body for recycled objects
          this.physics.world.enable(coin);
          if(coin.body) coin.body.enable = true;
      }

      if (coin) {
          // Reset the coin position and make it visible
          coin.setPosition(width + 50, spawnY);
          coin.setActive(true).setVisible(true);

          // Scale the coin to target size
          this.scaleToTargetSize(coin, 'coin');

          // Force the game to calculate the display dimensions
          coin.setDisplaySize(coin.width * coin.scaleX, coin.height * coin.scaleY);

          // Force enable physics body
          if (!coin.body || !coin.body.enable) {
              this.physics.world.enable(coin);
          }

          // Setup physics body and hitbox
          this.setupCoinHitbox(coin);

          // Add bobbing tween
          if (coin.getData('bobTween')) {
              coin.getData('bobTween').stop();
          }

          const bobTween = this.tweens.add({
              targets: coin,
              y: spawnY - 10, // Bob up
              duration: 700 + Math.random() * 300, // Randomize duration slightly
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1
          });
          coin.setData('bobTween', bobTween); // Store tween reference
      }
  }

  /**
   * Decides whether to spawn a ground or flying enemy and calls the appropriate function.
   */
  spawnEnemyType() {
      if (this.gameOver) return;
      // Example: 70% chance for ground enemy, 30% for flying
      if (Math.random() < 0.7) {
          this.spawnGroundEnemy();
      } else {
          this.spawnFlyingEnemy();
      }
  }


  /**
   * Spawns a ground enemy (Tax Man).
   */
  spawnGroundEnemy() {
      const { width } = this.scale;
      const platformTop = this.groundY; // Position at the top of the platform

      // Use explicit texture key
      let enemy = this.enemies.get(width + 100, platformTop, 'enemy');

      if (!enemy) {
          // If no recycled enemy available, create one with explicit texture
          enemy = this.physics.add.sprite(width + 100, platformTop, 'enemy');
          enemy.setTexture('enemy'); // Explicitly set texture
          this.enemies.add(enemy);
      } else {
          // Explicitly re-enable the physics body for recycled objects
          this.physics.world.enable(enemy);
          if(enemy.body) {
              enemy.body.enable = true;
              enemy.body.reset(width + 100, platformTop); // Reset physics state
          }
      }

      if (enemy) {
          // Reset enemy position and make it visible
          enemy.setPosition(width + 100, platformTop);
          enemy.setOrigin(0.5, 1);
          enemy.setActive(true).setVisible(true);
          enemy.setDepth(1.5); // Above platform but below player

          // Scale enemy to target size
          this.scaleToTargetSize(enemy, 'enemy');

          // Setup physics body and hitbox
          this.setupEnemyHitbox(enemy, 'enemy');
      }
  }

  /**
   * Spawns a flying enemy (Tax Drone) at a variable height.
   */
  spawnFlyingEnemy() {
      const { width, height } = this.scale;
      // Spawn between 30% height and just above ground enemy height
      const spawnY = Phaser.Math.Between(height * 0.3, this.groundY - 80);

      // Use explicit texture key
      let enemy = this.flyingEnemies.get(width + 100, spawnY, this.flyingEnemyKey);

      if (!enemy) {
          // If no recycled enemy available, create one with explicit texture
          enemy = this.physics.add.sprite(width + 100, spawnY, this.flyingEnemyKey);
          enemy.setTexture(this.flyingEnemyKey); // Explicitly set texture
          this.flyingEnemies.add(enemy);
      } else {
           // Explicitly re-enable the physics body for recycled objects
          this.physics.world.enable(enemy);
          if(enemy.body) {
              enemy.body.enable = true;
              enemy.body.reset(width + 100, spawnY); // Reset physics state
          }
      }

      if (enemy) {
          // Reset enemy position and make it visible
          enemy.setPosition(width + 100, spawnY);
          enemy.setOrigin(0.5, 0.5);
          enemy.setActive(true).setVisible(true);

          // Scale enemy to target size
          this.scaleToTargetSize(enemy, 'flyingEnemy');

          // Setup physics body and hitbox
          this.setupEnemyHitbox(enemy, 'flyingEnemy');

          // Remove any existing tweens
          if (enemy.getData('hoverTween')) {
              enemy.getData('hoverTween').stop();
          }

          // Add subtle hovering movement
          const hoverTween = this.tweens.add({
              targets: enemy,
              y: spawnY + 15,
              duration: 1500,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: -1
          });
          enemy.setData('hoverTween', hoverTween);
      }
  }

  /**
   * Sets up a consistent enemy hitbox based on enemy type.
   */
  setupEnemyHitbox(enemy, enemyType) {
      // Ensure physics body exists and is enabled FIRST
      if (!enemy.body || !enemy.body.enable) {
          this.physics.world.enable(enemy);
          if (enemy.body) enemy.body.enable = true; // Make sure it's really enabled
          else {
               console.error(`Failed to enable physics body for ${enemyType}`);
               return; // Cannot proceed without a body
          }
      }
      // Double check just in case
      if (enemy.body && !enemy.body.enable) {
          console.warn(`${enemyType} body still not enabled before setSize/Offset`);
          enemy.body.enable = true; // Try again
      }

      // Make sure target sizes are defined
      if (!this.targetSizes || !this.targetSizes[enemyType]) {
          console.warn(`No target size defined for enemy type: ${enemyType}, using default`);
          const width = 25;
          const height = 35;
          enemy.body.setSize(width, height);
          // Center default hitbox
          enemy.body.setOffset((enemy.width * enemy.scaleX - width) / 2, (enemy.height * enemy.scaleY - height) / 2);
          return;
      }

      // Use target dimensions directly for calculation
      const targetWidth = enemy.width;
      const targetHeight = enemy.height;

      // Create hitbox based on target sprite dimensions
      const hitboxWidth = targetWidth * 0.7;
      const hitboxHeight = targetHeight * 0.7;

      // Calculate offset to center the hitbox within the target dimensions
      const offsetX = (targetWidth - hitboxWidth) / 2;
      const offsetY = (targetHeight - hitboxHeight) / 2;

      enemy.body.setSize(hitboxWidth, hitboxHeight);
      enemy.body.setOffset(offsetX, offsetY);

      console.log(`${enemyType} hitbox SET: width=${hitboxWidth}, height=${hitboxHeight}, offsetX=${offsetX}, offsetY=${offsetY}, targetWidth=${targetWidth}, targetHeight=${targetHeight}`);

      // Enable physics properties
      enemy.body.allowGravity = false;
      enemy.body.immovable = true;
  }

  /**
   * Called when the player overlaps with a coin. Triggers effects.
   */
  collectCoin(player, coin) {
      if (!coin.active) return;

      // Play coin sound
      if (this.sounds.coin) {
          this.sounds.coin.play({ volume: 0.7 });
      }

      // Get coin position for effects
      const coinX = coin.x;
      const coinY = coin.y;

      // Trigger particle burst at coin location
      this.coinEmitter.explode(15, coinX, coinY);

      // Stop bobbing tween before killing
      const tween = coin.getData('bobTween');
      if (tween) {
          tween.stop();
          coin.setData('bobTween', null);
      }

      this.coins.killAndHide(coin);
      if(coin.body) coin.body.enable = false;

      // --- COMBO SYSTEM ---
      // Check time since last coin for combo
      const now = this.time.now;
      const comboTimeWindow = 1500; // Window for combo in ms

      if (now - this.lastCoinCollectTime < comboTimeWindow) {
          // Continue combo
          this.comboCount++;

          // Flash combo text with increasing size based on combo count
          const comboScale = Math.min(1 + (this.comboCount * 0.05), 1.5);

          this.comboText.setText(`${this.comboCount}x COMBO!`);
          this.comboText.setAlpha(1);
          this.comboText.setScale(comboScale);

          // Tween to animate the combo text
          this.tweens.add({
              targets: this.comboText,
              scale: comboScale * 1.2,
              duration: 100,
              ease: 'Bounce.easeOut',
              yoyo: true,
              onComplete: () => {
                  this.tweens.add({
                      targets: this.comboText,
                      alpha: 0,
                      delay: 400,
                      duration: 200
                  });
              }
          });

          // Clear existing combo timer
          if (this.comboTimer) {
              this.comboTimer.remove();
          }

          // Set score multiplier based on combo (max 3x for 5+ combo)
          if (this.comboCount >= 8) {
              this.scoreMultiplier = 4;
          } else if (this.comboCount >= 5) {
              this.scoreMultiplier = 3;
          } else if (this.comboCount >= 3) {
              this.scoreMultiplier = 2;
          } else {
              this.scoreMultiplier = 1;
          }
      } else {
          // Reset combo
          this.comboCount = 1;
          this.scoreMultiplier = 1;
      }

      // Display multiplier if greater than 1
      if (this.scoreMultiplier > 1) {
          this.multiplierText.setText(`${this.scoreMultiplier}x`);
          this.multiplierText.setAlpha(1);
      } else {
          this.multiplierText.setAlpha(0);
      }

      // Set combo timer to reset after window expires
      this.comboTimer = this.time.delayedCall(comboTimeWindow, () => {
          this.comboCount = 0;
          this.scoreMultiplier = 1;
          this.multiplierText.setAlpha(0);
      });

      // Update time of last coin collection
      this.lastCoinCollectTime = now;

      // Calculate score with multiplier
      const baseScore = 10;
      const scoreValue = baseScore * this.scoreMultiplier;

      // Update total score
      this.score += scoreValue;
      this.scoreText.setText('Score: ' + this.score);

      // Show floating score text at coin position
      this.showFloatingScore(scoreValue, coinX, coinY);

      // Trigger mini-hitstop for satisfaction (very brief)
      if (this.comboCount > 1) {
          this.physics.pause();
          this.time.delayedCall(30, () => {
              this.physics.resume();
          });
      }

      // Add small screen flash on coin collection that increases with combo
      const flashAlpha = 0.1 + (Math.min(this.comboCount, 10) * 0.02);
      this.flashScreen(0xf8d700, flashAlpha, 100);

      this.coinsCollectedForPowerUp++;

      if (!this.powerUpActive && this.coinsCollectedForPowerUp >= 20) {
          this.triggerPowerUp();
          this.coinsCollectedForPowerUp = 0;
      }
  }

  /**
   * Shows floating score text at the given position
   * @param {number} amount - Score amount to display
   * @param {number} x - X position
   * @param {number} y - Y position
   */
  showFloatingScore(amount, x, y) {
      const color = this.scoreMultiplier > 1 ? '#f8d700' : '#ffffff';
      const fontSize = 16 + (this.scoreMultiplier * 2); // Larger for higher multiplier

      // Create text
      const floatingText = this.add.text(
          x,
          y,
          `+${amount}`,
          { fontSize: `${fontSize}px`, fill: color, fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }
      ).setOrigin(0.5);

      // Add to tracking array for cleanup
      this.scorePopups.push(floatingText);

      // Animate the text
      this.tweens.add({
          targets: floatingText,
          y: y - 50,
          alpha: 0,
          scale: 1.5,
          duration: 800,
          ease: 'Cubic.easeOut',
          onComplete: () => {
              // Remove from tracking array
              const index = this.scorePopups.indexOf(floatingText);
              if (index > -1) {
                  this.scorePopups.splice(index, 1);
              }
              // Destroy text object
              floatingText.destroy();
          }
      });
  }

  /**
   * Activates the "Business Power Surge" power-up. Starts effects.
   */
  triggerPowerUp() {
      if (this.powerUpActive) return; // A power-up is already active

      const powerUpPool = ['speed', 'shield'];
      this.activePowerUpType = Phaser.Math.RND.pick(powerUpPool);

      this.powerUpActive = true;
      this.coinsCollectedForPowerUp = 0; // Reset counter

      // Common setup
      // Add dramatic power-up activation effects
      this.cameras.main.shake(150, 0.005);

      // Freeze frames - dramatic activation pause
      this.physics.pause();
      this.time.delayedCall(150, () => {
          this.physics.resume();
      });

      // Global camera zoom effect
      this.cameras.main.zoomTo(
          this.cameraOriginalZoom * 1.1,
          200,
          'Back.easeOut',
          true,
          (camera, progress) => {
              if (progress === 1) {
                  camera.zoomTo(this.cameraOriginalZoom, 300, 'Sine.easeInOut');
              }
          }
      );

      // Common duration timer for all power-ups
      this.powerUpTimer = this.time.delayedCall(this.powerUpDuration, this.endPowerUp, [], this);

      if (this.activePowerUpType === 'speed') {
          // Speed power-up effects
          this.player.setTint(0xffff00); // Yellow tint for speed

          // Power-up particle effect - more intense
          if (!this.powerUpEmitter.active) {
              // Enhanced configuration
              this.powerUpEmitter.setConfig({
                  speed: { min: 80, max: 120 },
                  scale: { start: 0.5, end: 0 },
                  blendMode: Phaser.BlendModes.ADD,
                  lifespan: 400,
                  frequency: 40, // More frequent particles
                  tint: [0xffff00, 0xf8d700, 0xff8800], // Multiple colors for variation
                  follow: this.player,
                  followOffset: { x: -this.player.width * 0.5, y: 0 }
              });
          }
          this.powerUpEmitter.start(); // Start particle trail

          // Create shockwave effect around player
          const shockwave = this.add.circle(this.player.x, this.player.y, 10, 0xffff00, 0.7);
          shockwave.setDepth(3);
          this.tweens.add({
              targets: shockwave,
              radius: 150,
              alpha: 0,
              duration: 600,
              ease: 'Cubic.easeOut',
              onComplete: () => {
                  shockwave.destroy();
              }
          });

          // Start flashing timer for speed
          this.powerUpFlashEvent = this.time.addEvent({
              delay: 100, // Faster flashing
              callback: () => {
                  if(this.player && this.player.active) {
                      // Instead of just toggling visibility, alternate between yellow and white tint
                      if (this.player.tintTopLeft === 0xffff00) {
                          this.player.setTint(0xffffff);
                      } else {
                          this.player.setTint(0xffff00);
                      }
                  }
              },
              loop: true
          });

          // Bright screen flash with yellow
          this.flashScreen(0xffff00, 0.6, 300);

          if (this.sounds.powerup) this.sounds.powerup.play();
          this.powerUpText.setText('Power Surge!');
      } else if (this.activePowerUpType === 'shield') {
          // Shield setup
          if (!this.shieldSprite) {
              this.shieldSprite = this.add.sprite(this.player.x, this.player.y, this.shieldTextureKey)
                  .setDepth(this.player.depth - 0.1) // Slightly behind player
                  .setAlpha(0) // Start invisible for animation
                  .setScale(0.5); // Start small for animation
          }

          this.shieldSprite.setActive(true).setVisible(true);
          this.shieldSprite.setPosition(this.player.x, this.player.y);

          // Shield activation animation
          this.tweens.add({
              targets: this.shieldSprite,
              alpha: 0.8,
              scale: 1.5,
              duration: 300,
              ease: 'Back.easeOut',
              onComplete: () => {
                  // Add pulsing effect to shield
                  this.tweens.add({
                      targets: this.shieldSprite,
                      scale: { from: 1.5, to: 1.7 },
                      alpha: { from: 0.8, to: 0.6 },
                      duration: 900,
                      yoyo: true,
                      repeat: -1,
                      ease: 'Sine.easeInOut'
                  });
              }
          });

          // Add shield particles
          const shieldEmitter = this.add.particles(this.player.x, this.player.y, this.particleTextureKey, {
              scale: { start: 0.5, end: 0 },
              alpha: { start: 0.5, end: 0 },
              speed: 50,
              lifespan: 1000,
              blendMode: Phaser.BlendModes.ADD,
              tint: 0x00ccff,
              frequency: 50,
              follow: this.player
          });

          // Set a timer to destroy the emitter when power-up ends
          this.time.delayedCall(this.powerUpDuration, () => {
              shieldEmitter.destroy();
          });

          // Screen flash with blue/cyan for shield
          this.flashScreen(0x00ccff, 0.5, 300);

          if (this.sounds.shieldActivate) this.sounds.shieldActivate.play();
          this.powerUpText.setText('Shield Active!');
      }

      // Camera rotation for both power-up types
      this.cameras.main.rotate(3);
      this.tweens.add({
          targets: this.cameras.main,
          rotation: 0,
          duration: 500,
          ease: 'Back.easeOut'
      });
  }

  /**
   * Ends the power-up state. Stops effects.
   */
  endPowerUp() {
      const endedPowerUpType = this.activePowerUpType;

      this.powerUpActive = false;
      this.activePowerUpType = null;

      // Clear common visual/audio cues if they aren't handled by specific power-up logic
      this.powerUpText.setText('');

      // Stop and clear common flashing timer
      if (this.powerUpFlashEvent) {
          this.powerUpFlashEvent.remove(false);
          this.powerUpFlashEvent = null;
      }
      // Ensure duration timer is cleared (though it calls this function, good for explicit clear if called elsewhere)
      if (this.powerUpTimer) {
          this.powerUpTimer.remove(false);
          this.powerUpTimer = null;
      }

      if (endedPowerUpType === 'speed') {
          if(this.player && this.player.active) {
              this.player.clearTint();
              this.player.setVisible(true); // Ensure player is visible after flashing
          }
          if(this.powerUpEmitter) this.powerUpEmitter.stop();
      } else if (endedPowerUpType === 'shield') {
          if (this.shieldSprite) {
              this.shieldSprite.setVisible(false);
              // Optionally play a shield down sound if it didn't break
              // if (this.sounds.shieldDeactivate) this.sounds.shieldDeactivate.play();
          }
      }
  }

   /**
   * Updates the display text for the power-up timer.
   */
   updatePowerUpDisplay() {
      if (this.powerUpActive && this.powerUpTimer) {
          const remaining = Math.ceil(this.powerUpTimer.getRemainingSeconds());
          if (this.activePowerUpType === 'speed') {
            this.powerUpText.setText(`Power Surge: ${remaining}s`);
          } else if (this.activePowerUpType === 'shield') {
            this.powerUpText.setText(`Shield: ${remaining}s`);
          }
      } else if (!this.powerUpActive && this.powerUpText.text !== '' && this.powerUpText.text !== 'Shield Broken!') {
           this.powerUpText.setText('');
      }
  }


  /**
   * Called when the player collides with any enemy. Triggers effects and ends game.
   */
  hitEnemy(player, enemy) {
      if (this.gameOver) return;

      // Shield Power-up check
      if (this.activePowerUpType === 'shield' && this.powerUpActive) {
          if (this.sounds.shieldHit) this.sounds.shieldHit.play();

          if (this.shieldSprite) {
              this.shieldSprite.setVisible(false); // Hide shield
              // Maybe add a small particle burst for shield breaking
              // this.shieldBreakEmitter.explodeAt(this.player.x, this.player.y);
          }

          this.powerUpActive = false;
          this.activePowerUpType = null;

          // Clear the main power-up timer since shield broke early
          if (this.powerUpTimer) {
              this.powerUpTimer.remove(false);
              this.powerUpTimer = null;
          }

          this.powerUpText.setText('Shield Broken!');
          this.time.delayedCall(1200, () => {
              // Only clear if it's still "Shield Broken!" and no new power-up started
              if (this.powerUpText.text === 'Shield Broken!' && !this.powerUpActive) {
                  this.powerUpText.setText('');
              }
          }, [], this);

          // Make player flash briefly to indicate invulnerability / shield hit
          player.setAlpha(0.5);
          this.time.delayedCall(200, () => {
              player.setAlpha(1);
          }, [], this);

          return; // Player is safe, shield absorbed the hit
      }

      // Play hit sound (if no shield)
      if (this.sounds.hit) {
          this.sounds.hit.play();
      }

      // Add camera shake
      this.cameras.main.shake(250, 0.008); // Duration 250ms, intensity 0.008

      this.endGame();
  }

  /**
   * Handles the game over sequence with delay and fade.
   */
  endGame() {
      if (this.gameOver) return;

      this.gameOver = true;
      this.physics.pause();
      this.player.setTint(0xff0000);
      this.player.anims.stop();
      this.player.setVisible(true); // Ensure visible after potential flashing

      // Stop spawning & powerup effects immediately
      this.cleanupTimers();
      if(this.powerUpEmitter) this.powerUpEmitter.stop(); // Ensure trail stops

      // Force end power-up state visually if active
      if (this.powerUpActive) {
           if (this.activePowerUpType === 'speed' && this.player && this.player.active) {
               this.player.clearTint();
               this.player.setVisible(true);
           } else if (this.activePowerUpType === 'shield' && this.shieldSprite) {
               this.shieldSprite.setVisible(false);
           }
           this.powerUpActive = false;
           this.activePowerUpType = null;
           this.powerUpText.setText('');
      }

      // Fade out, then show game over text and fade back in
      this.cameras.main.fadeOut(400, 0, 0, 0, (camera, progress) => {
          if (progress === 1) {
               // Display Game Over UI after fade out completes
              this.gameOverText.setText(`Game Over\nScore: ${this.score}`).setVisible(true);
              this.restartText.setVisible(true);
              // Fade back in
              this.cameras.main.fadeIn(400, 0, 0, 0);
              // Add input listeners specifically for restarting *after* fade in starts
              this.input.keyboard.once('keydown-SPACE', this.restartGame, this);
          }
      });
  }

  /**
   * Restarts the current game scene.
   */
  restartGame() {
      if (!this.gameOver || this.cameras.main.fadeEffect.isRunning) return; // Prevent restart during fade

      this.cleanupTimers();
      this.input.keyboard.off('keydown-SPACE', this.restartGame, this); // Remove listener

      // Reset camera effects before restarting
      this.cameras.main.resetFX();

      // Save player scale to restore after restart
      const playerScaleData = {
          scaleX: this.playerScaleX,
          scaleY: this.playerScaleY,
          originalWidth: this.playerOriginalWidth,
          originalHeight: this.playerOriginalHeight
      };

      // Store scale data in the scene's data manager to persist across restart
      this.data.set('playerScaleData', playerScaleData);

      this.scene.restart();
  }

  /**
   * Safely removes and nullifies all active timers.
   */
  cleanupTimers() {
      if (this.coinSpawnTimer) this.coinSpawnTimer.remove(false);
      if (this.enemySpawnTimer) this.enemySpawnTimer.remove(false);
      if (this.powerUpTimer) this.powerUpTimer.remove(false);
      if (this.powerUpFlashEvent) this.powerUpFlashEvent.remove(false);
      if (this.gapSpawnTimer) this.gapSpawnTimer.remove(false); // Cleanup gap timer
      if (this.comboTimer) this.comboTimer.remove(false); // Cleanup combo timer
      this.coinSpawnTimer = null;
      this.enemySpawnTimer = null;
      this.powerUpTimer = null;
      this.powerUpFlashEvent = null;
      this.gapSpawnTimer = null; // Nullify gap timer
      this.comboTimer = null; // Nullify combo timer
  }

  /**
   * Scales a game object to the target size if needed.
   * @param {Phaser.GameObjects.Sprite} gameObject - The sprite to scale
   * @param {string} objectType - The type of object (player, coin, enemy, etc.)
   */
  scaleToTargetSize(gameObject, objectType) {
      if (!this.targetSizes || !this.targetSizes[objectType]) return;

      // For player, check if we have stored scale data to restore
      if (objectType === 'player' && this.data && this.data.has('playerScaleData')) {
          const scaleData = this.data.get('playerScaleData');
          gameObject.setScale(scaleData.scaleX, scaleData.scaleY);
          this.playerOriginalWidth = scaleData.originalWidth;
          this.playerOriginalHeight = scaleData.originalHeight;
          this.playerScaleX = scaleData.scaleX;
          this.playerScaleY = scaleData.scaleY;
          return;
      }

      // Get the current and target dimensions
      const target = this.targetSizes[objectType];
      const current = {
          width: gameObject.width,
          height: gameObject.height
      };

      // Calculate and apply scale if needed
      if (current.width !== target.width || current.height !== target.height) {
          const scaleX = target.width / current.width;
          const scaleY = target.height / current.height;
          gameObject.setScale(scaleX, scaleY);
      }
  }

  /**
   * Removes a background color from a texture by recreating it with transparency.
   * @param {string} textureKey - The key of the texture to process
   * @param {number} colorValue - The hex color value to make transparent
   * @note It is generally better to pre-process assets to have transparent backgrounds.
   */
  removeBackgroundColor(textureKey, colorValue) {
      try {
          // Get the original texture
          const texture = this.textures.get(textureKey);
          if (!texture) return false;

          // Convert hex to RGB
          const r = (colorValue >> 16) & 0xFF;
          const g = (colorValue >> 8) & 0xFF;
          const b = colorValue & 0xFF;

          // Create a canvas to process the image
          const source = texture.getSourceImage();
          if (!source) return false;

          // Create a canvas to draw and process the image
          const canvas = document.createElement('canvas');
          canvas.width = source.width;
          canvas.height = source.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(source, 0, 0);

          // Get the image data from the canvas
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Replace background color with transparency
          for (let i = 0; i < data.length; i += 4) {
              // Check if this pixel is close to the target color (with tolerance)
              const isBackground =
                  Math.abs(data[i] - r) < 30 &&
                  Math.abs(data[i+1] - g) < 30 &&
                  Math.abs(data[i+2] - b) < 30;

              if (isBackground) {
                  data[i+3] = 0; // Set alpha to transparent
              }
          }

          // Put the processed image data back on the canvas
          ctx.putImageData(imageData, 0, 0);

          // Create a new texture from the processed canvas
          const newTexture = this.textures.addCanvas(`${textureKey}_transparent`, canvas);

          // Now update all sprites that use this texture to use the new one
          this.children.each(child => {
              if (child.texture && child.texture.key === textureKey) {
                  child.setTexture(`${textureKey}_transparent`);
              }
          });

          return true;
      } catch (error) {
          console.warn(`Failed to remove background color for ${textureKey}:`, error);
          return false;
      }
  }

  /**
   * Creates a simple colored texture if a texture key doesn't exist.
   */
  ensureTextureExists(key, width, height, colorHex, circle = false) {
      if (!this.textures.exists(key)) {
          console.warn(`Creating placeholder for missing texture: ${key}`);

          const gfx = this.make.graphics({ x: 0, y: 0 }, false);
          gfx.fillStyle(parseInt(colorHex, 16), 1);
          if (circle) {
              gfx.fillCircle(width / 2, height / 2, Math.min(width, height) / 2);
          } else {
              gfx.fillRect(0, 0, width, height);

              // Add texture pattern to make placeholder more visible
              const darkColor = Phaser.Display.Color.ValueToColor(parseInt(colorHex, 16)).darken(30).color;
              gfx.lineStyle(2, darkColor);
              gfx.strokeRect(2, 2, width-4, height-4);

              // Add an X to show it's a placeholder
              gfx.beginPath();
              gfx.moveTo(4, 4);
              gfx.lineTo(width-4, height-4);
              gfx.moveTo(width-4, 4);
              gfx.lineTo(4, height-4);
              gfx.strokePath();
          }
          gfx.generateTexture(key, width, height);
          gfx.destroy();

          // If this is an enemy, try to load directly from the assets folder
          if (key === 'enemy') {
              // Create a direct image element for the enemy
              const img = new Image();
              img.crossOrigin = "Anonymous";
              img.src = 'assets/enemy.png';

              img.onload = () => {
                  console.log("Successfully loaded enemy directly!");
                  this.textures.remove('enemy');
                  this.textures.addImage('enemy', img);

                  // Make white background transparent
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);

                  // Replace white pixels with transparency
                  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                  const data = imageData.data;
                  for (let i = 0; i < data.length; i += 4) {
                      // If pixel is white or very light, make transparent
                      if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
                          data[i+3] = 0; // Set transparent
                      }
                  }

                  ctx.putImageData(imageData, 0, 0);
                  this.textures.remove('enemy');
                  this.textures.addCanvas('enemy', canvas);
              };

              img.onerror = () => {
                  console.error("Failed to load enemy directly");
              };
          }
      }
  }

  /**
   * Scene shutdown cleanup.
   */
  shutdown() {
      this.cleanupTimers();
      // Explicitly remove pointerdown listener to prevent duplicates on restart
      this.input.off('pointerdown', this.handleJumpInput, this);

      // Destroy particle emitters to free resources
      if (this.coinEmitter) this.coinEmitter.destroy();
      if (this.jumpEmitter) this.jumpEmitter.destroy();
      if (this.doubleJumpEmitter) this.doubleJumpEmitter.destroy();
      if (this.powerUpEmitter) this.powerUpEmitter.destroy();

      // Clean up all environmental emitters
      this.environmentEmitters.forEach(emitter => {
          if (emitter && emitter.destroy) emitter.destroy();
      });
      this.environmentEmitters = [];

      // Clean up any remaining score popups
      this.scorePopups.forEach(popup => {
          if (popup && popup.destroy) popup.destroy();
      });
      this.scorePopups = [];

      // Stop all tweens running in the scene
      this.tweens.killAll();
  }

  /**
   * Removes background color from a spritesheet while preserving animation frames.
   * @param {string} key - The key of the spritesheet
   * @param {number} colorValue - The hex color value to make transparent
   * @note It is generally better to pre-process assets to have transparent backgrounds.
   */
  removeSpritesheetBackground(key, colorValue) {
      try {
          // Get original texture
          const texture = this.textures.get(key);
          if (!texture) return false;

          // Get source dimensions to calculate proper frame size
          const source = texture.getSourceImage();
          if (!source) return false;

          // Calculate frame size based on image dimensions and expected frame count
          // For player sheet, assume 6 frames horizontally, 1 frame vertically
          const totalFrames = 6; // Expected number of frames
          const calculatedFrameWidth = Math.floor(source.width / totalFrames);
          const calculatedFrameHeight = source.height;

          console.log(`Spritesheet dimensions: ${source.width}x${source.height}`);

          // Convert hex to RGB
          const r = (colorValue >> 16) & 0xFF;
          const g = (colorValue >> 8) & 0xFF;
          const b = colorValue & 0xFF;

          // Create a canvas to process the spritesheet
          const canvas = document.createElement('canvas');
          canvas.width = source.width;
          canvas.height = source.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(source, 0, 0);

          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Process each pixel, making the background transparent
          for (let i = 0; i < data.length; i += 4) {
              // Check for background color with tolerance for compression artifacts
              const isBackground =
                  Math.abs(data[i] - r) < 30 &&
                  Math.abs(data[i+1] - g) < 30 &&
                  Math.abs(data[i+2] - b) < 30;

              if (isBackground) {
                  data[i+3] = 0; // Make transparent
              }
          }

          // Update the canvas with processed data
          ctx.putImageData(imageData, 0, 0);

          // Create a new transparent spritesheet with same dimensions
          const frameWidth = calculatedFrameWidth;  // Use dynamically calculated value
          const frameHeight = calculatedFrameHeight; // Use dynamically calculated value

          // Store original frame data
          const frames = [];
          texture.getFrameNames().forEach(frameName => {
              const frame = texture.get(frameName);
              if (frame) {
                  frames.push({
                      name: frameName,
                      sourceIndex: frame.sourceIndex,
                      cutX: frame.cutX,
                      cutY: frame.cutY,
                      cutWidth: frame.cutWidth,
                      cutHeight: frame.cutHeight
                  });
              }
          });

          // Remove old texture and add the new one
          this.textures.remove(key);
          const newTexture = this.textures.addCanvas(key, canvas);

          // Restore frame data for animations
          frames.forEach(frameData => {
              newTexture.add(
                  frameData.name,
                  frameData.sourceIndex,
                  frameData.cutX,
                  frameData.cutY,
                  frameData.cutWidth,
                  frameData.cutHeight
              );
          });

          // Re-add any animation frames if they existed
          if (this.anims.exists(this.playerRunAnimKey)) {
              this.anims.get(this.playerRunAnimKey).frames.forEach(frame => {
                  frame.texture = key;
              });
          }

          if (this.anims.exists(this.playerJumpAnimKey)) {
              this.anims.get(this.playerJumpAnimKey).frames.forEach(frame => {
                  frame.texture = key;
              });
          }

          if (this.anims.exists(this.playerDoubleJumpAnimKey)) {
              this.anims.get(this.playerDoubleJumpAnimKey).frames.forEach(frame => {
                  frame.texture = key;
              });
          }

          if (this.anims.exists(this.playerJumpDownAnimKey)) {
              this.anims.get(this.playerJumpDownAnimKey).frames.forEach(frame => {
                  frame.texture = key;
              });
          }

          return true;
      } catch (error) {
          console.warn(`Failed to remove background from spritesheet ${key}:`, error);
          return false;
      }
  }

  /**
   * Sets up the player hitbox based on the original dimensions and scale.
   */
  setupPlayerHitbox() {
      if (this.playerOriginalWidth > 0 && this.playerOriginalHeight > 0) {
          // Define hitbox size (smaller than the sprite for tighter collisions)
          const hitboxWidth = this.playerOriginalWidth * 0.6;
          const hitboxHeight = this.playerOriginalHeight * 0.85;

          // Calculate offset to center the hitbox on the sprite
          const offsetX = (this.playerOriginalWidth - hitboxWidth) / 2;
          const offsetY = (this.playerOriginalHeight - hitboxHeight) / 2;

          this.player.body.setSize(hitboxWidth, hitboxHeight);
          this.player.body.setOffset(offsetX, offsetY);
      } else {
          console.warn("Player original dimensions not set. Using default hitbox.");
          const hitboxWidth = this.player.width * 0.6;
          const hitboxHeight = this.player.height * 0.85;

          const offsetX = (this.player.width - hitboxWidth) / 2;
          const offsetY = (this.player.height - hitboxHeight) / 2;

          this.player.body.setSize(hitboxWidth, hitboxHeight);
          this.player.body.setOffset(offsetX, offsetY);
      }
  }

  /**
   * Triggers a stretch tween on the player sprite for jumping.
   */
  triggerStretchTween() {
      if (!this.player || !this.player.active) return;
      // Stop any existing scale tween
      if (this.player.scaleTween) {
          this.player.scaleTween.stop();
          // Ensure scale is reset before starting a new tween if one was interrupted.
          this.player.setScale(this.playerScaleX, this.playerScaleY);
      }

      this.player.scaleTween = this.tweens.add({
          targets: this.player,
          scaleX: { from: this.playerScaleX, to: this.playerScaleX * 0.85 },
          scaleY: { from: this.playerScaleY, to: this.playerScaleY * 1.15 },
          duration: 75,
          ease: 'Sine.easeInOut',
          yoyo: true,
          onComplete: () => {
              // Ensure final scale is correct
              if (this.player && this.player.active) {
                this.player.setScale(this.playerScaleX, this.playerScaleY);
              }
              this.player.scaleTween = null;
          },
          onStop: () => { // Also reset on stop if tween is interrupted
              if (this.player && this.player.active) {
                this.player.setScale(this.playerScaleX, this.playerScaleY);
              }
              this.player.scaleTween = null;
          }
      });
  }

  /**
   * Triggers a squash tween on the player sprite for landing.
   */
  triggerSquashTween() {
      if (!this.player || !this.player.active) return;
      // Stop any existing scale tween
      if (this.player.scaleTween) {
          this.player.scaleTween.stop();
          this.player.setScale(this.playerScaleX, this.playerScaleY);
      }

      this.player.scaleTween = this.tweens.add({
          targets: this.player,
          scaleX: { from: this.playerScaleX, to: this.playerScaleX * 1.15 },
          scaleY: { from: this.playerScaleY, to: this.playerScaleY * 0.85 },
          duration: 100,
          ease: 'Sine.easeInOut',
          yoyo: true,
          onComplete: () => {
              if (this.player && this.player.active) {
                this.player.setScale(this.playerScaleX, this.playerScaleY);
              }
              this.player.scaleTween = null;
          },
          onStop: () => {
              if (this.player && this.player.active) {
                this.player.setScale(this.playerScaleX, this.playerScaleY);
              }
              this.player.scaleTween = null;
          }
      });
  }

  /**
   * Spawns a pit obstacle on the platform.
   */
  spawnPit() {
      if (this.gameOver) return;

      const { width } = this.scale;
      // const pitConfig = this.targetSizes.pit; // Removed, using fixed height from lava texture
      const basePitWidth = 120; // Use a base width for randomization
      const pitWidth = Phaser.Math.Between(basePitWidth * 0.75, basePitWidth * 1.25);
      const pitHeight = 32; // Height of our lava texture

      // Spawn point Y aligns with platformSprite's Y
      const spawnY = this.groundY + 10;
      // Spawn X is off-screen to the right, accounting for pit's width for smooth entry
      const spawnX = width + pitWidth / 2 + 20; // Extra 20px buffer

      let pit = this.gapGroup.get(spawnX, spawnY, 'pit_lava'); // Use 'pit_lava' texture

      if (!pit) {
          pit = this.physics.add.sprite(spawnX, spawnY, 'pit_lava'); // Use 'pit_lava' texture
          this.gapGroup.add(pit);
      }

      pit.setActive(true).setVisible(true);
      pit.setPosition(spawnX, spawnY);
      pit.setOrigin(0.5, 0.5);
      pit.setDisplaySize(pitWidth, pitHeight);

      // Ensure physics body is enabled and sized correctly
      if (!pit.body) {
          this.physics.world.enable(pit);
      }
      pit.body.setSize(pitWidth, pitHeight);
      pit.body.setOffset(0,0); // Reset offset, as setDisplaySize might alter it if origin isn't 0,0
      pit.body.enable = true;
      pit.body.allowGravity = false;
      pit.body.immovable = true;

      pit.setDepth(0.6); // Above platform visual (0.5), below player (2) and other enemies (1.5)
  }

  /**
   * Handles player collision with a pit.
   */
  playerFellInPit(player, pit) {
      if (this.gameOver) return;

      // If player is touching the ground (meaning they walked into the pit)
      // and their feet are roughly aligned with or below the pit's center
      if (player.body.touching.down && (player.body.bottom >= pit.body.top + 5)) {
          this.endGame();
      }
  }

  /**
   * Adds enhanced visual/audio feedback for regular jump
   */
  addJumpEffect() {
      // Camera slight upward movement
      this.cameras.main.shake(100, 0.003, false, (camera, progress) => {
          if (progress === 0) {
              // On start, move slightly up
              camera.y -= 3;
          }
          if (progress === 1) {
              // Reset position at end
              camera.y = 0;
          }
      });

      // Screen flash
      this.flashScreen(0xffffff, 0.2, 100);
  }

  /**
   * Adds enhanced visual/audio feedback for double jump
   */
  addDoubleJumpEffect() {
      // Camera slight zoom out
      this.cameras.main.zoomTo(
          this.cameraOriginalZoom * 0.95,
          150,
          'Sine.easeOut',
          true,
          (camera, progress) => {
              if (progress === 1) {
                  // Zoom back to normal
                  camera.zoomTo(this.cameraOriginalZoom, 200, 'Sine.easeOut');
              }
          }
      );

      // Create a circular flash effect
      this.flashScreen(0x00ffff, 0.3, 150);

      // Brief slow motion effect
      this.timeDilationEffect(0.5, 200);
  }

  /**
   * Adds enhanced visual/audio feedback for landing
   */
  addLandingEffect() {
      // Camera shake based on fall duration
      const shakeDuration = Math.min(this.wasInAir * 100, 200);
      const shakeIntensity = Math.min(this.wasInAir * 0.001, 0.005);
      this.cameras.main.shake(shakeDuration, shakeIntensity);

      // Dust particles on landing
      const dustCount = Math.min(5 + Math.floor(this.wasInAir * 3), 15);
      this.jumpEmitter.explode(dustCount, this.player.x, this.player.y + this.player.displayHeight / 2);

      // Screen impact flash
      this.flashScreen(0xffffff, 0.15, 100);
  }

  /**
   * Adds enhanced visual/audio feedback for jump down
   */
  addJumpDownEffect() {
      // Slight camera follow
      this.cameras.main.pan(
          this.player.x,
          this.player.y + 30,
          100,
          'Sine.easeOut',
          true,
          (camera, progress) => {
              if (progress === 1) {
                  // Reset
                  camera.pan(
                      this.player.x,
                      this.player.y,
                      100,
                      'Sine.easeOut'
                  );
              }
          }
      );

      // Screen flash
      this.flashScreen(0xffaa00, 0.2, 100);
  }

  /**
   * Creates a screen flash effect
   * @param {number} color - Hex color for the flash
   * @param {number} alpha - Alpha intensity (0-1)
   * @param {number} duration - Duration in ms
   */
  flashScreen(color, alpha = 0.3, duration = 100) {
      if (!this.screenFlash) return;

      this.screenFlash.setFillStyle(color);
      this.screenFlash.setAlpha(alpha);

      this.tweens.add({
          targets: this.screenFlash,
          alpha: 0,
          duration: duration,
          ease: 'Sine.easeOut'
      });
  }

  /**
   * Creates a time dilation effect
   * @param {number} factor - Factor to slow time (< 1) or speed it up (> 1)
   * @param {number} duration - Duration in ms
   * @param {boolean} smoothTransition - Whether to transition smoothly
   */
  timeDilationEffect(factor, duration = 500, smoothTransition = true) {
      // Clear any existing time warp tweens
      if (this.timeWarpTween) {
          this.timeWarpTween.stop();
      }

      if (smoothTransition) {
          // Smoothly transition time dilation
          this.timeWarpTween = this.tweens.add({
              targets: this,
              timeDilation: factor,
              duration: duration / 3,
              ease: 'Sine.easeOut',
              onComplete: () => {
                  // Return to normal
                  this.timeWarpTween = this.tweens.add({
                      targets: this,
                      timeDilation: 1,
                      duration: duration * 2/3,
                      ease: 'Sine.easeInOut'
                  });
              }
          });
      } else {
          // Immediate time dilation
          this.timeDilation = factor;

          // Schedule return to normal
          this.time.delayedCall(duration, () => {
              this.timeDilation = 1;
          });
      }
  }
}

// --- Phaser Game Configuration ---
const config = {
  type: Phaser.AUTO,
  scale: {
      mode: Phaser.Scale.FIT,
      parent: 'game-container',
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 800, // Smaller width
      height: 450, // Smaller height
  },
   render: {
      pixelArt: true
  },
  physics: {
      default: 'arcade',
      arcade: {
          // gravity: { y: 0 }, // Global gravity not needed
          debug: false, // Disable hitbox visualization
          // Remove other debug settings as they are now irrelevant
          // debugShowBody: true,
          // debugShowStaticBody: true,
          // debugBodyColor: 0xff00ff,
          // debugStaticBodyColor: 0x0000ff,
          // debugShowVelocity: true,
          // debugVelocityColor: 0xffff00
      }
  },
  scene: [GameScene]
};

// --- Initialize Phaser Game ---
window.onload = () => {
  const game = new Phaser.Game(config);

  // Apply custom CSS for minimalistic and aesthetically pleasing styling
  applyCustomStyles();
};

/**
 * Applies custom CSS styles to the game container and page
 */
function applyCustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes gradientMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    body {
      margin: 0;
      padding: 0;
      /* Animated purple gradient background */
      background: linear-gradient(-45deg, #ee7752, #e73c7e, #673ab7, #23a6d5, #23d5ab);
      background-size: 400% 400%;
      animation: gradientMove 15s ease infinite;

      font-family: 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      flex-direction: column; /* Stack title and game */
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      overflow: hidden;
    }

    #game-container {
         margin-top: 10px; /* Add some space below title */
         margin-bottom: 10px; /* Add some space above controls */
         box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
         border-radius: 8px;
         overflow: hidden; /* Keep canvas contained */
    }

    /* Remove hover effect for consistency */
    /* #game-container:hover {
    } */

    canvas {
      display: block;
      image-rendering: pixelated;
    }

    /* Game UI elements styling handled by Phaser, but we can add additional styling here */
    .game-title {
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 24px;
      font-weight: bold;
      color: #333;
      text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      z-index: 100;
    }

    .game-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 14px;
      color: black;
      text-align: center;
      z-index: 100;
    }

    .game-title img {
      max-width: 200px;
      height: auto;
      display: block;
      margin: 0;
    }
  `;

  // Add the style element to the document head
  document.head.appendChild(style);

  // Create game title element
  const titleElement = document.createElement('div');
  titleElement.classList.add('game-title');
  const logoImg = document.createElement('img');
  logoImg.src = 'assets/logo.png';
  logoImg.alt = 'MYOB Dash';
  titleElement.appendChild(logoImg);

  // Create game controls info
  const controlsElement = document.createElement('div');
  controlsElement.classList.add('game-controls');
  controlsElement.innerHTML = 'SPACE/UP: Jump | Double Tap: Double Jump | DOWN: Fast Fall';

  // Add elements to the page
  const gameContainer = document.getElementById('game-container');
  if (gameContainer) {
    document.body.insertBefore(titleElement, gameContainer);
    document.body.appendChild(controlsElement);
  }
}
