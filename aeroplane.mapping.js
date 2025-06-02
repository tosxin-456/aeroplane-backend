const fs = require('fs');
const path = require('path');

// Read CSV file
const csvData = fs.readFileSync(path.join(__dirname, 'data.csv'), 'utf-8');

// Split lines
const rows = csvData.trim().split('\n');

const result = {};

rows.forEach((row, index) => {
    const columns = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

    if (!columns || columns.length < 6) return;

    const name = columns[1]?.replace(/"/g, '').trim();       // 2nd column: Name
    const city = columns[2]?.replace(/"/g, '').trim();       // 3rd column: City
    const country = columns[3]?.replace(/"/g, '').trim();    // 4th column: Country
    const iata = columns[4]?.replace(/"/g, '').trim();       // 5th column: IATA

    if (!country || !city || !name) return;

    if (!result[country]) {
        result[country] = {};
    }

    if (!result[country][city]) {
        result[country][city] = [];
    }

    const airportData = {
        name,
        iata: iata === '\\N' ? null : iata
    };

    // Prevent duplicates
    const exists = result[country][city].some(
        a => a.name === airportData.name && a.iata === airportData.iata
    );

    if (!exists) {
        result[country][city].push(airportData);
    }
});

const jsonOutput = JSON.stringify(result, null, 2);
console.log(jsonOutput);

// Optionally write to file
fs.writeFileSync('output.json', jsonOutput);
