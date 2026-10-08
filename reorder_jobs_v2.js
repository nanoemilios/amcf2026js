const fs = require('fs');

const jobOrder = [
    { old: 'job10', date: '1997 - 1999' },  // Migros
    { old: 'job7', date: '1999-2002' },     // Coop
    { old: 'job6', date: '06.2002 - 05.2007' }, // Hug Engineering Team Leader
    { old: 'job9', date: '2003 - 2005' },   // BVS Winterthur
    { old: 'job8', date: '2005' },          // Certified Web Designer
    { old: 'job5', date: '08.2008 - Jetzt' }, // Bipresent.com
    { old: 'job4', date: '06.2013 - 06.2014' }, // Hug Engineering AG
    { old: 'job3', date: '07.2014 - 12.2014' }, // Swiss Post
    { old: 'job2', date: '07.2015 - Heute' },  // Schindler
    { old: 'job1', date: '04.2019 - Heute' }   // Garaventa
];

function extractObject(str, startIdx) {
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let i = startIdx;
    
    // Find opening brace
    while (i < str.length && str[i] !== '{') i++;
    if (i >= str.length) return null;
    
    const objStart = i;
    for (; i < str.length; i++) {
        const ch = str[i];
        if (!inString) {
            if (ch === '"' || ch === "'") {
                inString = true;
                stringChar = ch;
            } else if (ch === '{') {
                braceCount++;
            } else if (ch === '}') {
                braceCount--;
                if (braceCount === 0) {
                    return str.substring(objStart, i + 1);
                }
            }
        } else if (ch === stringChar && str[i - 1] !== '\\') {
            inString = false;
        }
    }
    return null;
}

function reorderJobs(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find resume object
    const resumeIdx = content.indexOf('resume: {');
    if (resumeIdx === -1) {
        console.log(`No resume found in ${filePath}`);
        return;
    }
    
    const resumeObj = extractObject(content, resumeIdx);
    if (!resumeObj) {
        console.log(`Could not extract resume object from ${filePath}`);
        return;
    }
    
    // Extract each job
    const jobs = {};
    for (let i = 1; i <= 10; i++) {
        const key = `job${i}`;
        const keyIdx = resumeObj.indexOf(`${key}:`);
        if (keyIdx === -1) continue;
        
        // Find the opening brace after the key
        let braceIdx = keyIdx;
        while (braceIdx < resumeObj.length && resumeObj[braceIdx] !== '{') braceIdx++;
        if (braceIdx >= resumeObj.length) continue;
        
        const jobObj = extractObject(resumeObj, braceIdx);
        if (jobObj) {
            jobs[key] = jobObj;
        }
    }
    
    // Build new resume object
    let newResume = 'resume: {\n';
    for (let i = 0; i < jobOrder.length; i++) {
        const oldKey = jobOrder[i].old;
        if (jobs[oldKey]) {
            newResume += `            job${i + 1}: ${jobs[oldKey]},\n`;
        }
    }
    // Add download, contacts, footer from original
    const downloadIdx = resumeObj.indexOf('download:');
    if (downloadIdx !== -1) {
        newResume += resumeObj.substring(downloadIdx);
    }
    
    // Replace in content
    const newContent = content.substring(0, resumeIdx) + newResume;
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