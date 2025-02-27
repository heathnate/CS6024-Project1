class BarChart {
    constructor(_config, _data) {
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 600,
            containerHeight: _config.containerHeight || 400,
            tooltipPadding: _config.tooltipPadding || 15,
            margin: {top: 50, right: 50, bottom: 50, left: 70}, // Increased left margin
        }
        this.data = _data;

        this.valueAccessor = d => d.Value;

        this.bin;
        this.bins;

        this.color = 'steelblue';

        this.xTickInterval = 10000;

        this.selectedAttribute = 'median_household_income';

        this.svg;

        this.initVis();
    }

    initVis() {
        let vis = this;

        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight)
            .append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        vis.bin = d3.bin()
            .domain([0, d3.max(vis.data, vis.valueAccessor)])
            .value(vis.valueAccessor)
            .thresholds(10);
        vis.bins = vis.bin(vis.data);

        // Calculate the maximum value and round up to the nearest tick interval for x-axis
        const xMax = d3.max(vis.bins, d => d.x1);
        const xMaxRounded = Math.ceil(xMax / vis.xTickInterval) * vis.xTickInterval;

        vis.xScale = d3.scaleLinear()
            .domain([0, xMaxRounded])
            .range([0, vis.width]);

        // Calculate the maximum value and round up to the nearest tick interval for y-axis
        const yMax = d3.max(vis.bins, d => d.length);
        const yTickInterval = 200; // Adjust this value based on your desired tick interval
        const yMaxRounded = Math.ceil(yMax / yTickInterval) * yTickInterval;

        vis.yScale = d3.scaleLinear()
            .domain([0, yMaxRounded])
            .nice()
            .range([vis.height, 0]);

        // Initialize axes
        vis.xAxis = d3.axisBottom(vis.xScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(10)
            .tickSize(10)
            .tickPadding(10);

        vis.xAxisLabel = 'Median Household Income (USD)';
        vis.yAxisLabel = 'Number of Counties';

        // Append y-axis title (it is not being changed so it can be appended here)
        vis.yAxisTitle = vis.svg.append('text')
            .attr('class', 'y-axis-title')
            .attr('x', -50)
            .attr('y', -30)
            .attr('dy', '1em')
            .text(vis.yAxisLabel);

        // Append initial x-axis title
        vis.xAxisTitle = vis.svg.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom - 20)
            .attr('x', vis.width / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text(vis.xAxisLabel);

        // Append axes
        vis.xAxisG = vis.svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`)
            .call(vis.xAxis);
        vis.yAxisG = vis.svg.append('g')
            .attr('class', 'axis y-axis')
            .call(vis.yAxis);

        vis.updateVis();
    }

    updateVis() {
        let vis = this;

        // Update x-axis title
        vis.xAxisTitle.text(vis.xAxisLabel);

        // Update axes and scales based on new data
        // Clear current bars
        vis.svg.selectAll('.bars').remove();
        if (vis.updateScales == true) {
            vis.bin = d3.bin()
            .domain([0, d3.max(vis.data, vis.valueAccessor)])
            .value(vis.valueAccessor)
            .thresholds(10);

            // Calculate the maximum value and round up to the nearest tick interval for x-axis
            const xMax = d3.max(vis.bins, d => d.x1);
            const xMaxRounded = Math.ceil(xMax / vis.xTickInterval) * vis.xTickInterval;

            vis.xScale.domain([0, xMaxRounded]);
        } else {
            vis.updateScales = true;
        }

        vis.bins = vis.bin(vis.data);

        // Calculate the maximum value and round up to the nearest tick interval for y-axis
        const yMax = d3.max(vis.bins, d => d.length);
        const yTickInterval = yMax > 0 ? Math.max(100, Math.round(yMax / 800) * 100) : 100; 
        const yMaxRounded = Math.ceil(yMax / yTickInterval) * yTickInterval;

        vis.yScale.domain([0, yMaxRounded]).nice();

        vis.xAxisG.call(vis.xAxis);
        vis.yAxisG.call(vis.yAxis);

        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        const bars = vis.svg.append('g')
            .attr('fill', vis.color)
            .attr('class', 'bars')
            .selectAll('rect')
            .data(vis.bins)
            .join('rect')
                .attr('x', d => vis.xScale(d.x0))
                .attr('y', d => vis.yScale(d.length))
                .attr('width', d => vis.xScale(d.x1) - vis.xScale(d.x0))
                .attr('height', d => vis.height - vis.yScale(d.length));

        bars.on('mouseover', function(event, d) {
            d3.select('#barchartTooltip')
                .style('display', 'block')
                .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
                .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
                .html(`
                    <div class="tooltip-title">Total Counties: ${d.length}</div>
                    `);
        })
        .on('mouseleave', () => {
            d3.select('#barchartTooltip').style('display', 'none');
        });

        bars.on('click', function(event, d) {
            const sampleVal = vis.valueAccessor(d[0]);
            let selectedBin = vis.bins.filter(b => b.x0 <= sampleVal && b.x1 >= sampleVal);
            selectedBin = [selectedBin[0].x0, selectedBin[0].x1];
            let selectedLowerBound = selectedBin[0];

            let isActive = false;
            binFilter.forEach(b => {
                if (b[0] === selectedLowerBound) {
                    isActive = true;
                }
            });

            if (isActive) {
                binFilter = binFilter.filter(f => f[0] !== selectedLowerBound);
            } else {
                binFilter.push(selectedBin);
            }
            d3.select(this).classed('active', !isActive);
            filterDataFromBarchart();
        });
    }
}