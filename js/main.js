let incomeData, healthData, choropleth, choroplethMedIncomeData, choroplethPHBPData, geoData, scatterplotMedianIncomeData, scatterplotPovertyData, scatterplotHealthData, barchartIncomeData, barchartHealthData;
let binFilter = [];

// Scatterplot data manipulation
// Load both datasets asynchronously and wait for completion
Promise.all([
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([incomeData, healthData]) => {
    // Filter income data to just median household income
    scatterplotMedianIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc');

    // Convert from string to int
    scatterplotMedianIncomeData.forEach(d => {
        d.Value = +d.Value;
    });

    // Filter income data to just poverty rate percentage
    scatterplotPovertyData = incomeData.filter(entry => entry.Attribute === 'PCTPOVALL');

    // Convert from string to int
    scatterplotPovertyData.forEach(d => {
        d.Value = +d.Value;
    });

    // Convert from string to int
    healthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
        d.percent_high_cholesterol = +d.percent_high_cholesterol;
    });

    // Filter out bad data
    scatterplotHealthData = healthData.filter(d => d.percent_high_blood_pressure >= 0 && d.percent_high_cholesterol >= 0);

    // Create scatterplot
    scatterplot = new Scatterplot({
        'parentElement': '#scatterplot',
        'containerHeight': 300,
        'containerWidth': 500
    }, scatterplotMedianIncomeData, scatterplotHealthData);
})
.catch(error => {
    console.error('Error: ', error);
});

// Choropleth map data manipulation
// Load all datasets asynchronously and wait for completion
Promise.all([
    d3.json('data/counties-10m.json'),
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([localGeoData, localIncomeData, localHealthData]) => {
    // Convert from string to int
    localHealthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
    });
    // Filter out bad data
    healthData = localHealthData.filter(d => d.percent_high_blood_pressure >= 0);
    
    // Set global vars
    geoData = localGeoData;
    incomeData = localIncomeData;

    // Filter data to just median income attribute
    let medIncomeData = incomeData.filter(entry => entry.Attribute === 'MedHHInc');
    
    // Match pop property on geoData to values from income data
    geoData.objects.counties.geometries.forEach(d => {
        for (let i = 0; i < medIncomeData.length; i++) {
            // Reason for second condition is where FIPS is 4 digits. The FIPS attribute doesn't have leading zeros which wouldn't satisfy 
            // the first case
            if (d.id === medIncomeData[i].FIPS || d.id === '0' + medIncomeData[i].FIPS) {
                d.properties.pop = +medIncomeData[i].Value;
            }
        }
    });

    // Create "deep copies" of data
    // JavaScript will sometimes assign by reference instead of value, so this blocks changes to choroplethMedIncomeData to reflect onto geoData
    choroplethMedIncomeData = JSON.parse(JSON.stringify(geoData));
    geoDataCopy = JSON.parse(JSON.stringify(geoData));

    // Filter data to only counties that have recorded high blood pressure percentages and combine with geoData
    let phbpData = healthData.filter(entry => entry.percent_high_blood_pressure);
    geoData.objects.counties.geometries.forEach(d => {
        d.properties.pop = null;
        for (let i = 0; i < phbpData.length; i++) {
            if (d.id === phbpData[i].FIPS) {
                d.properties.pop = +phbpData[i].percent_high_blood_pressure;
            }
        }
    })
    
    // Create "deep copies" of data
    choroplethPHBPData = JSON.parse(JSON.stringify(geoData));
    geoData = JSON.parse(JSON.stringify(geoDataCopy));

    // Create choropleth
    choropleth = new Choropleth ({
        parentElement: '#choropleth',
        containerWidth: 650,
        containerHeight: 300,
    }, geoData);
})
.catch(error => {
    console.error('Error: ', error);
});

// Bar chart data manipulation
// Load both datasets asynchronously and wait for completion
Promise.all([
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([incomeData, healthData]) => {
    // Filter data to just median income attribute
    incomeData = incomeData.filter(d => d.Attribute === 'MedHHInc');

    // Convert from string to int
    incomeData.forEach(d => {
        d.Value = +d.Value;
    });

    // Set global variable
    barchartIncomeData = incomeData;


    // Convert from string to int
    healthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
    });

    // Filter out bad data
    barchartHealthData = healthData.filter(d => d.percent_high_blood_pressure >= 0);


    // Create barchart
    barchart = new BarChart({
        parentElement: '#barchart',
        containerWidth: 600,
        containerHeight: 300
    }, barchartIncomeData, barchartHealthData);
})

// Scatterplot event listeners
d3.selectAll('#scatterplot-x-options').on('change', function() {
    let selectedAttribute = d3.select(this).property('value');
    scatterplot.selectedXAttribute = selectedAttribute;

    if (selectedAttribute === 'Median Household Income (USD)') {
        scatterplot.xData = scatterplotMedianIncomeData;
    }
    else if (selectedAttribute === 'Poverty Rate (%)') {
        scatterplot.xData = scatterplotPovertyData;
    }

    scatterplot.updateVis();
});
d3.selectAll('#scatterplot-y-options').on('change', function() {
    let selectedAttribute = d3.select(this).property('value');
    scatterplot.selectedYAttribute = selectedAttribute;

    if (selectedAttribute === 'High Blood Pressure (%)') {
        scatterplot.yValue = d => d.percent_high_blood_pressure;
    }
    else if (selectedAttribute === 'High Cholesterol (%)') {
        scatterplot.yValue = d => d.percent_high_cholesterol;
    }

    scatterplot.updateVis();
});

// Choropleth event listener
d3.selectAll('#choropleth-options').on('change', function() {
    let selectedAttribute = d3.select(this).property('value');

    if (selectedAttribute === 'median_household_income') {
        // Filter data to just median income attribute
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

        // Create "deep copy" of data
        choropleth.data = JSON.parse(JSON.stringify(geoData));

        // Set color scale
        choropleth.colorScale = d3.scaleSequential(d3.interpolateBlues)
            .domain(d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop));


        // Set legend title
        choropleth.legendTitle.text('Median household income (USD)');

        // Create stops for legend gradient
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
        let phbpData = healthData.filter(entry => entry.percent_high_blood_pressure);
        geoData.objects.counties.geometries.forEach(d => {
            d.properties.pop = null;
            for (let i = 0; i < phbpData.length; i++) {
                if (d.id === phbpData[i].FIPS) {
                    d.properties.pop = +phbpData[i].percent_high_blood_pressure;
                }
            }
        })
        
        // Create "deep copy" of data
        choroplethPHBPData = JSON.parse(JSON.stringify(geoData));

        choropleth.data = choroplethPHBPData;

        // Set color scale
        choropleth.colorScale = d3.scaleSequential(d3.interpolateReds)
            .domain(d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop));
        
        // Set legend title
        choropleth.legendTitle.text('High blood pressure percentage (%)');

        // Create stops for legend gradient
        const redScale = d3.scaleSequential(d3.interpolateReds).domain([0, 100]);
        const popExtent = d3.extent(choropleth.data.objects.counties.geometries, d => d.properties.pop);
        choropleth.legendStops = [
            { color: redScale(0), value: popExtent[0], offset: 0},
            { color: redScale(100), value: popExtent[1], offset: 100}
        ];

        choropleth.selectedAttribute = 'percent_high_blood_pressure';
    }

    choropleth.updateVis();
});

// Barchart event listener
d3.selectAll('#barchart-options').on('change', function() {
    let selectedAttribute = d3.select(this).property('value');
    barchart.selectedAttribute = selectedAttribute;

    if (selectedAttribute === 'median_household_income') {
        barchart.data = barchartIncomeData;
        barchart.valueAccessor = d => d.Value;
        barchart.xAxisLabel = 'Median Household Income (USD)';
        barchart.yAxisLabel = 'Number of Counties';
        barchart.color = 'steelblue';
        barchart.xTickInterval = 10000;
    }
    else if (selectedAttribute === 'percent_high_blood_pressure') {
        barchart.data = barchartHealthData;
        barchart.valueAccessor = d => d.percent_high_blood_pressure;
        barchart.xAxisLabel = 'High Blood Pressure Percentage (%)';
        barchart.yAxisLabel = 'Number of Counties';
        barchart.color = '#df2c14';
        barchart.xTickInterval = 10;
    }

    barchart.updateVis();
});

// Function to update scatterplot and choropleth when data is filtered in barchart
function filterDataFromBarchart() {
    // If no bins are selected, return to default state
    if (binFilter.length === 0) {
        if (barchart.selectedAttribute === 'median_household_income') {
            scatterplot.xData = scatterplotMedianIncomeData;
            choropleth.us = choroplethMedIncomeData;
        }
        else if (barchart.selectedAttribute === 'percent_high_blood_pressure') {
            scatterplot.yData = scatterplotHealthData;
            choropleth.us = choroplethPHBPData;
        }
    }
    else {
        let filteredData = [];
        if (barchart.selectedAttribute === 'median_household_income') {
            // Scatterplot updates
            // Set HTML dropdown
            document.getElementById('scatterplot-x-options').value = 'Median Household Income (USD)';

            // Tell scatterplot to use default x scale (we do not want x scale to be dynamic to selected bins)
            scatterplot.resetXScale = true;

            scatterplot.selectedXAttribute = 'Median Household Income (USD)';

            // Filter scatterplot data based on selected bins
            // Filter one bin at a time and combine all the data
            let scatterplotMedianIncomeDataCopy;
            binFilter.forEach(b => {
                scatterplotMedianIncomeDataCopy = scatterplotMedianIncomeData;
                scatterplotMedianIncomeDataCopy = scatterplotMedianIncomeDataCopy.filter(d => d.Value >= b[0] && d.Value <= b[1]);
                filteredData = filteredData.concat(scatterplotMedianIncomeDataCopy);
            });
            scatterplot.xData = filteredData;

            filteredData = [];

            // Choropleth updates
            // Set HTML dropdown
            document.getElementById('choropleth-options').value = 'median_household_income';

            choropleth.selectedAttribute = 'median_household_income';

            // Filter choropleth data based on selected bins
            // Filter one bin at a time and combine all the data
            let choroplethMedIncomeDataCopy;
            binFilter.forEach(b => {
                choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));
                choroplethMedIncomeDataCopy.objects.counties.geometries = choroplethMedIncomeDataCopy.objects.counties.geometries.filter(d => d.properties.pop >= b[0] && d.properties.pop <= b[1]);
                filteredData = filteredData.concat(choroplethMedIncomeDataCopy.objects.counties.geometries);
            })
            
            // Create "deep copy" of data
            choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));

            choroplethMedIncomeDataCopy.objects.counties.geometries = filteredData;
            choropleth.us = choroplethMedIncomeDataCopy;

            // Set a full data attribute as well so that we can still draw the whole map
            choropleth.fullData = JSON.parse(JSON.stringify(choroplethMedIncomeData));

            choropleth.data = JSON.parse(JSON.stringify(choroplethMedIncomeData));
        }
        else if (barchart.selectedAttribute === 'percent_high_blood_pressure') {
            // Scatterplot updates
            // Set HTML dropdown
            document.getElementById('scatterplot-y-options').value = 'High Blood Pressure (%)';

            // Tell scatterplot to use default x scale (we do not want x scale to be dynamic to selected bins)
            scatterplot.resetYScale = true;

            scatterplot.selectedYAttribute = 'High Blood Pressure (%)';
            
            // Filter scatterplot data based on selected bins
            // Filter one bin at a time and combine all the data
            let scatterplotHealthDataCopy;
            binFilter.forEach(b => {
                scatterplotHealthDataCopy = scatterplotHealthData;
                scatterplotHealthDataCopy = scatterplotHealthDataCopy.filter(d => d.percent_high_blood_pressure >= b[0] && d.percent_high_blood_pressure <= b[1]);
                filteredData = filteredData.concat(scatterplotHealthDataCopy);
            });
            scatterplot.yData = filteredData;
            scatterplot.yValue = d => d.percent_high_blood_pressure;

            filteredData = [];

            // Choropleth updates
            // Set HTML dropdown
            document.getElementById('choropleth-options').value = 'percent_high_blood_pressure';

            choropleth.selectedAttribute = 'percent_high_blood_pressure';
            
            // Filter choropleth data based on selected bins
            // Filter one bin at a time and combine all the data
            let choroplethPHBPDataCopy;
            binFilter.forEach(b => {
                choroplethPHBPDataCopy = JSON.parse(JSON.stringify(choroplethPHBPData));
                choroplethPHBPDataCopy.objects.counties.geometries = choroplethPHBPDataCopy.objects.counties.geometries.filter(d => d.properties.pop >= b[0] && d.properties.pop <= b[1]);
                filteredData = filteredData.concat(choroplethPHBPDataCopy.objects.counties.geometries);
            })
            // Create "deep copy" of data
            choroplethPHBPDataCopy = JSON.parse(JSON.stringify(choroplethPHBPData));

            choroplethPHBPDataCopy.objects.counties.geometries = filteredData;
            choropleth.us = choroplethPHBPDataCopy;

            // Set a full data attribute as well so that we can still draw the whole map
            choropleth.fullData = JSON.parse(JSON.stringify(choroplethPHBPData));
            choropleth.data = JSON.parse(JSON.stringify(choroplethPHBPData));
        }
    }
    scatterplot.updateVis();
    choropleth.updateVis();
}

// Function that handles updating the data on choropleth and barchart when data from the choropleth brush comes in
function updateChoroplethAndBarchart(selectedPoints) {
    // If brush selection was cleared, reset to defaults
    if (!selectedPoints) {
        choropleth.us = JSON.parse(JSON.stringify(geoData));
        choropleth.selectedAttribute = 'median_household_income';
        barchart.data = barchartIncomeData;
    }
    else {
        // Set HTML dropdown
        document.getElementById('choropleth-options').value = 'median_household_income';

        // Update choropleth with data from scatterplot brush
        let choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));
        
        // Filter map data to only counties that were selected
        choroplethMedIncomeDataCopy.objects.counties.geometries = choroplethMedIncomeDataCopy.objects.counties.geometries.filter(d => {
            for (p in selectedPoints) {
                if (d.id === selectedPoints[p].FIPS || d.id === '0' + selectedPoints[p].FIPS) {
                    return true;
                }
            }
            return false;
        })
        choropleth.us = choroplethMedIncomeDataCopy;
        choropleth.selectedAttribute = 'median_household_income';

        // Set HTML dropdown
        document.getElementById('barchart-options').value = 'median_household_income';

        // Update barchart with data from scatterplot brush
        // Create "deep copy" of data
        let barchartIncomeDataCopy = JSON.parse(JSON.stringify(barchartIncomeData));
        // Filter barchart data to only counties that were selected
        barchartIncomeDataCopy = barchartIncomeDataCopy.filter(d => {
            for (p in selectedPoints) {
                if (d.FIPS === selectedPoints[p].FIPS) {
                    return true;
                }
            }
            return false;
        });
        barchart.data = barchartIncomeDataCopy;
        barchart.selectedAttribute = 'median_household_income';
        barchart.xAxisLabel = 'Median Household Income (USD)';
        // Set a initial scales flag (we do not want the bar chart axes to be dynamic to the brush)
        barchart.useInitialScales = true;
        barchart.valueAccessor = d => d.Value;
    }
    choropleth.updateVis();
    barchart.updateVis();
}