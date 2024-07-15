const path = require('path');
const fs = require('fs');
const SimpleGenerator = require('./generator');

class SimplePictureQuestionGenerator extends SimpleGenerator {

    constructor(language='fr', name='unknow', question='unknow ?', theme='unknow', subtheme='') {
        super(language, name, 'picture', question, theme, subtheme);
    }
}

module.exports = SimplePictureQuestionGenerator;