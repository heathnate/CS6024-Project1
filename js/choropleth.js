class Choropleth {
  // Constructor initializes the choropleth map with configuration and data
  constructor(_config, _data) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1000,
      containerHeight: _config.containerHeight || 500,
      margin: _config.margin || {top: 10, right: 10, bottom: 10, left: 10},
      tooltipPadding: _config.tooltipPadding || 10,
      legendBottom: 100,
      legendLeft: 440,
      legendRectHeight: 12, 
      legendRectWidth: 150
    }
    this.data = _data;

    this.us = _data; // Store US topojson data

    this.fullData = _data; // Keep a reference to the full dataset

    this.active = d3.select(null); // Track active selection (none initially)
    
    this.chart; // Will hold the chart group element

    this.selectedAttribute = 'median_household_income'; // Default attribute to display

    this.tooltipHelper = new TooltipHelper(); // Helper for tooltip content

    this.initVis(); // Initialize the visualization
  }
  
  // Set up the initial visualization structure
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
      .attr('class', 'center-container')
      .attr('width', vis.config.containerWidth)
      .attr('height', vis.config.containerHeight);

    // Add background rectangle
    vis.svg.append('rect')
      .attr('class', 'background center-container')
      .attr('height', vis.config.containerHeight ) //height + margin.top + margin.bottom)
      .attr('width', vis.config.containerWidth); //width + margin.left + margin.right)

    // Create projection for map (Albers USA is optimized for US maps)
    vis.projection = d3.geoAlbersUsa()
      .translate([vis.width /2 - 100 , vis.height / 2])
      .scale(vis.width);
    
    // Initialize color scale as blue (for default of median household income)
    vis.colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain(d3.extent(vis.data.objects.counties.geometries, d => d.properties.pop));

    // Initialize gradient for legend
    vis.linearGradient = vis.svg.append('defs').append('linearGradient')
      .attr("id", "legend-gradient");

    // Append legend group
    vis.legend = vis.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

    // Add rectangle for the color gradient legend
    vis.legendRect = vis.legend.append('rect')
      .attr('width', vis.config.legendRectWidth)
      .attr('height', vis.config.legendRectHeight);

    // Add title for the legend
    vis.legendTitle = vis.legend.append('text')
      .attr('class', 'legend-title')
      .attr('dy', '.35em')
      .attr('y', -10)
      .text('Median household income (USD)');

    // Get the extent of population values for the legend
    const popExtent = d3.extent(vis.data.objects.counties.geometries, d => d.properties.pop);

    // Define stops for the color gradient
    vis.legendStops = [
      { color: '#cfe2f2', value: popExtent[0], offset: 0},
      { color: '#0d306b', value: popExtent[1], offset: 100},
    ];

    // Create the path generator using the projection
    vis.path = d3.geoPath()
      .projection(vis.projection);

    // Append main group element for the map
    vis.g = vis.svg.append("g")
      .attr('class', 'center-container center-items us-state')
      .attr('transform', 'translate('+vis.config.margin.left+','+vis.config.margin.top+')')
      .attr('width', vis.containerWidth)
      .attr('height', vis.containerHeight);

    // Add a group for the chart elements
    vis.chart = vis.g.append("g");

    // Augment counties with state names
    const stateByFIPS = {};
    // Create lookup object to map state FIPS codes to state names
    topojson.feature(vis.us, vis.us.objects.states).features.forEach(state => {
        stateByFIPS[state.id] = state.properties.name;  // Assuming states dataset has 'name' property
    });
    // Add state names to each county's properties
    vis.data.objects.counties.geometries.forEach(county => {
        county.properties.state = stateByFIPS[county.id.substring(0, 2)];  // Extract state FIPS from county FIPS
    });

    // Call update to render the initial visualization
    this.updateVis();
  }

  // Update visualization when data or attributes change
  updateVis() {
    let vis = this;

    // Clear all existing elements
    vis.g.selectAll('*').remove();

    // Get the full data extent for the selected attribute
    const fullExtent = d3.extent(vis.fullData.objects.counties.geometries, d => d.properties.pop);

    // Update color scale and legend based on selected attribute
    if (vis.selectedAttribute === 'median_household_income') {
      // Blue color scheme for income
      vis.colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(fullExtent);
      const blueScale = d3.scaleSequential(d3.interpolateBlues).domain([0, 100]);
      vis.legendStops = [
          { color: blueScale(0), value: fullExtent[0], offset: 0},
          { color: blueScale(100), value: fullExtent[1], offset: 100}
      ];
      vis.legendTitle.text('Median household income (USD)')
    } else if (vis.selectedAttribute === 'percent_high_blood_pressure') {
      // Red color scheme for blood pressure
      vis.colorScale = d3.scaleSequential(d3.interpolateReds)
        .domain(fullExtent);
      const redScale = d3.scaleSequential(d3.interpolateReds).domain([0, 100]);
      vis.legendStops = [
          { color: redScale(0), value: fullExtent[0], offset: 0},
          { color: redScale(100), value: fullExtent[1], offset: 100}
      ];
      vis.legendTitle.text('High blood pressure percentage (%)');
    }
    
    // Render the updated visualization
    this.renderVis();
  }

  // Render the map and legend
  renderVis() {
    let vis = this;
    
    // Draw counties
    vis.counties = vis.g.append("g")
      .attr("id", "counties")
      .selectAll("path")
      .data(topojson.feature(vis.data, vis.data.objects.counties).features)
      .enter().append("path")
      .attr("d", vis.path)
      // .attr("class", "county-boundary")
      .attr('fill', d => {
        const countyId = d.id;
        if (d.properties.pop) {
          // Check if the county exists in our dataset
          let showCounty = vis.us.objects.counties.geometries.some(g => g.id == countyId);
          if (showCounty) {
            return vis.colorScale(d.properties.pop);
          } else {
            return '#a9a9a9'; // Gray for counties without data
          }
        } else {
          return 'url(#lightstripe)'; // Pattern fill for counties without population data
        }
      })
      .attr('stroke', '#333')
      .attr('stroke-width', 0.2);
    
    // Add tooltip event listeners to counties
    vis.counties
      .on('mousemove', (event, d) => {
        const countyName = d.properties.name || 'Unknown County';
        const stateName = d.properties.state || 'Unknown State';
        const pop = vis.tooltipHelper.getChoroplethTooltipText(d, vis.selectedAttribute);
        d3.select('#choropleth-tooltip')
          .style('display', 'block')
          .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
          .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
          .html(`
            <div class="tooltip-title">${countyName}, ${stateName}</div>
            <div>${pop}</div>
          `);
      })
      .on('mouseleave', () => {
        d3.select('#choropleth-tooltip').style('display', 'none');
      });

    // Update legend labels
    vis.legend.selectAll('.legend-label')
      .data(vis.legendStops)
      .join('text')
      .attr('class', 'legend-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('y', 20)
      .attr('x', (d,index) => {
        return index == 0 ? 0 : vis.config.legendRectWidth;
      })
      .text(d => Math.round(d.value * 10 ) / 10);

    // Update gradient stops for legend
    vis.linearGradient.selectAll('stop')
      .data(vis.legendStops)
      .join('stop')
      .attr('offset', d => d.offset)
      .attr('stop-color', d => d.color);

    // Apply gradient to legend rectangle
    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}