const { getRepoUrl, getMainFolder, getQuestionsFolder, getScriptsFolder, convertToWebp } = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SimplePictureQuestionGenerator {

    constructor(language='fr', name='unknow', question, type='picture', theme='unknow', subtheme='') {
        this.language = language;
        this.type = type;
        this.theme = theme;
        this.subtheme = subtheme;
        this.name = name;
        this.question_sentence = question;

        this.inputFolder = path.join(getScriptsFolder(language), type, theme, subtheme);
        this.outputFolder = path.join(getMainFolder(), language, type, theme, subtheme);
        this.questionOutputFolder = path.join(getQuestionsFolder(language), type, theme);

        this.assets = [];
        this.questions = [];
    }

    async generate() {
        await this.prepareAssets();
        this.generateFolders();
        this.generateQuestions();
        this.writeQuestions();
    }

    async prepareAssets() {
        for await(let file of fs.readdirSync(this.inputFolder)) {
            let fileName = path.join(this.inputFolder, file);
            this.assets.push(file.split('.')[0]);
            if(file.split('.')[1] === "webp") continue;
            await convertToWebp(fileName);
            fs.unlinkSync(fileName);
        }
    }

    generateFolders() {
        if(!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }

        if(!fs.existsSync(this.questionOutputFolder)) {
            fs.mkdirSync(this.questionOutputFolder, { recursive: true });
        }
    }

    generateQuestions() {
        fs.readdirSync(this.inputFolder).forEach(file => {
            let uuid = uuidv4();
            let question = this.generateQuestion(file, uuid);
            this.questions.push(question);
        });
    }

    generateQuestion(file, uuid) {

        let fileName = file.split('.')[0];
        let fileExtension = file.split('.')[1];
        console.log(`Processing: ${fileName}`);

        fs.copyFileSync(path.join(this.inputFolder, file), path.join(this.outputFolder, `${uuid}.${fileExtension}`));

        let selectedAsset = [fileName];
        let proposals = [
            {
                name: fileName,
                is_answer: true
            }
        ]

        let proposalFilter = this.assets.filter(c => c !== fileName);
        for (let i = 0; i < 5; i++) {
            proposalFilter = this.assets.filter(c => !selectedAsset.includes(c));
            let randomAsset = proposalFilter[Math.floor(Math.random() * proposalFilter.length)];
            proposals.push(
                {
                    name: randomAsset,
                    is_answer: false
                }
            );
            selectedAsset.push(randomAsset);
        }

        return {
            id: uuid,
            type: this.type,
            sentence: this.question_sentence,
            picture_url: path.join(getRepoUrl(), this.outputFolder, `/${uuid}.${fileExtension}`),
            data: {

            },
            proposal: [
                ...proposals
            ],
        };
    }

    writeQuestions() {
        fs.writeFileSync(
            path.join(this.questionOutputFolder, `${this.name}.json`), 
            JSON.stringify({
                default_sentence: this.question_sentence,
                questions: this.questions
            }, null, 4)
        );
    }
}

module.exports = SimplePictureQuestionGenerator;