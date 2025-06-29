const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const newVersion = process.argv[2];
if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
  console.error('❌ Erro: Forneça uma versão válida no formato x.x.x');
  console.error('💡 Exemplo: npm run prepare-release -- 1.0.2');
  process.exit(1);
}

console.log(`🚀 Preparando a release v${newVersion}...`);

const rootDir = path.join(__dirname, '..');

const runCommand = (command, ignoreError = false) => {
  try {
    console.log(`\n$> ${command}`);
    execSync(command, { stdio: 'inherit', cwd: rootDir });
  } catch (error) {
    if (!ignoreError) {
      console.error(`\n❌ Falha ao executar o comando: ${command}`);
      console.error(error.message);
      process.exit(1);
    } else {
      console.warn(`\n⚠️  Comando falhou, mas foi ignorado: ${command}`);
    }
  }
};

const packageJsonPath = path.join(rootDir, 'package.json');
console.log(`\n📝 Atualizando ${path.basename(packageJsonPath)}...`);
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log(`   Versão atualizada para ${newVersion} em package.json`);

const nsiFilePath = path.join(rootDir, 'installer.nsi');
console.log(`\n📝 Atualizando ${path.basename(nsiFilePath)}...`);
let nsiContent = fs.readFileSync(nsiFilePath, 'utf-8');
const oldVersionRegex = /\d+\.\d+\.\d+/;
const oldVersionMatch = nsiContent.match(/!define PRODUCT_VERSION "(\d+\.\d+\.\d+)"/);

if (oldVersionMatch) {
  nsiContent = nsiContent.replace(/!define PRODUCT_VERSION ".*"/, `!define PRODUCT_VERSION "${newVersion}"`);
  nsiContent = nsiContent.replace(/VIProductVersion ".*"/, `VIProductVersion "${newVersion}.0"`);
  nsiContent = nsiContent.replace(/VIFileVersion ".*"/, `VIFileVersion "${newVersion}.0"`);
  fs.writeFileSync(nsiFilePath, nsiContent);
  console.log(`   Versão atualizada para ${newVersion} em installer.nsi`);
} else {
  console.warn(`   ⚠️  Não foi possível encontrar a versão no arquivo ${nsiFilePath}. Pulando...`);
}

console.log('\n🔄 Sincronizando dependências e atualizando package-lock.json...');
runCommand('npm install');
console.log('   package-lock.json atualizado.');

console.log('\n➕ Adicionando arquivos ao stage...');
runCommand('git add package.json package-lock.json installer.nsi');
console.log('   Arquivos adicionados.');

const commitMessage = `chore: 🔧 preparado para release v${newVersion}`;
console.log('\n✉️  Fazendo commit das alterações...');
runCommand(`git commit -m "${commitMessage}"`);
console.log(`   Commit criado: "${commitMessage}"`);

console.log('\n📤 Enviando para o repositório remoto...');
runCommand('git push');
console.log('   Push para o repositório remoto concluído!');

console.log(`\n🎉 Processo de preparação da release v${newVersion} finalizado com sucesso!`); 