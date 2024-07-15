const path = require('path');
const fs = require('fs');
const SimpleGenerator = require('./generator');

class SimpleSoundQuestionGenerator extends SimpleGenerator {

    constructor(language='fr', name='unknow', question='unknow ?', theme='unknow', subtheme='') {
        super(language, name, 'sound', question, theme, subtheme);
    }
}

module.exports = SimpleSoundQuestionGenerator;