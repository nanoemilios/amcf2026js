const fs = require('fs');

// For each language, define the new job order with the OLD keys
const jobMap = {
    // new job1 (oldest) -> old job10 (Migros)
    // new job2 -> old job7 (Coop)
    // new job3 -> old job6 (Hug Engineering Team Leader)
    // new job4 -> old job9 (BVS Winterthur)
    // new job5 -> old job8 (Certified Web Designer)
    // new job6 -> old job5 (Bipresent.com)
    // new job7 -> old job4 (Hug Engineering AG)
    // new job8 -> old job3 (Swiss Post)
    // new job9 -> old job2 (Schindler)
    // new job10 -> old job1 (Garaventa)
};

function reorderJobs(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Find the resume object start
    const resumeStart = content.indexOf('resume: {');
    if (resumeStart === -1) {
        console.log(`No resume found in ${filePath}`);
        return;
    }
    
    // Find the matching closing brace for resume object
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let resumeEnd = -1;
    
    for (let i = resumeStart; i < content.length; i++) {
        const ch = content[i];
        if (!inString) {
            if (ch === '"' || ch === "'") {
                inString = true;
                stringChar = ch;
            } else if (ch === '{') {
                braceCount++;
            } else if (ch === '}') {
                braceCount--;
                if (braceCount === 0) {
                    resumeEnd = i + 1;
                    break;
                }
            }
        } else if (ch === stringChar && content[i - 1] !== '\\') {
            inString = false;
        }
    }
    
    if (resumeEnd === -1) {
        console.log(`Could not find resume end in ${filePath}`);
        return;
    }
    
    const beforeResume = content.substring(0, resumeStart);
    const resumeContent = content.substring(resumeStart, resumeEnd);
    const afterResume = content.substring(resumeEnd);
    
    // Extract each job from resumeContent
    const jobs = {};
    for (let i = 1; i <= 10; i++) {
        const key = `job${i}`;
        const keyIdx = resumeContent.indexOf(`${key}:`);
        if (keyIdx === -1) continue;
        
        // Find opening brace after key
        let braceIdx = keyIdx;
        while (braceIdx < resumeContent.length && resumeContent[braceIdx] !== '{') braceIdx++;
        if (braceIdx >= resumeContent.length) continue;
        
        // Extract the full job object
        let bc = 0;
        let inStr = false;
        let strCh = '';
        let objStart = braceIdx;
        let objEnd = -1;
        
        for (let j = objStart; j < resumeContent.length; j++) {
            const ch = resumeContent[j];
            if (!inStr) {
                if (ch === '"' || ch === "'") {
                    inStr = true;
                    strCh = ch;
                } else if (ch === '{') {
                    bc++;
                } else if (ch === '}') {
                    bc--;
                    if (bc === 0) {
                        objEnd = j + 1;
                        break;
                    }
                }
            } else if (ch === strCh && resumeContent[j - 1] !== '\\') {
                inStr = false;
            }
        }
        
        if (objEnd !== -1) {
            jobs[`job${i}`] = resumeContent.substring(objStart, objEnd);
        }
    }
    
    // Build new resume content with jobs in chronological order
    // 1. Migros (was job10)
    // 2. Coop (was job7)
    // 3. Hug Engineering Team Leader (was job6)
    // 4. BVS Winterthur (was job9)
    // 5. Certified Web Designer (was job8)
    // 6. Bipresent.com (was job5)
    // 7. Hug Engineering AG (was job4)
    // 8. Swiss Post (was job3)
    // 9. Schindler (was job2)
    // 10. Garaventa (was job1)
    
    const newOrder = ['job10', 'job7', 'job6', 'job9', 'job8', 'job5', 'job4', 'job3', 'job2', 'job1'];
    
    let newResume = 'resume: {\n';
    for (let i = 0; i < newOrder.length; i++) {
        const oldKey = newOrder[i];
        if (jobs[oldKey]) {
            newResume += `            job${i + 1}: ${jobs[oldKey]},\n`;
        }
    }
    
    // Add download, contacts, footer from original resume
    const downloadIdx = resumeContent.indexOf('download:');
    if (downloadIdx !== -1) {
        newResume += resumeContent.substring(downloadIdx);
    }
    
    const newContent = beforeResume + newResume + afterResume;
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