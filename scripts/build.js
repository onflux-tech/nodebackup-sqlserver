const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');

const assetsToEmbed = [
  'nssm.exe',
  '7za.exe',
  'public/**/*'
];

async function embedAssets() {
  console.log('Iniciando a incorporação de assets...');
  let assetModule = '/* eslint-disable */\n// Este arquivo é gerado automaticamente pelo script de build. Não edite.\nmodule.exports = {\n';

  const files = [];
  for (const pattern of assetsToEmbed) {
    const found = glob.sync(pattern, { nodir: true, cwd: path.join(__dirname, '..') });
    files.push(...found);
  }

  for (const file of files) {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'base64');
    const key = file.replace(/\\/g, '/');
    assetModule += `  "${key}": "${content}",\n`;
  }

  assetModule += '};';

  await fs.writeFile(path.join(__dirname, '..', 'src', 'embedded-assets.js'), assetModule);
  console.log('Assets incorporados com sucesso em src/embedded-assets.js');
}

async function build() {
  const buildScriptPath = path.join(__dirname, '..', 'src', 'embedded-assets.js');
  try {
    await embedAssets();

    console.log('Executando o pkg para criar o executável...');
    execSync('pkg . --targets node12-win-x64 --output NodeBackup.exe', { stdio: 'inherit' });
    console.log('Executável criado com sucesso!');

  } catch (error) {
    console.error('O build falhou:', error);
    process.exit(1);
  } finally {
    console.log('Limpando arquivos temporários...');
    if (fs.existsSync(buildScriptPath)) {
      fs.unlinkSync(buildScriptPath);
    }
    console.log('Limpeza concluída.');
  }
}

build(); 