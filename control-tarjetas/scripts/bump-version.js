const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '../app.json');

try {
    const appJsonParam = fs.readFileSync(appJsonPath, 'utf8');
    const appJson = JSON.parse(appJsonParam);

    const currentVersion = appJson.expo.version;
    const parts = currentVersion.split('.');

    // Increment patch version
    parts[2] = parseInt(parts[2], 10) + 1;

    const newVersion = parts.join('.');

    appJson.expo.version = newVersion;

    // Also update Android versionCode if it exists (optional but good practice)
    if (appJson.expo.android && appJson.expo.android.versionCode) {
        appJson.expo.android.versionCode += 1;
    }

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

    console.log(`✅ Version bumped from ${currentVersion} to ${newVersion}`);
} catch (error) {
    console.error('❌ Error bumping version:', error);
    process.exit(1);
}
