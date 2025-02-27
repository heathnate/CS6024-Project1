class BarChart {
    // Constructor initializes the chart with configuration, income data, and health data
    constructor(_config, _data, _healthData) {
        // Default configuration with fallbacks for width and height
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 600,
            containerHeight: _config.containerHeight || 400,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 50, bottom: 50, left: 70}, // Increased left margin for axis labels
        }
        this.data = _data;                      // Current working dataset
        this.initialIncomeData = _data;         // Store original income data for reference
        this.initialHealthData = _healthData;   // Store original health data for reference

        // Accessor function to extract values from data objects
        this.valueAccessor = d => d.Value;

        // Variables for histogram binning
        this.bin;      // D3 binning function
        this.bins;     // Binned data after processing

        this.color = 'steelblue';  // Default color for income data visualization

        this.xTickInterval = 10000;  // Interval for x-axis ticks (in USD)

        // Track which attribute is currently displayed
        this.selectedAttribute = 'median_household_income';

        // Flag to determine whether to use initial scales or recalculate
        this.useInitialScales = false;

        this.svg;  // Will hold the SVG element

        // Initialize the visualization
        this.initVis();
    }

    // Set up the static elements of the visualization
    initVis() {
        let vis = this;

        // Calculate the inner dimensions of the chart
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Create SVG container and transform it to respect margins
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)
            .append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Initialize D3 binning function with domain and thresholds
        vis.bin = d3.bin()
            .domain([0, d3.max(vis.data, vis.valueAccessor)])
            .value(vis.valueAccessor)
            .thresholds(10);  // Create 10 bins
        vis.bins = vis.bin(vis.data);  // Apply binning to data

        // Calculate maximum x value and round up to nearest tick interval
        const xMax = d3.max(vis.bins, d => d.x1);
        const xMaxRounded = Math.ceil(xMax / vis.xTickInterval) * vis.xTickInterval;

        // Create x scale (linear)
        vis.xScale = d3.scaleLinear()
            .domain([0, xMaxRounded])
            .range([0, vis.width]);

        // Calculate maximum y value (bin count) and round up to nearest interval
        const yMax = d3.max(vis.bins, d => d.length);
        const yTickInterval = 200; // Bin count tick interval
        const yMaxRounded = Math.ceil(yMax / yTickInterval) * yTickInterval;

        // Create y scale (linear)
        vis.yScale = d3.scaleLinear()
            .domain([0, yMaxRounded])
            .nice()  // Rounds the domain to nice round values
            .range([vis.height, 0]);  // Inverted to put origin at bottom

        // Initialize x-axis with ticks
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10);

        // Initialize y-axis with ticks
        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10);

        // Set axis labels
        vis.xAxisLabel = 'Median Household Income (USD)';
        vis.yAxisLabel = 'Number of Counties';

        // Add y-axis title that won't change
        vis.yAxisTitle = vis.svg.append('text')
            .attr('class', 'y-axis-title')
            .attr('x', -50)
            .attr('y', -30)
            .attr('dy', '1em')
            .text(vis.yAxisLabel);

        // Add x-axis title (will be updated if attribute changes)
        vis.xAxisTitle = vis.svg.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom - 20)
            .attr('x', vis.width / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text(vis.xAxisLabel);

        // Append x-axis to SVG
        vis.xAxisG = vis.svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`)  // Position at bottom
            .call(vis.xAxis);
            
        // Append y-axis to SVG
        vis.yAxisG = vis.svg.append('g')
            .attr('class', 'axis y-axis')
            .call(vis.yAxis);

        // Call update to render the initial visualization
        vis.updateVis();
    }

    // Update the visualization when data or settings change
    updateVis() {
        let vis = this;

        // Update x-axis title to match current attribute
        vis.xAxisTitle.text(vis.xAxisLabel);

        // Remove existing bars before redrawing
        vis.svg.selectAll('.bars').remove();
        
        // Handle scale based on flag (using initial scales or recalculating)
        if (vis.useInitialScales) {
            // Set domain based on selected attribute using initial data
            if (vis.selectedAttribute === 'median_household_income') {
                vis.bin.domain([0, d3.max(vis.initialIncomeData, vis.valueAccessor)]);
                vis.color = 'steelblue';  // Blue for income data
            } else {
                vis.bin.domain([0, d3.max(vis.initialHealthData, vis.valueAccessor)]);
                vis.color = '#df2c14';  // Red for health data
            }
            vis.bins = vis.bin(vis.data);
            vis.useInitialScales= false;  // Reset flag
        } else {
            // Recalculate bin domain based on current data
            vis.bin
                .domain([0, d3.max(vis.data, vis.valueAccessor)])
                .value(vis.valueAccessor)
                .thresholds(10);

            vis.bins = vis.bin(vis.data);

            // Calculate new x-axis domain
            const xMax = d3.max(vis.bins, d => d.x1);
            const xMaxRounded = Math.ceil(xMax / vis.xTickInterval) * vis.xTickInterval;

            vis.xScale.domain([0, xMaxRounded]);
        }

        // Re-bin the data with updated binning function
        vis.bins = vis.bin(vis.data);

        // Calculate y-axis domain with dynamic tick interval
        const yMax = d3.max(vis.bins, d => d.length);
        // Adaptive tick interval based on data range (minimum 100)
        const yTickInterval = yMax > 0 ? Math.max(100, Math.round(yMax / 800) * 100) : 100; 
        const yMaxRounded = Math.ceil(yMax / yTickInterval) * yTickInterval;

        // Update y scale domain
        vis.yScale.domain([0, yMaxRounded]).nice();

        // Update axes with new scales
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        // Render the visualization with updated data
        vis.renderVis();
    }

    // Render the bars of the histogram
    renderVis() {
        let vis = this;
        
        // Calculate bar width from first bin
        const width = vis.xScale(vis.bins[0].x1) - vis.xScale(vis.bins[0].x0);

        // Create and append bars
        const bars = vis.svg.append('g')
            .attr('fill', vis.color)  // Use current color (blue for income, red for health)
            .attr('class', 'bars')
            .selectAll('rect')
            .data(vis.bins)
            .join('rect')
                .attr('x', d => vis.xScale(d.x0))  // Left edge of bar
                .attr('y', d => vis.yScale(d.length))  // Top edge of bar
                .attr('width', width)  // Width based on bin size
                .attr('height', d => vis.height - vis.yScale(d.length));  // Height based on count

        // Add tooltips on mouseover
        bars.on('mouseover', function(event, d) {
            d3.select('#barchart-tooltip')
                .style('display', 'block')
                .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                .html(`
                    <div class="tooltip-title">Total Counties: ${d.length}</div>
                    `);
        })
        .on('mouseleave', () => {
            d3.select('#barchart-tooltip').style('display', 'none');
        });

        // Add click interaction for filtering
        bars.on('click', function(event, d) {
            // Get the bin range from the first element in the bin
            const sampleVal = vis.valueAccessor(d[0]);
            let selectedBin = vis.bins.filter(b => b.x0 <= sampleVal && b.x1 >= sampleVal);
            selectedBin = [selectedBin[0].x0, selectedBin[0].x1];
            let selectedLowerBound = selectedBin[0];

            // Check if bin is already selected (toggle functionality)
            let isActive = false;
            binFilter.forEach(b => {
                if (b[0] === selectedLowerBound) {
                    isActive = true;
                }
            });

            // Update global binFilter array (toggling selection)
            if (isActive) {
                binFilter = binFilter.filter(f => f[0] !== selectedLowerBound);
            } else {
                binFilter.push(selectedBin);
            }
            
            // Toggle active class for visual feedback
            d3.select(this).classed('active', !isActive);
            
            // Call external function to filter other visualizations
            filterDataFromBarchart();
        });
    }
}