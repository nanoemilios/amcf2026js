const fs = require('fs');

const job11Data = {
    'de': {
        date: '09.2020 - Heute',
        title: 'AS Aufzüge AG',
        text: 'Bei der <a href="https://www.lift.ch" target="_blank" class="company-color">AS Aufzüge AG</a> habe ich mich als Servicetechniker Lift weiter entwickelt. Als Feldtrainer konnte ich zum Troubleshooter aufsteigen und neue Mitarbeiter einarbeiten.'
    },
    'de-ch': {
        date: '09.2020 - Hüt',
        title: 'AS Lifte AG',
        text: 'Bei der <a href="https://www.lift.ch" target="_blank" class="company-color">AS Lifte AG</a> ha ich mich als Servicetechniker Lift wiiter gfaltet. Als Feldtrainer cha ich zum Troubleshooter ufstiege und neu Lüt aarbeite.'
    },
    'en': {
        date: '09.2020 - Present',
        title: 'AS Lifts AG',
        text: 'At <a href="https://www.lift.ch" target="_blank" class="company-color">AS Lifts AG</a> I further developed as a lift service technician. As a field trainer I advanced to troubleshooter and trained new employees.'
    },
    'es': {
        date: '09.2020 - Actualidad',
        title: 'AS Ascensores AG',
        text: 'En <a href="https://www.lift.ch" target="_blank" class="company-color">AS Ascensores AG</a> me desarrollé más como técnico de ascensores. Como formador de campo pude ascender a solucionador de problemas y formar nuevos empleados.'
    },
    'gl': {
        date: '09.2020 - Actualidade',
        title: 'AS Ascensores AG',
        text: 'En <a href="https://www.lift.ch" target="_blank" class="company-color">AS Ascensores AG</a> desenvolvim máis como técnico de ascensores. Como formador de campo puiden ascender a solucionador de problemas e formar novos empregados.'
    },
    'pt': {
        date: '09.2020 - Atualidade',
        title: 'AS Elevadores AG',
        text: 'Na <a href="https://www.lift.ch" target="_blank" class="company-color">AS Elevadores AG</a> desenvolvi-me mais como técnico de elevadores. Como formador de campo pude ascender a resolvedor de problemas e treinar novos funcionários.'
    }
};

const files = [
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de.js', lang: 'de' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de-ch.js', lang: 'de-ch' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.en.js', lang: 'en' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.es.js', lang: 'es' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.gl.js', lang: 'gl' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.pt.js', lang: 'pt' }
];

// Original keys in the source files (before any reordering):
// job1 = Garaventa (2019-2020)
// job2 = Schindler (2015-Present)
// job3 = Swiss Post (2014)
// job4 = Hug Engineering AG (2013-2014)
// job5 = Bipresent.com (2008-Present)
// job6 = Hug Engineering Team Leader (2002-2007)
// job7 = Coop (1999-2002)
// job8 = Web Designer (2005)
// job9 = BVS Winterthur (2003-2005)
// job10 = Migros (1997-1999)

// Chronological order (oldest first) -> new job numbers:
const newOrder = [
    { newNum: 1, oldKey: 'job10' },  // Migros (1997-1999)
    { newNum: 2, oldKey: 'job7' },   // Coop (1999-2002)
    { newNum: 3, oldKey: 'job6' },   // Hug Engineering Team Leader (2002-2007)
    { newNum: 4, oldKey: 'job9' },   // BVS Winterthur (2003-2005)
    { newNum: 5, oldKey: 'job8' },   // Web Designer (2005)
    { newNum: 6, oldKey: 'job5' },   // Bipresent.com (2008-Present)
    { newNum: 7, oldKey: 'job4' },   // Hug Engineering AG (2013-2014)
    { newNum: 8, oldKey: 'job3' },   // Swiss Post (2014)
    { newNum: 9, oldKey: 'job2' },   // Schindler (2015-Present)
    { newNum: 10, oldKey: 'job1' },  // Garaventa (2019-2020)
    { newNum: 11, oldKey: 'job11' }, // AS Aufzüge AG (2020-Present) - NEW
];

function extractObject(str, startIdx) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIdx;
    while (i < str.length && str[i] !== '{') i++;
    if (i >= str.length) return null;
    const objStart = i;
    for (; i < str.length; i++) {
        const ch = str[i];
        if (!inString) {
            if (ch === '"' || ch === "'") { inString = true; stringChar = ch; }
            else if (ch === '{') braceCount++;
            else if (ch === '}') { braceCount--; if (braceCount === 0) return str.substring(objStart, i + 1); }
        } else if (ch === stringChar && str[i - 1] !== '\\') { inString = false; }
    }
    return null;
}

function addJob11AndReorder(filePath, lang) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const resumeStart = content.indexOf('resume: {');
    if (resumeStart === -1) { console.log(`No resume in ${filePath}`); return; }
    
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
    
    // Extract existing jobs (1-10)
    const jobs = {};
    for (let i = 1; i <= 10; i++) {
        const key = `job${i}`;
        const keyIdx = resumeContent.indexOf(`${key}:`);
        if (keyIdx === -1) continue;
        let braceIdx = keyIdx;
        while (braceIdx < resumeContent.length && resumeContent[braceIdx] !== '{') braceIdx++;
        if (braceIdx >= resumeContent.length) continue;
        const jobObj = extractObject(resumeContent, braceIdx);
        if (jobObj) jobs[key] = jobObj;
    }
    
    console.log(`  Extracted jobs from ${filePath}: ${Object.keys(jobs).join(', ')}`);
    
    // Add job11
    const j11 = job11Data[lang];
    jobs['job11'] = `{\n				date: '${j11.date}',\n				title: '${j11.title}',\n				text: '${j11.text}'\n			}`;
    
    // Build new resume in chronological order
    let newResume = 'resume: {\n';
    for (const mapping of newOrder) {
        if (jobs[mapping.oldKey]) {
            newResume += `            job${mapping.newNum}: ${jobs[mapping.oldKey]},\n`;
        } else {
            console.log(`  WARNING: Missing ${mapping.oldKey} in ${filePath}`);
        }
    }
    
    // Add download, contacts, footer
    const downloadIdx = resumeContent.indexOf('download:');
    if (downloadIdx !== -1) {
        newResume += resumeContent.substring(downloadIdx);
    }
    
    const newContent = beforeResume + newResume + afterResume;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

files.forEach(f => addJob11AndReorder(f.path, f.lang));
console.log('Done!');