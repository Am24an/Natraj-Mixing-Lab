<div align="center">
  <img src="https://img.icons8.com/color/120/000000/camera--v1.png" alt="Logo" width="80" />
  <h1>Natraj Mixing Lab – Passport Photo Studio</h1>
  <p>A completely serverless, AI-powered browser application for generating perfect passport photos, removing backgrounds, and upscaling image resolution.</p>

  <div>
    <img src="https://img.shields.io/badge/React-19-blue.svg?style=flat&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue.svg?style=flat&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.0-purple.svg?style=flat&logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/TailwindCSS-4.0-06B6D4.svg?style=flat&logo=tailwindcss" alt="TailwindCSS" />
  </div>
</div>

---

## 🌟 Overview

**Natraj Mixing Lab** is a professional-grade image editing studio designed specifically for standardizing portraits and passport photos.

Unlike traditional photo editors, **everything runs 100% locally in your browser**. No images are ever uploaded to a server, ensuring complete data privacy for your users. By leveraging WebAssembly (WASM) and WebGL via TensorFlow.js, this application brings desktop-class AI models directly to the client side.

## ✨ Features

- 🔒 **Absolute Privacy**: All image processing (including AI background removal and upscaling) happens locally on the user's device.
- ✂️ **AI Background Removal**: Automatically separates the subject from the background using the highly accurate `@imgly/background-removal` WASM model.
- 🎨 **Passport Color Presets**: Instantly apply standard background colors (White, Light Blue, Cream, Grey) with a custom hex picker.
- 🖼️ **AI Image Upscaling (Super Resolution)**: Uses TensorFlow.js (`upscaler`) to enhance and double the resolution of low-quality photos without losing detail.
- 📐 **Smart Cropping**: Pre-configured aspect ratios for standard photo sizes (e.g., 35x45mm Passport, 2x2 US Passport, Square).
- 🎛️ **Advanced Pixel Enhancements**: Granular control over Brightness, Contrast, Saturation, Sharpness, Highlights, and Shadows.
- ↩️ **Time-Travel Undo/Redo**: Full state history management powered by `zustand` and `zundo`.
- 💾 **Local Workspace Saving**: Saves your working projects to IndexedDB so you can resume editing after closing the browser.

## 🛡️ Security & Privacy Architecture

Because this application handles personal identification photos, it was architected from the ground up with a **Zero-Trust / Zero-Server** methodology:

1. **Absolute Data Privacy**: There is no backend API, no database, and no cloud storage. Images literally never leave the user's computer.
2. **Local Storage (IndexedDB) Sandboxing**: User states and images are saved purely in the browser's IndexedDB. This data is strictly sandboxed by the browser and cannot be accessed by other websites.
3. **Immunity to Traditional Hacks**: Because there is no backend server processing user data, the application is mathematically immune to SQL injections, Server-Side Request Forgery (SSRF), and massive data breaches.
4. **XSS Protection**: Built on React 19, the UI naturally escapes DOM inputs, preventing Cross-Site Scripting.
5. **Cross-Origin Isolation**: By running advanced AI models via `SharedArrayBuffer`, the required production hosting headers (`Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy`) place the app in a highly restricted environment, neutralizing advanced side-channel attacks like Spectre.

## 🚀 Tech Stack

- **Core**: [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) with `zundo` for undo/redo middleware
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & Class Variance Authority (`cva`)
- **AI Models**:
  - `@imgly/background-removal` (WASM Background Matting)
  - `upscaler` + `@tensorflow/tfjs` (Image Super Resolution)
- **Canvas Rendering**: Native HTML5 `<canvas>` API with custom pixel-processing pipelines
- **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Local Development

### Prerequisites
- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/natraj-passport-studio.git
   cd natraj-passport-studio
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open `http://localhost:5173` in your browser.

## 📦 Build for Production

To build the application for production deployment:

```bash
npm run build
```

The optimized static files will be generated in the `dist` directory. Since this is a fully static client-side application, you can host the `dist` folder on Vercel, Netlify, GitHub Pages, or any standard web server.

> **Note:** Because this application uses `SharedArrayBuffer` and WebAssembly for the heavy AI models, ensure your production hosting environment is configured to serve the correct cross-origin isolation headers if you experience memory constraints:
> - `Cross-Origin-Opener-Policy: same-origin`
> - `Cross-Origin-Embedder-Policy: require-corp`

## 🗂️ Project Structure

```text
src/
├── components/   # Reusable UI components (Buttons, Sliders, Modals)
├── core/         # Heavy-lifting core logic (CanvasRenderer, ImageProcessor)
├── features/     # Feature-based domains (Workspace, TopNavigation, Panels)
├── hooks/        # Custom React hooks (useCanvas, useViewport)
├── stores/       # Zustand state management and undo/redo history
├── styles/       # Global CSS and Tailwind entry points
├── types/        # TypeScript interfaces and global type definitions
└── utils/        # Helper functions (class merging, file conversions)
```

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the AI pipelines, add new passport presets, or optimize the canvas rendering engine, feel free to open a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
