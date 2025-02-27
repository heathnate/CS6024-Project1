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
    scatterplotMedianIncomeData.forEach(d => {
        d.Value = +d.Value;
    });

    // Filter income data to just poverty rate percentage
    scatterplotPovertyData = incomeData.filter(entry => entry.Attribute === 'PCTPOVALL');
    scatterplotPovertyData.forEach(d => {
        d.Value = +d.Value;
    });

    healthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
        d.percent_high_cholesterol = +d.percent_high_cholesterol;
    });

    scatterplotHealthData = healthData.filter(d => d.percent_high_blood_pressure >= 0 && d.percent_high_cholesterol >= 0);

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
    geoDataCopy = JSON.parse(JSON.stringify(geoData));

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
    
    choroplethPHBPData = JSON.parse(JSON.stringify(geoData));

    geoData = JSON.parse(JSON.stringify(geoDataCopy));

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
Promise.all([
    d3.csv('data/Rural_Atlas_Update24/Income.csv'),
    d3.csv('data/national_health_data_2024.csv')
])
.then(([incomeData, healthData]) => {
    incomeData = incomeData.filter(d => d.Attribute === 'MedHHInc');
    incomeData.forEach(d => {
        d.Value = +d.Value;
    });
    barchartIncomeData = incomeData;

    healthData.forEach(d => {
        d.percent_high_blood_pressure = +d.percent_high_blood_pressure;
    });
    barchartHealthData = healthData.filter(d => d.percent_high_blood_pressure >= 0);

    barchart = new BarChart({
        parentElement: '#barchart',
        containerWidth: 600,
        containerHeight: 300
    }, barchartIncomeData);
})

// Scatterplot event listeners
d3.selectAll('#scatterplotXOptions').on('change', function() {
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
d3.selectAll('#scatterplotYOptions').on('change', function() {
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
        let phbpData = healthData.filter(entry => entry.percent_high_blood_pressure);
        geoData.objects.counties.geometries.forEach(d => {
            d.properties.pop = null;
            for (let i = 0; i < phbpData.length; i++) {
                if (d.id === phbpData[i].FIPS) {
                    d.properties.pop = +phbpData[i].percent_high_blood_pressure;
                }
            }
        })
        
        choroplethPHBPData = JSON.parse(JSON.stringify(geoData));
        choropleth.data = choroplethPHBPData;
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
});

// Barchart event listener
d3.selectAll('#barchartOptions').on('change', function() {
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

function filterDataFromBarchart() {
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
        // Set flag to false so scales do not update
        if (barchart.selectedAttribute === 'median_household_income') {
            // Scatterplot updates
            // Reset HTML dropdown
            document.getElementById('scatterplotXOptions').value = 'Median Household Income (USD)';
            scatterplot.resetXScale = true;
            scatterplot.selectedXAttribute = 'Median Household Income (USD)';
            let scatterplotMedianIncomeDataCopy;
            binFilter.forEach(b => {
                scatterplotMedianIncomeDataCopy = scatterplotMedianIncomeData;
                scatterplotMedianIncomeDataCopy = scatterplotMedianIncomeDataCopy.filter(d => d.Value >= b[0] && d.Value <= b[1]);
                filteredData = filteredData.concat(scatterplotMedianIncomeDataCopy);
            });
            scatterplot.xData = filteredData;

            filteredData = [];

            // Choropleth updates
            document.getElementById('choroplethOptions').value = 'median_household_income';
            choropleth.selectedAttribute = 'median_household_income';
            let choroplethMedIncomeDataCopy;
            binFilter.forEach(b => {
                choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));
                choroplethMedIncomeDataCopy.objects.counties.geometries = choroplethMedIncomeDataCopy.objects.counties.geometries.filter(d => d.properties.pop >= b[0] && d.properties.pop <= b[1]);
                filteredData = filteredData.concat(choroplethMedIncomeDataCopy.objects.counties.geometries);
            })
            choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));
            choroplethMedIncomeDataCopy.objects.counties.geometries = filteredData;
            choropleth.us = choroplethMedIncomeDataCopy;
            choropleth.fullData = JSON.parse(JSON.stringify(choroplethMedIncomeData));
            choropleth.data= JSON.parse(JSON.stringify(choroplethMedIncomeData));
        }
        else if (barchart.selectedAttribute === 'percent_high_blood_pressure') {
            // Scatterplot updates
            // Reset HTML dropdown
            document.getElementById('scatterplotYOptions').value = 'High Blood Pressure (%)';
            scatterplot.resetYScale = true;
            scatterplot.selectedYAttribute = 'High Blood Pressure (%)';
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
            document.getElementById('choroplethOptions').value = 'percent_high_blood_pressure';
            choropleth.selectedAttribute = 'percent_high_blood_pressure';
            let choroplethPHBPDataCopy;
            binFilter.forEach(b => {
                choroplethPHBPDataCopy = JSON.parse(JSON.stringify(choroplethPHBPData));
                choroplethPHBPDataCopy.objects.counties.geometries = choroplethPHBPDataCopy.objects.counties.geometries.filter(d => d.properties.pop >= b[0] && d.properties.pop <= b[1]);
                filteredData = filteredData.concat(choroplethPHBPDataCopy.objects.counties.geometries);
            })
            choroplethPHBPDataCopy = JSON.parse(JSON.stringify(choroplethPHBPData));
            choroplethPHBPDataCopy.objects.counties.geometries = filteredData;
            console.log(choroplethPHBPDataCopy);
            choropleth.us = choroplethPHBPDataCopy;
            choropleth.fullData = JSON.parse(JSON.stringify(choroplethPHBPData));
            choropleth.data = JSON.parse(JSON.stringify(choroplethPHBPData));
        }
    }
    scatterplot.updateVis();
    choropleth.updateVis();
}

function updateChoroplethAndBarchart(selectedPoints) {
    if (!selectedPoints) {
        choropleth.us = JSON.parse(JSON.stringify(geoData));
        barchart.data = barchartIncomeData;
    }
    else {
        // Update choropleth with data from scatterplot brush
        let choroplethMedIncomeDataCopy = JSON.parse(JSON.stringify(choroplethMedIncomeData));
        choroplethMedIncomeDataCopy.objects.counties.geometries = choroplethMedIncomeDataCopy.objects.counties.geometries.filter(d => {
            for (p in selectedPoints) {
                if (d.id === selectedPoints[p].FIPS || d.id === '0' + selectedPoints[p].FIPS) {
                    return true;
                }
            }
            return false;
        })
        choropleth.us = choroplethMedIncomeDataCopy;

        // Update barchart with data from scatterplot brush
        let barchartIncomeDataCopy = JSON.parse(JSON.stringify(barchartIncomeData));
        barchartIncomeDataCopy = barchartIncomeDataCopy.filter(d => {
            for (p in selectedPoints) {
                if (d.FIPS === selectedPoints[p].FIPS) {
                    return true;
                }
            }
            return false;
        });
        barchart.data = barchartIncomeDataCopy;
        barchart.updateScales = false;
    }
    choropleth.updateVis();
    barchart.updateVis();
}