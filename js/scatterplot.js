class Scatterplot {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 1000,
            containerHeight: _config.containerHeight || 800,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 50, bottom: 50, left: 50},
        }
        this.data = _data;
        this.initVis();
    }

    initVis() {
        // Setting up the scatterplot
        console.log('Scatterplot!');

        let vis = this;

        // Width and height as the inner dimensions of the chart area
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        console.log("width: ", vis.width);
        console.log("height: ", vis.height);

        // Define 'svg' as a child-element (g) from the drawing area and include spaces
        // Add <svg> element (drawing space)
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)

        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);

        // Create x and y scales
        vis.xScale = d3.scaleLinear()
            .domain([0, d3.max(vis.data, d => d.Value)])
            .range([0, vis.width])
            .nice();
        vis.yScale = d3.scaleLinear()
            .domain([0, d3.max(vis.data, d => d.percent_high_blood_pressure)])
            .range([vis.height, 0])
            .nice();

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

        this.updateVis();
    }

    updateVis() {
        let vis = this;
    
        // Specify accessor function
        vis.xValue = d => d.Value;
        vis.yValue = d => d.percent_high_blood_pressure;
        
        // Update axes
        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        this.renderVis();
        
    }

    renderVis() {
        let vis = this;

        const circles = vis.chart.selectAll('.point')
            .data(vis.data)
            .join('circle')
                .attr('r', 2)
                .attr('cy', d => vis.yScale(vis.yValue(d)))
                .attr('cx', d => vis.xScale(vis.xValue(d)))
                .attr('fill', '#69b3a2');

        circles
            .on('mouseover', (event, d) => {
                d3.select('#scatterplotTooltip')
                    .style('display', 'block')
                    .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                    .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                    .html(`
                    <div class="tooltip-title">${d.County}, ${d.State}</div>
                    <div><i>$${d.median_household_income}</i></div>
                    <div><i>${d.percent_high_blood_pressure}%</i></div>
                    `);
                // console.log(d);
            })
            .on('mouseleave', () => {
                d3.select('#scatterplotTooltip').style('display', 'none');
            });

    }
    
}