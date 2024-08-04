const SimpleGenerator = require("./generator");

const { convertToWebp } = require('./utils');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class GroupGenerator extends SimpleGenerator {
    
    constructor(language, name, type, question, theme, subtheme, assetDescriptions) {
        super(language, name, type, question, theme, subtheme);
        this.assetDescriptions = assetDescriptions;
        this.assets = {};
        this.questions = {};
    }
    
    getAssetDescriptionForCode(code) {
        if(this.assetDescriptions === undefined) return undefined;
        return this.assetDescriptions[code];
    }
    
    recursivePrepareCodes(file, codes, assets) {
        let code = codes.shift();
        code = this.getAssetDescriptionForCode(code)?.name ?? code;
        
        let asset = { code: code, asset: {}};
        if(assets[code] === undefined) {
            assets[code] = { };
        }
        
        if(codes.length > 1) {
            asset.subCode = this.recursivePrepareCodes(file, codes, assets[code]);
        }
        else {
            if(assets[code].assets === undefined)
                assets[code].assets = [];
            
            assets[code].assets.push({
                name: codes[0].replace(path.extname(codes[0]), ''),
                file: file
            })
        }
        
        return asset;
    }
    
    async prepareAssets() {
        for await(let file of fs.readdirSync(this.inputFolder)) {
            if(fs.lstatSync(path.join(this.inputFolder, file)).isDirectory() ) continue;
            
            let codes = file.split('_');
            this.recursivePrepareCodes(file, codes, this.assets);
            
            let filePath = path.join(this.inputFolder, file);
            switch(this.type) {
                case 'picture':
                    if(path.extname(file) === ".webp") continue;
                    await convertToWebp(filePath);
                    break;
                default:
                    break;
            }
        }
        
        this.checkAssetsData();
    }
    
    /**
    * Check if assets have reveal picture or sound etc..
    */
    checkAssetsData() {
        if(fs.existsSync(path.join(this.inputFolder, 'reveal_picture'))) {
            fs.readdirSync(path.join(this.inputFolder, 'reveal_picture')).forEach(file => {
                if (['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file))) {
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
                if (['.mp3', '.wav', '.ogg'].includes(path.extname(file))) {
                    let asset = this.assets.find(c => c.name === file.split('.')[0]);
                    if(asset) {
                        asset.reveal_sound = path.join(this.inputFolder, 'reveal_sound', file);
                    }
                }
            });
        }
    }
    
    recursiveGenerateQuestions(codes, codesPath = []) {
        for(let code in codes) {
            let newCodesPath = [...codesPath, code];
            if(codes[code].assets) {
                newCodesPath.pop();
                let assets = codes[code].assets;
                let questions = [];
                this.generateQuestionForAssets(assets, questions, newCodesPath, code);
                
                if(newCodesPath.length === 0) {
                    if(Array.isArray(this.questions))
                        this.questions.push(...questions);
                    else
                    this.questions = questions;
                }
                else {
                    newCodesPath.reduce((acc, cur, idx) => {
                        // Si nous sommes au dernier élément du chemin, assigner la valeur
                        if (idx === newCodesPath.length - 1) {
                            if(acc[cur] === undefined)
                                acc[cur] = questions;
                            else
                            acc[cur].push(...questions);
                        } else {
                            // Sinon, continuer à traverser ou créer l'objet suivant si nécessaire
                            acc[cur] = acc[cur] || {};
                        }
                        return acc[cur];
                    }, this.questions);
                }
            }
            else {
                this.recursiveGenerateQuestions(codes[code], newCodesPath);
            }
        }
    }
    
    generateQuestions() {
        this.recursiveGenerateQuestions(this.assets);
    }
    
    generateQuestionForAssets(assets, questions, codesPath, code) {
        assets.forEach(asset => {
            if (this.type === 'sound' && !['.mp3', '.wav', '.ogg'].includes(path.extname(asset.file))) return;
            if (this.type === 'picture' && path.extname(asset.file) !== '.webp') return;
            
            let uuid = uuidv4();
            questions.push(this.generateQuestion(asset, uuid, assets, codesPath, code));
        });
    }
    
    /**
    * Generate a question object
    * @param {*} asset 
    * @param {*} uuid 
    */
    generateQuestion(asset, uuid, assets, codesPath, code) {
        
        let fileName = asset.file.replace(path.extname(asset.file), '');
        let fileExtension = path.extname(asset.file).replace('.', '');
        console.log(`Processing ${this.theme}/${this.subtheme}/${codesPath.join('/')}: ${fileName}`);
        
        if(!fs.existsSync(path.join(this.outputFolder, ...codesPath)))
            fs.mkdirSync(path.join(this.outputFolder, ...codesPath), { recursive: true });
        fs.copyFileSync(path.join(this.inputFolder, asset.file), path.join(this.outputFolder, ...codesPath, `${uuid}.${fileExtension}`));
        
        let selectedAsset = [fileName];
        let proposals = [
            {
                name: asset.name,
                is_answer: true
            }
        ];
        
        let proposalFilter = assets.filter(a => a.name !== fileName);
        for (let i = 0; i < 5; i++) {
            proposalFilter = assets.filter(a => !selectedAsset.includes(a.name));
            let randomAsset = proposalFilter[Math.floor(Math.random() * proposalFilter.length)];
            if(randomAsset === undefined) break;
            proposals.push(
                {
                    name: randomAsset.name,
                    is_answer: false
                }
            );
            selectedAsset.push(randomAsset.name);
        }
        
        return {
            id: uuid,
            type: this.type,
            sentence: this.getAssetDescriptionForCode(code)?.question ?? this.question_sentence,
            data: this.generateQuestionData(uuid, asset, codesPath),
            proposal: [
                ...proposals
            ],
        };
    }
    
    recursiveWriteQuestions(questions, codesPath = []) {
        for(let code in questions) {
            let newCodesPath = [...codesPath, code];
            if(Array.isArray(questions[code])) {
                if(!fs.existsSync(path.join(this.questionOutputFolder, ...newCodesPath)))
                    fs.mkdirSync(path.join(this.questionOutputFolder, ...newCodesPath), { recursive: true });
                fs.writeFileSync(
                    path.join(this.questionOutputFolder, ...newCodesPath, `${this.name}.json`), 
                    JSON.stringify({
                        default_sentence: this.question_sentence,
                        questions: questions[code]
                    }, null, 4)
                );
            }
            else {
                this.recursiveWriteQuestions(questions[code], newCodesPath);
            }
        }
    }
    
    /**
    * Write questions to json file
    */
    writeQuestions() {
        if(Array.isArray(this.questions)) {
            super.writeQuestions(true);
        }
        else
        this.recursiveWriteQuestions(this.questions);
    }
}

module.exports = GroupGenerator;