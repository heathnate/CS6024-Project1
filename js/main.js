console.log('Hello!');

let incomeData, healthData, choropleth, choroplethMedIncomeData, choroplethPHBPData, geoData;

// Scatterplot data manipulation
// Load both datasets asynchronously and wait for completion
Promise.all([
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([incomeData, healthData]) => {
    console.log('Both datasets loaded.');

    // Filter income data
    let medianIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc');
    medianIncomeData.forEach(d => {
        d.Value = +d.Value;
    })

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

    // scatterplot = new Scatterplot({
    //     'parentElement': '#scatterplot',
    //     'containerHeight': 500,
    //     'containerWidth': 500
    // }, mergedData);
})
.catch(error => {
    console.error('Error: ', error);
});

// Choropleth map data manipulation
Promise.all([
    d3.json('data/counties-10m.json'),
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([localGeoData, localIncomeData, localHealthData]) => {
    localHealthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
    });
    healthData = localHealthData.filter(d => d.percent_high_blood_pressure >= 0);
    console.log('Health Data: ', healthData);
    geoData = localGeoData;
    incomeData = localIncomeData;

    let medIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc');
    geoData.objects.counties.geometries.forEach(d => {
        for (let i = 0; i < medIncomeData.length; i++) {
            // Reason for second condition is where FIPS is 4 digits. The FIPS attribute doesn't have leading zeros which wouldn't satisfy 
            // the first case
            if (d.id === medIncomeData[i].FIPS || d.id === '0' + medIncomeData[i].FIPS) {
                d.properties.pop = +medIncomeData[i].Value;
            }
        }
    });

    choroplethMedIncomeData = JSON.parse(JSON.stringify(geoData));

    choropleth = new Choropleth ({
        parentElement: '#choropleth',
        containerWidth: 800,
        containerHeight: 400,
    }, geoData);
})
.catch(error => {
    console.error('Error: ', error);
});

// Choropleth event listener
d3.selectAll('#choroplethOptions').on('change', function() {
    let selectedAttribute = d3.select(this).property('value');

    if (selectedAttribute === 'median_household_income') {
        let medIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc');
        geoData.objects.counties.geometries.forEach(d => {
            // There are a different amount of properties.pop entries for median household income and high blood pressure data, so this line
            // essentially clears the previous pop entries from a different attribute
            d.properties.pop = null;
            for (let i = 0; i < medIncomeData.length; i++) {
                // Reason for second condition is where FIPS is 4 digits. The FIPS attribute doesn't have leading zeros which wouldn't satisfy 
                // the first case
                if (d.id === medIncomeData[i].FIPS || d.id === '0' + medIncomeData[i].FIPS) {
                    d.properties.pop = +medIncomeData[i].Value;
                }
            }
        });

        choropleth.data = JSON.parse(JSON.stringify(geoData));
        choropleth.colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain(d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop));

        choropleth.legendTitle.text('Median household income (USD)');

        const blueScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);
        const popExtent = d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop);
        choropleth.legendStops = [
            { color: blueScale(0), value: popExtent[0], offset: 0},
            { color: blueScale(100), value: popExtent[1], offset: 100}
        ];

        choropleth.selectedAttribute = 'median_household_income';
    }
    else if (selectedAttribute === 'percent_high_blood_pressure') {
        // Filter data to only counties that have recorded high blood pressure percentages
        console.log('healthdata', healthData);
        let phbpData = healthData.filter(entry => entry.percent_high_blood_pressure);
        geoData.objects.counties.geometries.forEach(d => {
            d.properties.pop = null;
            for (let i = 0; i < phbpData.length; i++) {
                if (d.id === phbpData[i].cnty_fips) {
                    d.properties.pop = +phbpData[i].percent_high_blood_pressure;
                }
            }
        })

        choropleth.data = JSON.parse(JSON.stringify(geoData));
        choropleth.colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain(d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop));
        
        choropleth.legendTitle.text('High blood pressure percentage (%)');

        const redScale = d3.scaleSequential(d3.interpolateReds).domain([0, 100]);
        const popExtent = d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop);
        choropleth.legendStops = [
            { color: redScale(0), value: popExtent[0], offset: 0},
            { color: redScale(100), value: popExtent[1], offset: 100}
        ];

        choropleth.selectedAttribute = 'percent_high_blood_pressure';
    }

    choropleth.updateVis();
})