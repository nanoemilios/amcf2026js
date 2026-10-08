const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\nanoe\\OneDrive\\CODDING\\AMCF\\2026\\js\\scripts.js', 'utf8');
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
    
    const ctx = content.substring(nextIdx - 50, nextIdx + 200);
    if (ctx.includes('hidemenu') || ctx.includes('body') || ctx.includes('document')) {
        console.log('Found at:', nextIdx);
        console.log(ctx);
        console.log('---');
    }
    pos = nextIdx + 1;
}