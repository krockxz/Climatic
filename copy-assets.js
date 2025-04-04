const fs = require('fs-extra');
const path = require('path');

// Source and destination paths
const srcDir = path.join(__dirname, 'src', 'animated');
const destDir = path.join(__dirname, 'dist', 'src', 'animated');

// Make sure source directory exists
if (!fs.existsSync(srcDir)) {
  console.log(`Source directory ${srcDir} does not exist. Skipping copy.`);
  process.exit(0);
}

// Create destination directory if it doesn't exist
fs.ensureDirSync(destDir);

// Copy all files from src/animated to dist/src/animated
console.log(`Copying SVG files from ${srcDir} to ${destDir}...`);

try {
  fs.copySync(srcDir, destDir, {
    overwrite: true,
    errorOnExist: false,
    dereference: true,
    preserveTimestamps: true,
  });
  console.log('SVG files copied successfully.');
} catch (err) {
  console.error('Error copying SVG files:', err);
  // Don't fail the build if copy fails
  process.exit(0);
} 