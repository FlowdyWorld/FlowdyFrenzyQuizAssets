const { getRepoUrl, getMainFolder, getQuestionsFolder, getScriptsFolder, convertToWebp } = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class SimpleGenerator {

    constructor(language, name, type, question, theme, subtheme) {
        this.language = language;
        this.type = type;
        this.theme = theme;
        this.subtheme = subtheme;
        this.name = name;
        this.question_sentence = question;

        this.inputFolder = path.join(getScriptsFolder(language), type, theme, subtheme);
        this.outputFolder = path.join(getMainFolder(), language, type, theme, subtheme);
        this.questionOutputFolder = path.join(getQuestionsFolder(language), type, theme);

        this.repoOutputFolder = path.join(getRepoUrl(), language, type, theme, subtheme);

        this.assets = [];
        this.questions = [];
    }

    
    /**
     * Prepare assets
     */
    async prepareAssets() {
        for await(let file of fs.readdirSync(this.inputFolder)) {
            if(fs.lstatSync(path.join(this.inputFolder, file)).isDirectory() ) continue;
            let asset = {
                name: file.split('.')[0],
                file: file
            }
            this.assets.push(asset);

            let filePath = path.join(this.inputFolder, file);
            switch(this.type) {
                case 'picture':
                    if(file.split('.')[1] === "webp") continue;
                    await convertToWebp(filePath);
                    break;
                default:
                    break;
            }
        }
            
        this.checkAssetsData();
    }


    /**
     * Generate main method
     */
    async generate() {
        await this.prepareAssets();
        this.generateFolders();
        this.generateQuestions();
        this.writeQuestions();
    }

    /**
     * Check if assets have reveal picture or sound etc..
     */
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
            if(this.type == 'sound' && !(asset.file.endsWith('.mp3') || asset.file.endsWith('.wav') || asset.file.endsWith('.ogg'))) 
                return;
            else if(this.type == 'picture' && !(asset.file.endsWith('.webp')))
                return;
            
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
    generateQuestionData(uuid, asset) {
        let data = {};
        let fileExtension = asset.file.split('.')[1];
        if(this.type == 'sound')
            data.sound_url = path.join(this.repoOutputFolder, `${uuid}.${fileExtension}`);
        else if(this.type == 'picture')
            data.picture_url = path.join(this.repoOutputFolder, `${uuid}.${fileExtension}`);

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


    /**
     * Generate a question object
     * @param {*} asset 
     * @param {*} uuid 
     */
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
                ...this.generateQuestionData(uuid, asset)
            },
            proposal: [
                ...proposals
            ],
        };
    }

    /**
     * Write questions to json file
     */
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

module.exports = SimpleGenerator;