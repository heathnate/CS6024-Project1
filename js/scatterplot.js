class Scatterplot {
    // Constructor initializes the scatterplot with configuration and data
    constructor(_config, _xData, _yData) {
        // Configuration object with defaults for dimensions, margins, and tooltip
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1000,
            containerHeight: _config.containerHeight || 800,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 50, bottom: 50, left: 50},
        }
        this.data; // Will hold the merged dataset

        // Default attributes for x and y axes
        this.selectedXAttribute = 'Median Household Income (USD)';
        this.selectedYAttribute = 'High Blood Pressure (%)';

        // Store input data
        this.xData = _xData;
        this.yData = _yData;

        // Flags to control scale reset behavior
        this.resetXScale = false;
        this.resetYScale = false;

        // Helper objects for tooltips and data formatting
        this.tooltipHelper = new TooltipHelper();
        this.dataFormatter = new DataFormatter();
        
        // Color mapping for different attribute combinations
        this.colorMap = {
            "Median Household Income (USD)-High Blood Pressure (%)": "#a000c8",
            "Median Household Income (USD)-High Cholesterol (%)": "#00a300",
            "Poverty Rate (%)-High Blood Pressure (%)": "#fa6122",
            "Poverty Rate (%)-High Cholesterol (%)": "#fcb001"
        };

        // Callback for brush selection events and storage for selected points
        this.onBrushSelection = null;
        this.selectedPoints = null;

        // Initialize visualization
        this.initVis();
    }

    // Set up the initial visualization structure
    initVis() {
        let vis = this;

        // Merge x and y data into a single dataset
        vis.data = vis.dataFormatter.mergeData(vis.xData, vis.yData);

        // Calculate dimensions based on margins
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Create SVG container
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        // Create chart group with margins applied
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

        // Define accessor functions for data values
        vis.xValue = d => d.Value;
        vis.yValue = d => d.percent_high_blood_pressure;

        // Create scales for x and y axes
        vis.xScale = d3.scaleLinear()
            .domain([0, d3.max(vis.xData, vis.xValue)])
            .range([0, vis.width])
            .nice();
        vis.yScale = d3.scaleLinear()
            .domain([0, d3.max(vis.data, vis.yValue)])
            .range([vis.height, 0])
            .nice();
       
        // Store initial domains for reset functionality
        vis.initialXDomain = vis.xScale.domain();
        vis.initialYDomain = vis.yScale.domain();

        // Create axis generators
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10)
        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10)

        // Append axis groups to chart
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');
        
        // Append axis titles/labels
        vis.chart.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom - 15)
            .attr('x', vis.width / 2 + 120)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text(vis.selectedXAttribute);

        vis.svg.append('text')
            .attr('class', 'y-axis-title')
            .attr('x', 0)
            .attr('y', 25)
            .attr('dy', '.71em')
            .text(vis.selectedYAttribute);

        // Create brush for selection functionality
        vis.brush = d3.brush()
            .extent([[0,0], [vis.width, vis.height]])
            .on('brush', function({selection}) {
                if (selection) vis.brushed(selection);
            })
            .on('end', function({selection}) {
                if (!selection) vis.brushed(null);
            });
        
        // Add brush to chart
        vis.brushG = vis.chart.append('g')
            .attr('class', 'brush')
            .call(vis.brush);
    
        // Call update to render the initial visualization
        vis.updateVis();
    }

    // Update visualization when data or attributes change
    updateVis() {
        let vis = this;

        // Clear existing points
        vis.chart.selectAll('.point').remove();
        
        // Re-merge data with potentially new attributes
        vis.data = vis.dataFormatter.mergeData(vis.xData, vis.yData);

        // Handle scale resets based on flags
        let scaleReset = false;
        if (vis.resetXScale) {
            vis.xScale.domain(vis.initialXDomain);
            vis.resetXScale = false;
            scaleReset = true;
        }
        if (vis.resetYScale){
            vis.yScale.domain(vis.initialYDomain);
            vis.resetYScale = false;
            scaleReset = true;
        }
        if (!scaleReset) {
            // Update scales based on new data
            vis.xScale.domain([0, d3.max(vis.xData, vis.xValue)]).nice();
            vis.yScale.domain([0, d3.max(vis.yData, vis.yValue)]).nice();
        }

        // Update axis displays
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        // Update axis titles to reflect selected attributes
        vis.svg.select('.x-axis-title')
            .text(vis.selectedXAttribute);

        vis.svg.select('.y-axis-title')
            .text(vis.selectedYAttribute);

        // Set point color based on selected attribute combination
        vis.pointColor = vis.colorMap[`${vis.selectedXAttribute}-${vis.selectedYAttribute}`];
        
        // Render the updated visualization
        vis.renderVis();   
    }

    // Render the data points
    renderVis() {
        let vis = this;

        // Create and update points using data join pattern
        const circles = vis.chart.selectAll('.point')
            .data(vis.data)
            .join('circle')
                .attr('class', 'point')
                .attr('r', 2)
                .attr('cy', d => vis.yScale(vis.yValue(d)))
                .attr('cx', d => vis.xScale(vis.xValue(d)))
                .attr('fill', vis.pointColor);

        // Add interaction handlers for tooltips
        circles
            .on('mouseover', (event, d) => {
                d3.select('#scatterplot-tooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(vis.tooltipHelper.getScatterplotTooltipText(d, vis.selectedXAttribute, vis.selectedYAttribute));
            })
            .on('mouseleave', () => {
                d3.select('#scatterplot-tooltip').style('display', 'none');
            });
    }

    // Handle brush selection events
    brushed(selection) {
        let vis = this;

        if (selection) {
            // Extract selection coordinates
            const [[x0, y0], [x1, y1]] = selection;

            // Convert pixel coordinates to data values
            const xRange = [vis.xScale.invert(x0), vis.xScale.invert(x1)];
            const yRange = [vis.yScale.invert(y1), vis.yScale.invert(y0)]; // Reverse order because of y-axis orientation

            // Create selection range object with attribute information
            const selectionRange = {
                x: {
                    attribute: vis.selectedXAttribute,
                    range: xRange
                },
                y: {
                    attribute: vis.selectedYAttribute,
                    range: yRange
                }
            };

            // Filter data points within the selection
            const selectedPoints = vis.data.filter(d => {
                const x = vis.xValue(d);
                const y = vis.yValue(d);
                return x >= xRange[0] && x <= xRange[1] && y >= yRange[0] && y <= yRange[1];
            });

            // Highlight selected points
            vis.chart.selectAll('.point')
                .attr('fill', d => {
                    const x = vis.xValue(d);
                    const y = vis.yValue(d);
                    return (x >= xRange[0] && x <= xRange[1] && 
                            y >= yRange[0] && y <= yRange[1]) ? 
                            '#ff0000' : vis.pointColor;
                })

            // Call the callback function if defined
            if (typeof vis.onBrushSelection === 'function') {
                vis.onBrushSelection(selectionRange, selectionPoints);
            }

            // Store selected points and update other visualizations
            vis.selectedPoints = selectedPoints;
            updateChoroplethAndBarchart(vis.selectedPoints);
        } else {
            // Reset point colors when brush is cleared
            vis.chart.selectAll('.point')
                .attr('fill', vis.pointColor);

            // Reset selection in callback
            if (typeof vis.onBrushSelection === 'function') {
                vis.onBrushSelection(null, null);
            }

            // Clear selected points and update other visualizations
            vis.selectedPoints = null;
            updateChoroplethAndBarchart(vis.selectedPoints);
        }
    }

    // Method to set the brush selection callback
    setOnBrushSelection(callback) {
        this.onBrushSelection = callback;
    }   
}