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

        vis.xScale = d3.scaleBand()
            .domain(vis.bins.map(d => d.x0))
            .range([0, vis.width])
            .padding(0.1);

        vis.yScale = d3.scaleLinear()
            .domain([0, d3.max(vis.bins, d => d.length)])
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

        // Append axes
        vis.xAxisG = vis.svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', `translate(0,${vis.height})`)
            .call(vis.xAxis);
        vis.yAxisG = vis.svg.append('g')
            .attr('class', 'axis y-axis')
            .call(vis.yAxis);
        
        // Append both axis titles
        vis.svg.append('text')
            .attr('class', 'x-axis-title')
            .attr('y', vis.height + vis.config.margin.bottom - 15)
            .attr('x', vis.width / 2)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('X Axis Title');

        vis.svg.append('text')
            .attr('class', 'y-axis-title')
            .attr('transform', 'rotate(-90)')
            .attr('x', -vis.height / 2)
            .attr('y', -vis.config.margin.left + 10)
            .attr('dy', '1em')
            .style('text-anchor', 'middle')
            .text('Y Axis Title');

        vis.updateVis();
    }

    updateVis() {
        let vis = this;
        
        vis.renderVis();
    }

    renderVis() {
        let vis = this;

        const bars = vis.svg.append('g')
            .attr('fill', 'steelblue')
            .selectAll('rect')
            .data(vis.bins)
            .join('rect')
                .attr('x', d => vis.xScale(d.x0))
                .attr('y', d => vis.yScale(d.length))
                .attr('width', vis.xScale.bandwidth())
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
        
    }
}