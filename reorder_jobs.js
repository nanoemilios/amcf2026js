const fs = require('fs');

const jobMap = {
    // new key: old key
    'job1': 'job10',  // Migros 1997-1999
    'job2': 'job7',   // Coop 1999-2002
    'job3': 'job6',   // Hug Engineering Team Leader 2002-2007
    'job4': 'job9',   // BVS Winterthur 2003-2005
    'job5': 'job8',   // Certified Web Designer 2005
    'job6': 'job5',   // Bipresent.com 2008-Present
    'job7': 'job4',   // Hug Engineering AG 2013-2014
    'job8': 'job3',   // Swiss Post 2014
    'job9': 'job2',   // Schindler 2015-Present
    'job10': 'job1'   // Garaventa 2019-Present
};

function reorderJobs(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the resume object
    const resumeStart = content.indexOf('resume: {');
    if (resumeStart === -1) return;
    
    let braceCount = 0;
    let resumeEnd = resumeStart;
    for (let i = resumeStart; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
                resumeEnd = i + 1;
                break;
            }
        }
    }
    
    const resumeContent = content.substring(resumeStart, resumeEnd);
    
    // Extract jobs
    const jobs = {};
    for (let i = 1; i <= 10; i++) {
        const key = `job${i}`;
        const keyStart = resumeContent.indexOf(`${key}: {`);
        if (keyStart === -1) continue;
        let bc = 0;
        let valEnd = keyStart;
        for (let j = keyStart; j < resumeContent.length; j++) {
            if (resumeContent[j] === '{') bc++;
            if (resumeContent[j] === '}') {
                bc--;
                if (bc === 0) {
                    valEnd = j + 1;
                    break;
                }
            }
        }
        jobs[key] = resumeContent.substring(keyStart, valEnd);
    }
    
    // Build new resume content
    let newResume = 'resume: {\n';
    for (let i = 1; i <= 10; i++) {
        const oldKey = jobMap[`job${i}`];
        if (jobs[oldKey]) {
            newResume += `            job${i}: ${jobs[oldKey].substring(jobs[oldKey].indexOf('{') + 1).trim()},\n`;
        }
    }
    // Add download, contacts, footer
    const downloadIdx = resumeContent.indexOf('download:');
    if (downloadIdx !== -1) {
        newResume += resumeContent.substring(downloadIdx);
    }
    
    const newContent = content.substring(0, resumeStart) + newResume;
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

const files = [
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de.js',
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.de-ch.js',
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.en.js',
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.es.js',
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.gl.js',
    'C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\i18n.pt.js'
];

files.forEach(reorderJobs);
console.log('Done!');