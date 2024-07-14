const fs = require('fs');
const path = require('path');
const webp = require('webp-converter');

function getRepoUrl() {
    return 'https://raw.githubusercontent.com/FlowdyWorld/FlowdyFrenzyQuizAssets/master/';
}

function getMainFolder() {
    return path.join(__dirname, '../');
}

function getQuestionsFolder(language) {
    return path.join(__dirname, '../questions', language);
}

function getScriptsFolder(language) {
    return path.join(__dirname, '../scripts', language);
}

async function convertToWebp(path) {
    let ext = path.split('.').pop();
    await webp.cwebp(path, path.replace(`.${ext}`, '.webp'), "-q 80");
    fs.unlinkSync(path);
}

function recursiveReadDirSync(dir, func) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            recursiveReadDirSync(filePath, func);
        }
        else {
            func(filePath);
        }
    });
}

function convert_all_assets_to_webp() {
    let assets = path.join(__dirname, '../pictures');
    recursiveReadDirSync(assets, async (file) => {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            console.log(`Converting ${file} to webp`);
            await convertToWebp(file);
            fs.unlinkSync(file);
        }
    });
}

module.exports = {
    getRepoUrl,
    convert_all_assets_to_webp,
    convertToWebp,
    getMainFolder,
    getQuestionsFolder,
    getScriptsFolder
};