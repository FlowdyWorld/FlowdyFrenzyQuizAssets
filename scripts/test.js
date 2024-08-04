const { getRepoUrl, getMainFolder, getQuestionsFolder, getScriptsFolder, convertToWebp, HttpUrl} = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

console.log(HttpUrl.join(getRepoUrl(), 'fr', 'picture', 'pokemon', 'openings'));