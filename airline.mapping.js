const fs = require('fs');
const path = require('path');

// Read CSV file
const csvData = fs.readFileSync(path.join(__dirname, 'airlines.csv'), 'utf-8');

// Split lines
const rows = csvData.trim().split('\n');

const result = {};

rows.forEach((row) => {
    const columns = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);

    if (!columns || columns.length < 5) return;

    const airlineName = columns[1]?.replace(/"/g, '');
    const iataCode = columns[3]?.replace(/"/g, '');

    // Only use valid IATA codes
    if (iataCode && iataCode !== '\\N' && airlineName) {
        result[iataCode] = airlineName;
    }
});

const jsonOutput = JSON.stringify(result, null, 2);

// Output to console
console.log(jsonOutput);

// Save to output file
fs.writeFileSync('airlineIataToName.json', jsonOutput);
