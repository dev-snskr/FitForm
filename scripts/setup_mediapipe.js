// scripts/setup_mediapipe.js
// Copies MediaPipe WASM binaries and downloads pose_landmarker_lite model into public/mediapipe/

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public', 'mediapipe');
const WASM_DEST = path.join(PUBLIC_DIR, 'wasm');
const MODELS_DEST = path.join(PUBLIC_DIR, 'models');
const WASM_SRC = path.join(ROOT_DIR, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');

// Ensure directories exist
fs.mkdirSync(WASM_DEST, { recursive: true });
fs.mkdirSync(MODELS_DEST, { recursive: true });

// 1. Copy WASM and JS runner files
console.log('Copying MediaPipe Vision WASM files from node_modules...');
const wasmFiles = fs.readdirSync(WASM_SRC);
for (const file of wasmFiles) {
  const src = path.join(WASM_SRC, file);
  const dest = path.join(WASM_DEST, file);
  fs.copyFileSync(src, dest);
  const stat = fs.statSync(dest);
  console.log(`Copied ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
}

// 2. Download pose_landmarker_lite.task model file
const modelPath = path.join(MODELS_DEST, 'pose_landmarker_lite.task');
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task';

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000000) {
      console.log(`Model already downloaded at ${destPath} (${(fs.statSync(destPath).size / 1024 / 1024).toFixed(2)} MB). Skipping download.`);
      return resolve();
    }

    console.log(`Downloading ${url} ...`);
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download model: HTTP status ${response.statusCode}`));
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const stat = fs.statSync(destPath);
          console.log(`Downloaded pose_landmarker_lite.task successfully (${(stat.size / 1024 / 1024).toFixed(2)} MB).`);
          resolve();
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

downloadFile(modelUrl, modelPath)
  .then(() => {
    console.log('MediaPipe assets setup complete! All runtime assets are self-contained in public/mediapipe.');
  })
  .catch((err) => {
    console.error('Error setting up MediaPipe assets:', err);
    process.exit(1);
  });
