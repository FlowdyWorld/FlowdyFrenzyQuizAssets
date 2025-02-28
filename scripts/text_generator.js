const { getRepoUrl, getMainFolder, getQuestionsFolder, getScriptsFolder, convertToWebp, HttpUrl} = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SimpleTextGenerator {

    constructor(language, name, type, question, theme, subtheme, data, questionInfo) {
        this.language = language;
        this.type = type;
        this.theme = theme;
        this.subtheme = subtheme;
        this.name = name;
        this.question_sentence = question;
        this.questionInfo = questionInfo;

        this.inputFolder = path.join(getScriptsFolder(language), type, theme, subtheme);
        this.outputFolder = path.join(getMainFolder(), language, type, theme, subtheme);
        this.questionOutputFolder = path.join(getQuestionsFolder(language), type, theme);

        this.repoOutputFolder = HttpUrl.join(getRepoUrl(), language, type, theme, subtheme);

        this.assets = data;
        this.questions = [];
    }

    
    /**
     * Prepare assets
     */
    async prepareAssets() {
        this.checkAssetsData();
    }


    /**
     * Generate main method
     */
    async generate() {
        await this.prepareAssets();
        this.generateFolders();
        this.generateQuestions();
        this.writeQuestions(true);
    }

    /**
     * Check if assets have reveal picture or sound etc..
     */
    checkAssetsData() {
        if(fs.existsSync(path.join(this.inputFolder, 'reveal_picture'))) {
            fs.readdirSync(path.join(this.inputFolder, 'reveal_picture')).forEach(file => {
                if (['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file))) {
                    let asset = this.assets.find(c => c[questionInfo.id] === path.basename(file, path.extname(file)));
                    if(asset) {
                        asset.reveal_picture = path.join(this.inputFolder, 'reveal_picture', file);
                    }
                    if(!file.endsWith('.webp')) {
                        convertToWebp(path.join(this.inputFolder, 'reveal_picture', file));
                    }
                }
            }); 
        }

        if(fs.existsSync(path.join(this.inputFolder, 'reveal_sound'))) {
            fs.readdirSync(path.join(this.inputFolder, 'reveal_sound')).forEach(file => {
                if (['.mp3', '.wav', '.ogg'].includes(path.extname(file))) {
                    let asset = this.assets.find(c => c[questionInfo.id] === path.basename(file, path.extname(file)));
                    if(asset) {
                        asset.reveal_sound = path.join(this.inputFolder, 'reveal_sound', file);
                    }
                }
            });
        }
    }

    /**
     * Create output folders if not exist
     */
    generateFolders() {
        if(!fs.existsSync(this.outputFolder)) {
            fs.mkdirSync(this.outputFolder, { recursive: true });
        }

        if(!fs.existsSync(this.questionOutputFolder)) {
            fs.mkdirSync(this.questionOutputFolder, { recursive: true });
        }
    }

    /**
     * Generate all questions
     */
    generateQuestions() {
        this.assets.forEach(asset => {
            
            let uuid = uuidv4();
            let question = this.generateQuestion(asset, uuid);
            this.questions.push(question);
        });
    }

    /**
     * Generate question data
     * @param {*} asset 
     * @returns data object
     */
    generateQuestionData(asset, otherPaths = []) {
        let data = {};
        let reveal_uuid = uuidv4();
        if(asset.reveal_picture) {
            if(!fs.existsSync(path.join(this.outputFolder, ...otherPaths, 'reveal_picture')))
                fs.mkdirSync(path.join(this.outputFolder, ...otherPaths, 'reveal_picture'), { recursive: true });
            fs.copyFileSync(asset.reveal_picture, path.join(this.outputFolder, ...otherPaths, `reveal_picture/${reveal_uuid}.webp`));
            data.reveal_picture_url = HttpUrl.join(this.repoOutputFolder, ...otherPaths, `reveal_picture/${reveal_uuid}.webp`);
        }
        if(asset.reveal_sound) {
            if(!fs.existsSync(path.join(this.outputFolder, ...otherPaths, 'reveal_sound')))
                fs.mkdirSync(path.join(this.outputFolder, ...otherPaths, 'reveal_sound'), { recursive: true });
            
            let fileExtension = path.extname(asset.reveal_sound);
            fs.copyFileSync(asset.reveal_sound, path.join(this.outputFolder, ...otherPaths, `reveal_sound/${reveal_uuid}${fileExtension}`));
            data.reveal_sound_url = HttpUrl.join(this.repoOutputFolder, ...otherPaths, `reveal_sound/${reveal_uuid}${fileExtension}`);
        }

        return data;
    }


    /**
     * Generate a question object
     * @param {*} asset 
     * @param {*} uuid 
     */
    generateQuestion(asset, uuid) {

        let name = asset[this.questionInfo.id];
        console.log(`Processing ${this.theme}/${this.subtheme}: ${name}`);

        let selectedAsset = [name];
        let proposals = [
            {
                name: name,
                is_answer: true
            }
        ]

        let proposalFilter = this.assets.filter(a => a[this.questionInfo.id] !== name);
        for (let i = 0; i < 5; i++) {
            proposalFilter = this.assets.filter(a => !selectedAsset.includes(a[this.questionInfo.id]));
            let randomAsset = proposalFilter[Math.floor(Math.random() * proposalFilter.length)];
            proposals.push(
                {
                    name: randomAsset[this.questionInfo.id],
                    is_answer: false
                }
            );
            selectedAsset.push(randomAsset[this.questionInfo.id]);
        }

        let question_sentence = this.formatSentence(asset);

        return {
            id: uuid,
            type: this.type,
            sentence: question_sentence,
            data: this.generateQuestionData(uuid, asset),
            proposal: [
                ...proposals
            ],
        };
    }

    formatSentence(asset) {
        return this.questionInfo.template.replace(/{{(\w+)}}/g, (_, key) => asset[key]);
    }

    /**
     * Write questions to json file
     */
    writeQuestions(withSubtheme = false) {
        if(withSubtheme && !this.subtheme) return;
        if(withSubtheme && !fs.existsSync(path.join(this.questionOutputFolder, this.subtheme))) {
            fs.mkdirSync(path.join(this.questionOutputFolder, this.subtheme), { recursive: true });
        }
        fs.writeFileSync(
            path.join(this.questionOutputFolder, withSubtheme ? this.subtheme : '', `questions.json`), 
            JSON.stringify({
                default_sentence: this.question_sentence,
                questions: this.questions
            }, null, 4)
        );
    }

}

module.exports = SimpleTextGenerator;