const { getRepoUrl, getMainFolder, getQuestionsFolder, getScriptsFolder, convertToWebp } = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SimpleSoundQuestionGenerator {

    constructor(language='fr', name='unknow', question='unknow ?', theme='unknow', subtheme='') {
        this.language = language;
        this.type = 'sound';
        this.theme = theme;
        this.subtheme = subtheme;
        this.name = name;
        this.question_sentence = question;

        this.inputFolder = path.join(getScriptsFolder(language), this.type, theme, subtheme);
        this.outputFolder = path.join(getMainFolder(), language, this.type, theme, subtheme);
        this.questionOutputFolder = path.join(getQuestionsFolder(language), this.type, theme);

        this.repoOutputFolder = path.join(getRepoUrl(), language, this.type, theme, subtheme);

        this.assets = [];
        this.questions = [];
    }

    async generate() {
        await this.prepareAssets();
        this.generateFolders();
        this.generateQuestions();
        this.writeQuestions();
    }

    checkAssetsData() {
        if(fs.existsSync(path.join(this.inputFolder, 'reveal_picture'))) {
            fs.readdirSync(path.join(this.inputFolder, 'reveal_picture')).forEach(file => {
                if(file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.webp')) {
                    let asset = this.assets.find(c => c.name === file.split('.')[0]);
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
                if(file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.ogg')) {
                    let asset = this.assets.find(c => c.name === file.split('.')[0]);
                    if(asset) {
                        asset.reveal_sound = path.join(this.inputFolder, 'reveal_sound', file);
                    }
                }
            });
        }
    }

    async prepareAssets() {
        for await(let file of fs.readdirSync(this.inputFolder)) {
            if(fs.lstatSync(path.join(this.inputFolder, file)).isDirectory() ) continue;
            let asset = {
                name: file.split('.')[0],
                file: file
            }
            this.assets.push(asset);
        }
            
        this.checkAssetsData();
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
        this.assets.forEach(asset => {
            if(asset.file.endsWith('.mp3') || asset.file.endsWith('.wav') || asset.file.endsWith('.ogg')) {
                let uuid = uuidv4();
                let question = this.generateQuestion(asset, uuid);
                this.questions.push(question);
            }
        });
    }

    generateQuestionData(asset) {
        let data = {};
        let reveal_uuid = uuidv4();
        if(asset.reveal_picture) {
            if(!fs.existsSync(path.join(this.outputFolder, 'reveal_picture')))
                fs.mkdirSync(path.join(this.outputFolder, 'reveal_picture'), { recursive: true });
            fs.copyFileSync(asset.reveal_picture, path.join(this.outputFolder, `reveal_picture/${reveal_uuid}.webp`));
            data.reveal_picture_url = path.join(this.repoOutputFolder, `reveal_picture/${reveal_uuid}.webp`);
        }
        if(asset.reveal_sound) {
            if(!fs.existsSync(path.join(this.outputFolder, 'reveal_sound')))
                fs.mkdirSync(path.join(this.outputFolder, 'reveal_sound'), { recursive: true });
            
            let fileExtension = asset.reveal_sound.split('.')[1];
            fs.copyFileSync(asset.reveal_sound, path.join(this.outputFolder, `reveal_sound/${reveal_uuid}.${fileExtension}`));
            data.reveal_sound_url = path.join(this.repoOutputFolder, `reveal_sound/${reveal_uuid}.${fileExtension}`);
        }

        return data;
    }

    generateQuestion(asset, uuid) {

        let fileName = asset.file.split('.')[0];
        let fileExtension = asset.file.split('.')[1];
        console.log(`Processing: ${fileName}`);

        fs.copyFileSync(path.join(this.inputFolder, asset.file), path.join(this.outputFolder, `${uuid}.${fileExtension}`));

        let selectedAsset = [fileName];
        let proposals = [
            {
                name: fileName,
                is_answer: true
            }
        ]

        let proposalFilter = this.assets.filter(a => a.name !== fileName);
        for (let i = 0; i < 5; i++) {
            proposalFilter = this.assets.filter(a => !selectedAsset.includes(a.name));
            let randomAsset = proposalFilter[Math.floor(Math.random() * proposalFilter.length)];
            proposals.push(
                {
                    name: randomAsset.name,
                    is_answer: false
                }
            );
            selectedAsset.push(randomAsset);
        }

        return {
            id: uuid,
            type: this.type,
            sentence: this.question_sentence,
            data: {
                sound_url: path.join(this.repoOutputFolder, `${uuid}.${fileExtension}`),
                ...this.generateQuestionData(asset)
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

module.exports = SimpleSoundQuestionGenerator;