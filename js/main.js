console.log('Hello!');

let incomeData, healthData, scatterplot;

// Load both datasets asynchronously and wait for completion
Promise.all([
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([incomeData, healthData]) => {
    console.log('Both datasets loaded.');

    // Filter income data
    let medianIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc')

    // Create a lookup table for health data
    let healthDataLookup = healthData.reduce((acc, row) => {
        acc[row.cnty_fips] = row;  // Assuming 'cnty_fips' is the common key
        return acc;
    }, {});

    // Merge the datasets based on FIPS
    let mergedData = medianIncomeData
    .filter(d => healthDataLookup[d.FIPS])  // Filter out data where there is no corresponding FIPS 
    .map(d => ({
        ...d,
        ...healthDataLookup[d.FIPS]  // Ensure the keys match exactly
    }))
    .filter(d => d.percent_high_blood_pressure >= 0); // Remove tuples where high blood pressure data is invalid (-1)
    console.log('Merged Data: ', mergedData);

    scatterplot = new Scatterplot({
        'parentElement': '#scatterplot',
        'containerHeight': 1000,
        'containerWidth': 1000
    }, mergedData);
})
.catch(error => {
    console.error('Error loading datasets:', error);
});
