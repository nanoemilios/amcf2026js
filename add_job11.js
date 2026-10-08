const fs = require('fs');

// Job 11 data for each language
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

// Files to update
const files = [
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de.js', lang: 'de' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de-ch.js', lang: 'de-ch' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.en.js', lang: 'en' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.es.js', lang: 'es' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.gl.js', lang: 'gl' },
    { path: 'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.pt.js', lang: 'pt' }
];

// Chronological order of ALL 11 jobs (oldest first)
const chronologicalOrder = [
    'job10', // 1997 - 1999 (Migros)
    'job7',  // 1999-2002 (Coop)
    'job6',  // 06.2002 - 05.2007 (Hug Engineering Team Leader)
    'job9',  // 2003 - 2005 (BVS Winterthur)
    'job8',  // 2005 (Certified Web Designer)
    'job5',  // 08.2008 - Present (Bipresent.com)
    'job4',  // 06.2013 - 06.2014 (Hug Engineering AG)
    'job3',  // 07.2014 - 12.2014 (Swiss Post)
    'job2',  // 07.2015 - Present (Schindler)
    'job1',  // 04.2019 - 09.2020 (Garaventa)
    'job11'  // 09.2020 - Present (AS Aufzüge AG) - NEW
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
    
    // Extract existing jobs
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
    
    // Add job11
    const j11 = job11Data[lang];
    jobs['job11'] = `{\n				date: '${j11.date}',\n				title: '${j11.title}',\n				text: '${j11.text}'\n			}`;
    
    // Build new resume in chronological order (11 jobs)
    let newResume = 'resume: {\n';
    for (let i = 0; i < chronologicalOrder.length; i++) {
        const oldKey = chronologicalOrder[i];
        if (jobs[oldKey]) {
            newResume += `            job${i + 1}: ${jobs[oldKey]},\n`;
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