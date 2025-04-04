const fs = require('fs-extra');
const path = require('path');

// Source and destination paths
const srcDir = path.join(__dirname, 'src', 'animated');
const destDir = path.join(__dirname, 'dist', 'src', 'animated');

// Create destination directory if it doesn't exist
fs.ensureDirSync(destDir);

// Copy all files from src/animated to dist/src/animated
console.log(`Copying SVG files from ${srcDir} to ${destDir}...`);

fs.copySync(srcDir, destDir, {
  overwrite: true,
  errorOnExist: false,
  dereference: true,
  preserveTimestamps: true,
});

console.log('SVG files copied successfully.'); 