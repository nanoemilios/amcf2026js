const fs = require('fs');

// Exact dates from HTML (job1=oldest, job11=newest)
const htmlDates = {
    job1: '1997 - 1999',
    job2: '1999-2002',
    job3: '06.2002 - 05.2007',
    job4: '2003 - 2005',
    job5: '2005',
    job6: '08.2008 - 12.2013',
    job7: '06.2013 - 06.2014',
    job8: '07.2014 - 12.2014',
    job9: '07.2015 - 04.2019',
    job10: '04.2019 - 09.2020',
    job11: '09.2020 - Heute'
};

// Job titles from HTML (German)
const htmlTitles = {
    job1: 'Migros - Schweiz (Lageristen Lehre)',
    job2: 'Coop - Suisse (Verkäufer)',
    job3: 'Hug Engineering AG (Gruppenleiter)',
    job4: 'BVS Winterthur (PC Master)',
    job5: 'Diplomierter Webdesigner (EU Norm)',
    job6: 'Bipresent.com',
    job7: 'Hug Engineering AG',
    job8: 'Die Schweizerische Post',
    job9: 'Schindler Aufzüge AG',
    job10: 'Garaventa Lift AG',
    job11: 'AS Aufzüge AG'
};

// Translations for each language - only date and title need to be exact per HTML
// The text content can remain as-is since it's not in the HTML data-i18n attributes
const langTranslations = {
    'de': {
        job1: { date: '1997 - 1999', title: 'Migros - Schweiz (Lageristen Lehre)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Verkäufer)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Gruppenleiter)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Diplomierter Webdesigner (EU Norm)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'Die Schweizerische Post' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Aufzüge AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Heute', title: 'AS Aufzüge AG' }
    },
    'de-ch': {
        job1: { date: '1997 - 1999', title: 'Migros - Schwiiz (Lagerischti Lehri)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Verkäufer)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Gruppeliiter)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Dipl. Webdesigner (EU Norm)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'D Schwiizerisch Post' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Lifte AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Hüt', title: 'AS Lifte AG' }
    },
    'en': {
        job1: { date: '1997 - 1999', title: 'Migros - Switzerland (Warehouse Apprentice)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Salesperson)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Team Leader)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Certified Web Designer (EU Standard)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'Swiss Post' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Elevator AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Present', title: 'AS Lifts AG' }
    },
    'es': {
        job1: { date: '1997 - 1999', title: 'Migros - Suiza (Aprendiz de Almacén)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Vendedor)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Jefe de Equipo)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Diseñador Web Certificado (Estándar EU)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'Correos Suizos' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Ascensores AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Actualidad', title: 'AS Ascensores AG' }
    },
    'gl': {
        job1: { date: '1997 - 1999', title: 'Migros - Suíza (Aprentiz de Almacén)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Vendedor)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Xefe de Equipo)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Deseñador Web Certificado (Estándar UE)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'Correos Suíces' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Ascensores AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Actualidade', title: 'AS Ascensores AG' }
    },
    'pt': {
        job1: { date: '1997 - 1999', title: 'Migros - Suíça (Aprendiz de Armazém)' },
        job2: { date: '1999-2002', title: 'Coop - Suisse (Vendedor)' },
        job3: { date: '06.2002 - 05.2007', title: 'Hug Engineering AG (Chefe de Equipa)' },
        job4: { date: '2003 - 2005', title: 'BVS Winterthur (PC Master)' },
        job5: { date: '2005', title: 'Designer Web Certificado (Padrão UE)' },
        job6: { date: '08.2008 - 12.2013', title: 'Bipresent.com' },
        job7: { date: '06.2013 - 06.2014', title: 'Hug Engineering AG' },
        job8: { date: '07.2014 - 12.2014', title: 'Correios Suíços' },
        job9: { date: '07.2015 - 04.2019', title: 'Schindler Elevadores AG' },
        job10: { date: '04.2019 - 09.2020', title: 'Garaventa Lift AG' },
        job11: { date: '09.2020 - Atualidade', title: 'AS Elevadores AG' }
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

function updateJobDatesAndTitles(filePath, lang) {
    const content = fs.readFileSync(filePath, 'utf8');
    const translations = langTranslations[lang];
    if (!translations) { console.log(`No translations for ${lang}`); return; }
    
    let newContent = content;
    for (let i = 1; i <= 11; i++) {
        const key = `job${i}`;
        const trans = translations[`job${i}`];
        if (!trans) continue;
        
        // Update date
        const dateRegex = new RegExp(`(${key}:\\s*\\{[^}]*date:\\s*')[^']*(')`);
        newContent = newContent.replace(dateRegex, `$1${translations[key].date}$2`);
        
        // Update title
        const titleRegex = new RegExp(`(${key}:\\s*\\{[^}]*title:\\s*')[^']*(')`);
        newContent = newContent.replace(titleRegex, `$1${translations[key].title}$2`);
    }
    
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

files.forEach(f => updateJobDatesAndTitles(f.path, f.lang));
console.log('Done!');