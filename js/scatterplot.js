class Scatterplot {
    constructor(_config, _xData, _yData) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1000,
            containerHeight: _config.containerHeight || 800,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 50, bottom: 50, left: 50},
        }
        this.data;

        this.selectedXAttribute = 'Median Household Income (USD)';
        this.selectedYAttribute = 'High Blood Pressure (%)';

        this.xData = _xData;
        this.yData = _yData;

        this.resetXScale = false;
        this.resetYScale = false;

        this.tooltipHelper = new TooltipHelper();

        this.dataFormatter = new DataFormatter();
        
        // Color map that determines the color of the points based on the selected attributes
        this.colorMap = {
            "Median Household Income (USD)-High Blood Pressure (%)": "#a000c8",
            "Median Household Income (USD)-High Cholesterol (%)": "#00a300",
            "Poverty Rate (%)-High Blood Pressure (%)": "#fa6122",
            "Poverty Rate (%)-High Cholesterol (%)": "#fcb001"
        };

        this.initVis();
    }

    initVis() {
        // Setting up the scatterplot
        let vis = this;

        vis.data = vis.dataFormatter.mergeData(vis.xData, vis.yData);

        // Width and height as the inner dimensions of the chart area
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Define 'svg' as a child-element (g) from the drawing area and include spaces
        // Add <svg> element (drawing space)
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

        // Specify accessor function
        vis.xValue = d => d.Value;
        vis.yValue = d => d.percent_high_blood_pressure;

        // Create x and y scales
        vis.xScale = d3.scaleLinear()
            .domain([0, d3.max(vis.xData, vis.xValue)])
            .range([0, vis.width])
            .nice();
        vis.yScale = d3.scaleLinear()
            .domain([0, d3.max(vis.data, vis.yValue)])
            .range([vis.height, 0])
            .nice();
       
        vis.initialXDomain = vis.xScale.domain();
        vis.initialYDomain = vis.yScale.domain();

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10)
        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10)

        // Append axes
        vis.xAxisG = vis.chart.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`);
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'axis y-axis');
        
        // Append both axis titles
        vis.chart.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height - 15)
            .attr('x', vis.width + 10)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text(vis.selectedXAttribute);

        vis.svg.append('text')
            .attr('class', 'y-axis-title')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '.71em')
            .text(vis.selectedYAttribute);
    
        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Clear scatterplot points
        vis.chart.selectAll('.point').remove();
        
        // Update data
        vis.data = vis.dataFormatter.mergeData(vis.xData, vis.yData);

        // Update scales only if triggered through scatterplot dropdowns (AKA do not update scales if triggered via brushing)
        // OR if the attribute brushed upon by another vis is not already selected
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
            vis.xScale.domain([0, d3.max(vis.xData, vis.xValue)]).nice();
            vis.yScale.domain([0, d3.max(vis.yData, vis.yValue)]).nice();
        }

        // Update axes
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        // Select existing axis labels and update them based on the selected attribute
        vis.svg.select('.x-axis-title')
            .text(vis.selectedXAttribute);

        vis.svg.select('.y-axis-title')
            .text(vis.selectedYAttribute);

        // Update point color
        vis.pointColor = vis.colorMap[`${vis.selectedXAttribute}-${vis.selectedYAttribute}`];
        
        vis.renderVis();   
    }

    renderVis() {
        let vis = this;

        const circles = vis.chart.selectAll('.point')
            .data(vis.data)
            .join('circle')
                .attr('class', 'point')
                .attr('r', 2)
                .attr('cy', d => vis.yScale(vis.yValue(d)))
                .attr('cx', d => vis.xScale(vis.xValue(d)))
                .attr('fill', vis.pointColor);

        circles
            .on('mouseover', (event, d) => {
                d3.select('#scatterplotTooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(vis.tooltipHelper.getScatterplotTooltipText(d, vis.selectedXAttribute, vis.selectedYAttribute));
            })
            .on('mouseleave', () => {
                d3.select('#scatterplotTooltip').style('display', 'none');
            });

    }
    
}