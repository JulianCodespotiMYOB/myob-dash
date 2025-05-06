/**
 * MYOB Dash - Main Entry Point
 * Initializes the Phaser game and sets up styling
 */
import Constants from './config/constants.js';
import GameScene from './scenes/GameScene.js';

// --- Phaser Game Configuration ---
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        parent: 'game-container',
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: Constants.GAME_WIDTH,
        height: Constants.GAME_HEIGHT,
    },
    render: {
        pixelArt: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: Constants.GRAVITY },
            debug: Constants.DEBUG_PHYSICS || false,
            tileBias: 16, // Helps with platform collision detection
            fps: 60
        }
    },
    scene: [GameScene]
};

// --- Initialize Phaser Game ---
window.onload = () => {
    const game = new Phaser.Game(config);

    // Apply custom CSS for styling
    applyCustomStyles();
};

/**
 * Applies custom CSS styles to the game container and page
 */
function applyCustomStyles() {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = `
        body {
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: hidden;
        }

        #game-container {
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            overflow: hidden;
            transform: scale(0.95);
            transition: transform 0.3s ease;
        }

        #game-container:hover {
            transform: scale(0.98);
        }

        canvas {
            display: block;
            image-rendering: pixelated;
        }

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
            color: #666;
            text-align: center;
            z-index: 100;
        }

        .game-title img {
            max-width: 200px;
            height: auto;
            display: block;
            margin: 0 auto;
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