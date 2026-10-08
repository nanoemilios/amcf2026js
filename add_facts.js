const fs = require('fs');

const factsData = {
    'de': {
        head: 'Fakten über mich',
        title: 'Lebenslauf',
        facts: {
            name: 'Name:', address: 'Wohnort:', address2: '8500 Frauenfeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nationalität:',
            birth: 'Geburtsdatum:', license: 'Führerschein:', civil: 'Zivilstand:', permit: 'Ausländerausweis:',
            nationV: 'Spanier', civilV: 'Verheiratet', birthV: '2. April 1980', licenseV: 'Kat. B', permitV: 'C'
        }
    },
    'de-ch': {
        head: 'Fakte über mich',
        title: 'Lebenslauf',
        facts: {
            name: 'Name:', address: 'Adress:', address2: '8500 Frauefeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nationalität:',
            birth: 'Geburtsdatum:', license: 'Füerusschii:', civil: 'Zivilstand:', permit: 'Usländeruuswiis:',
            nationV: 'Spanier', civilV: 'Verhürotet', birthV: '2. April 1980', licenseV: 'Kat. B', permitV: 'C'
        }
    },
    'en': {
        head: 'Facts about me',
        title: 'Resume',
        facts: {
            name: 'Name:', address: 'Address:', address2: '8500 Frauenfeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nationality:',
            birth: 'Date of birth:', license: 'Driving licence:', civil: 'Marital status:', permit: 'Residence permit:',
            nationV: 'Spanish', civilV: 'Married', birthV: '2 April 1980', licenseV: 'Cat. B', permitV: 'C'
        }
    },
    'es': {
        head: 'Datos sobre mí',
        title: 'Currículum',
        facts: {
            name: 'Nombre:', address: 'Dirección:', address2: '8500 Frauenfeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nacionalidad:',
            birth: 'Fecha de nacimiento:', license: 'Permiso de conducir:', civil: 'Estado civil:', permit: 'Permiso de residencia:',
            nationV: 'Español', civilV: 'Casado', birthV: '2 de abril de 1980', licenseV: 'cat. B', permitV: 'C'
        }
    },
    'gl': {
        head: 'Datos sobre min',
        title: 'Curriculum',
        facts: {
            name: 'Nome:', address: 'Enderezo:', address2: '8500 Frauenfeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nacionalidade:',
            birth: 'Data de nacemento:', license: 'Permiso de conducir:', civil: 'Estado civil:', permit: 'Permiso de residencia:',
            nationV: 'Español', civilV: 'Casado', birthV: '2 de abril de 1980', licenseV: 'cat. B', permitV: 'C'
        }
    },
    'pt': {
        head: 'Dados sobre mim',
        title: 'Currículo',
        facts: {
            name: 'Nome:', address: 'Morada:', address2: '8500 Frauenfeld',
            web: 'Web:', email: 'Email:', tel: 'Tel:', nation: 'Nacionalidade:',
            birth: 'Data de nascimento:', license: 'Carta de condução:', civil: 'Estado civil:', permit: 'Permissão de residência:',
            nationV: 'Espanhol', civilV: 'Casado', birthV: '2 de abril de 1980', licenseV: 'cat. B', permitV: 'C'
        }
    }
};

const fileList = [
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de.js', lang: 'de' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de-ch.js', lang: 'de-ch' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.en.js', lang: 'en' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.es.js', lang: 'es' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.gl.js', lang: 'gl' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.pt.js', lang: 'pt' }
];

function addFacts(filePath, lang) {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = factsData[lang];
    if (!data) { console.log(`No data for ${lang}`); return; }
    
    // Find resume object
    const resumeStart = content.indexOf('resume: {');
    if (resumeStart === -1) { console.log(`No resume in ${filePath}`); return; }
    
    // Find the end of resume object
    let braceCount = 0, inString = false, stringChar = '', resumeEnd = -1;
    for (let i = resumeStart; i < content.length; i++) {
        const ch = content[i];
        if (!inString) {
            if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
            else if (ch === '{') braceCount++;
            else if (ch === '}') { braceCount--; if (braceCount === 0) { resumeEnd = i + 1; break; } }
        } else if (ch === stringChar && content[i - 1] !== '\\') { inString = false; }
    }
    if (resumeEnd === -1) { console.log(`No resume end in ${filePath}`); return; }
    
    const beforeResume = content.substring(0, resumeStart);
    const resumeContent = content.substring(resumeStart, resumeEnd);
    const afterResume = content.substring(resumeEnd);
    
    // Check if facts already exists
    if (resumeContent.indexOf('facts: {') !== -1) {
        console.log(`Facts already exists in ${filePath}`);
        return;
    }
    
    // Insert facts after title in resume
    const titleIdx = resumeContent.indexOf('title:');
    if (titleIdx === -1) { console.log(`No title in ${filePath}`); return; }
    
    // Find the comma after title value
    let insertIdx = titleIdx;
    let inStr = false, strCh = '';
    for (let i = titleIdx; i < resumeContent.length; i++) {
        const ch = resumeContent[i];
        if (!inStr) {
            if (ch === '"' || ch === "'") { inStr = true; strCh = ch; }
        } else if (ch === strCh && resumeContent[i - 1] !== '\\') {
            inStr = false;
            // Look for comma
            for (let j = i + 1; j < resumeContent.length; j++) {
                if (resumeContent[j] === ',') { insertIdx = j + 1; break; }
                if (resumeContent[j] !== ' ' && resumeContent[j] !== '\n' && resumeContent[j] !== '\t' && resumeContent[j] !== '\r') break;
            }
            break;
        }
    }
    
    const factsStr = `\n            facts: {\n                name: '${data.facts.name}', address: '${data.facts.address}', address2: '${data.facts.address2}',\n                web: '${data.facts.web}', email: '${data.facts.email}', tel: '${data.facts.tel}', nation: '${data.facts.nation}',\n                birth: '${data.facts.birth}', license: '${data.facts.license}', civil: '${data.facts.civil}', permit: '${data.facts.permit}',\n                nationV: '${data.facts.nationV}', civilV: '${data.facts.civilV}', birthV: '${data.facts.birthV}', licenseV: '${data.facts.licenseV}', permitV: '${data.facts.permitV}'\n            },`;
    
    const newResume = resumeContent.substring(0, insertIdx) + factsStr + resumeContent.substring(insertIdx);
    const newContent = beforeResume + newResume + content.substring(resumeEnd);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Added facts to ${filePath}`);
}

const fileList2 = [
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de.js', lang: 'de' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de-ch.js', lang: 'de-ch' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.en.js', lang: 'en' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.es.js', lang: 'es' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.gl.js', lang: 'gl' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.pt.js', lang: 'pt' }
];

fileList2.forEach(f => addFacts(f.path, f.lang));
console.log('Done!');