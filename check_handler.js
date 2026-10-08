const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\scripts.js', 'utf8');

// Search for the click handler
let idx = content.indexOf('nav-button").on');
if (idx < 0) idx = content.indexOf("nav-button').on");

if (idx > 0) {
    console.log('Found at:', idx);
    console.log(content.substring(idx - 50, idx + 300));
} else {
    console.log('Not found, searching all click handlers...');
    // Find all .on('click' or .on("click" or .click(
    let pos = 0;
    while (true) {
        let idx1 = content.indexOf(".on('click'", pos);
        let idx2 = content.indexOf('.on("click"', pos);
        let idx3 = content.indexOf('.click(', pos);
        let nextIdx = -1;
        if (idx1 >= 0) nextIdx = idx1;
        if (idx2 >= 0 && (nextIdx < 0 || idx2 < nextIdx)) nextIdx = idx2;
        if (idx3 >= 0 && (nextIdx < 0 || idx3 < nextIdx)) nextIdx = idx3;
        
        if (nextIdx < 0) break;
        
        const ctx = content.substring(nextIdx - 50, nextIdx + 150);
        if (ctx.includes('nav-button')) {
            console.log('Found nav-button handler at:', nextIdx);
            console.log(ctx);
            break;
        }
        pos = nextIdx + 1;
    }
}