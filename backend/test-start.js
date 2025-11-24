// 简单的测试启动脚本
console.log('=== TEST START SCRIPT ===');
console.log('Node version:', process.version);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Current directory:', process.cwd());
console.log('__dirname would be:', __dirname);

// 测试文件是否存在
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist', 'index.js');
console.log('Checking dist/index.js at:', distPath);
console.log('File exists:', fs.existsSync(distPath));

if (fs.existsSync(distPath)) {
  console.log('✅ dist/index.js found, attempting to require...');
  try {
    require(distPath);
  } catch (error) {
    console.error('❌ Error requiring dist/index.js:', error);
    process.exit(1);
  }
} else {
  console.error('❌ dist/index.js not found');
  console.log('Listing dist directory:');
  try {
    const distDir = path.join(__dirname, 'dist');
    if (fs.existsSync(distDir)) {
      console.log(fs.readdirSync(distDir));
    } else {
      console.log('dist directory does not exist');
    }
  } catch (e) {
    console.error('Error listing dist:', e);
  }
  process.exit(1);
}

