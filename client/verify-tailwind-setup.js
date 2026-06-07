#!/usr/bin/env node
/* eslint-env node */
/**
 * Tailwind CSS Setup Verification Script
 * Run this to check if Tailwind is properly configured
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const checks = [];
let allPassed = true;

function check(name, condition, successMsg, failureMsg) {
  const passed = condition();
  checks.push({ name, passed, message: passed ? successMsg : failureMsg });
  if (!passed) allPassed = false;
  return passed;
}

console.log('\n🔍 Verifying Tailwind CSS Setup...\n');

// Check 1: tailwind.config.js exists
check(
  'Tailwind Config',
  () => fs.existsSync(path.join(__dirname, 'tailwind.config.js')),
  '✅ tailwind.config.js found',
  '❌ tailwind.config.js not found - run: npx tailwindcss init'
);

// Check 2: postcss.config.js exists
check(
  'PostCSS Config',
  () => fs.existsSync(path.join(__dirname, 'postcss.config.js')),
  '✅ postcss.config.js found',
  '❌ postcss.config.js not found'
);

// Check 3: Tailwind directives in index.css
check(
  'Tailwind Directives',
  () => {
    const indexCssPath = path.join(__dirname, 'src', 'index.css');
    if (!fs.existsSync(indexCssPath)) return false;
    const content = fs.readFileSync(indexCssPath, 'utf-8');
    return (
      content.includes('@tailwind base') &&
      content.includes('@tailwind components') &&
      content.includes('@tailwind utilities')
    );
  },
  '✅ Tailwind directives found in src/index.css',
  '❌ Tailwind directives missing in src/index.css'
);

// Check 4: Tailwind in package.json
check(
  'Tailwind Package',
  () => {
    const pkgPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.devDependencies?.tailwindcss !== undefined;
  },
  '✅ tailwindcss found in package.json devDependencies',
  '❌ tailwindcss not found in package.json - run: npm install -D tailwindcss'
);

// Check 5: PostCSS in package.json
check(
  'PostCSS Package',
  () => {
    const pkgPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.devDependencies?.postcss !== undefined;
  },
  '✅ postcss found in package.json devDependencies',
  '❌ postcss not found in package.json - run: npm install -D postcss'
);

// Check 6: Autoprefixer in package.json
check(
  'Autoprefixer Package',
  () => {
    const pkgPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return pkg.devDependencies?.autoprefixer !== undefined;
  },
  '✅ autoprefixer found in package.json devDependencies',
  '❌ autoprefixer not found in package.json - run: npm install -D autoprefixer'
);

// Check 7: Verify CSS files exist
const cssFiles = [
  'src/pages/PatientDashboard.css',
  'src/pages/MyPrescriptions.css',
  'src/pages/SlotBooking.css',
  'src/pages/PGDashboard.css',
];

cssFiles.forEach((file) => {
  check(
    `CSS File: ${file}`,
    () => fs.existsSync(path.join(__dirname, file)),
    `✅ ${file} exists`,
    `❌ ${file} not found`
  );
});

// Check 8: Design tokens file exists
check(
  'Design Tokens',
  () => fs.existsSync(path.join(__dirname, 'src', 'styles', 'designTokens.js')),
  '✅ src/styles/designTokens.js found',
  '❌ src/styles/designTokens.js not found'
);

// Print results
console.log('');
checks.forEach(({ message }) => {
  console.log(message);
});

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All checks passed! Tailwind CSS is properly configured.');
  console.log('\n📝 Next steps:');
  console.log('   1. Restart your development server: npm run dev');
  console.log('   2. Hard refresh your browser: Ctrl+Shift+R (or Cmd+Shift+R)');
  console.log('   3. Check for any console errors in browser DevTools');
  console.log('\n🎨 Your dashboards should now display with proper styling!');
} else {
  console.log('❌ Some checks failed. Please fix the issues above.');
  console.log('\n📚 See TAILWIND_CSS_FIX_GUIDE.md for detailed instructions.');
}

console.log('='.repeat(60) + '\n');

// eslint-disable-next-line no-undef
process.exit(allPassed ? 0 : 1);
