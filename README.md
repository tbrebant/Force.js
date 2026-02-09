# Force.js

**A complete HTML5 Canvas game engine built for the pre-WebGL era**

## Overview

**Force.js** was a comprehensive JavaScript game engine developed in 2013, designed to create high-performance 2D games that could run seamlessly across web browsers and native mobile platforms. At a time when WebGL was not widely supported, Force.js provided a robust Canvas 2D rendering solution with the ability to leverage native OpenGL acceleration through third-party wrappers.

## The Challenge

In the early 2010s, game developers faced a critical dilemma:
- **WebGL** was not yet widely supported across browsers and mobile devices
- **Canvas 2D** performance varied dramatically between platforms
- **Native mobile deployment** required completely separate codebases

Force.js solved this by providing a unified API that could target both web browsers and native platforms, automatically leveraging hardware acceleration when available.

## Shipped Games

Force.js powered multiple commercially released games, including:

- **[Super Puzzle – Rascal the Raccoon](https://www.tabletop-pixel.com/super-puzzle-rascal-the-raccoon/index.html)** - A puzzle game featuring Nippon Animation Studio's "Rascal The Raccoon"
- **[Cats Crossing](https://www.tabletop-pixel.com/cat-crossing/index.html)** - An engaging arcade-style game

## Core Features

### Rendering System
- **Component-based architecture** with hierarchical scene graph
- **Optimized render loop** with requestAnimationFrame support and fallbacks
- **Z-index based draw ordering** for layered rendering
- **Advanced text rendering** with custom font support
- **Sprite and atlas mapping** for efficient asset management
- **Canvas utilities** for common drawing operations

### Platform Abstraction
- **Multi-platform support**: Web browsers, Ejecta (iOS), CocoonJS (Android/iOS)
- **Native acceleration**: Automatic OpenGL acceleration via native wrappers
- **Cross-platform APIs**: Unified interfaces for alerts, prompts, and dialogs
- **Environment detection**: Automatic platform capability detection

### UI Components
- **Scrollable containers** with touch/mouse support
- **Progress bars** and loading indicators
- **Spinners** and animated elements
- **Advanced text selection** and input handling
- **Interactive buttons** and UI elements

### Input & Interaction
- **Gesture system** with comprehensive touch and mouse event handling
- **Hardware event management** for native platform inputs
- **Event propagation** with stopPropagation support
- **Multi-touch support** for complex interactions

### Asset Management
- **Image loader** with preloading and caching
- **Script loader** for dynamic code loading
- **Lazy image loading** for performance optimization
- **Atlas mapping** for sprite sheet management

### Audio
- **Audio manager** with multi-platform support
- **Sound pooling** for efficient playback
- **Background music** and sound effects management

### Data & Storage
- **Data storage abstraction** for cross-platform persistence
- **Local storage** with fallbacks for older platforms

### Developer Tools
- **One-frame logger** for performance debugging
- **FPS monitoring** and performance metrics
- **Extensive helper utilities** for common game development tasks
- **Module system** with clean namespace management

### Utilities
- **Custom font loading** with detection
- **URL parameter parsing** and manipulation
- **Device identification** and capability detection
- **Sequence execution** for async workflows
- **Tween.js integration** for smooth animations
- **Transform utilities** for matrix operations
- **Cryptographic helpers** for secure operations

## Architecture

**Force.js** uses a modular architecture with a clean namespace system (`window.force.modules.*`). The core component system provides:

- **Lifecycle management**: `onAdded`, `update`, `prepareDestroy`
- **Parent-child relationships**: Automatic hierarchy management
- **State management**: Enable/disable with conditional logic
- **Event system**: Bubble-up event propagation with cancellation
- **Visibility control**: Show/hide components and their children
