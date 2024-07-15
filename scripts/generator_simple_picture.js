const path = require('path');
const fs = require('fs');
const SimpleGenerator = require('./generator');

class SimplePictureQuestionGenerator extends SimpleGenerator {

    constructor(language='fr', name='unknow', question='unknow ?', theme='unknow', subtheme='') {
        super(language, name, 'picture', question, theme, subtheme);
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
            data: {
                picture_url: path.join(this.repoOutputFolder, `${uuid}.${fileExtension}`),
                ...this.generateQuestionData(asset)
            },
            proposal: [
                ...proposals
            ],
        };
    }
}

module.exports = SimplePictureQuestionGenerator;