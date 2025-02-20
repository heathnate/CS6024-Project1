class Choropleth {
    constructor(_config, _data) {
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 1000,
        containerHeight: _config.containerHeight || 500,
        margin: _config.margin || {top: 10, right: 10, bottom: 10, left: 10},
        tooltipPadding: _config.tooltipPadding || 10,
        legendBottom: 100,
        legendLeft: 550,
        legendRectHeight: 12, 
        legendRectWidth: 150
      }
      this.data = _data;
  
      this.us = _data;
  
      this.active = d3.select(null);
      
      this.chart;

      this.selectedAttribute = 'median_household_income';
  
      this.initVis();
    }
    
    initVis() {
      let vis = this;
      console.log("Init Vis");
  
      // Calculate inner chart size. Margin specifies the space around the actual chart.
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      // Define size of SVG drawing area
      vis.svg = d3.select(vis.config.parentElement).append('svg')
        .attr('class', 'center-container')
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);
  
      vis.svg.append('rect')
        .attr('class', 'background center-container')
        .attr('height', vis.config.containerHeight ) //height + margin.top + margin.bottom)
        .attr('width', vis.config.containerWidth); //width + margin.left + margin.right)
  
      // Create projection for map
      vis.projection = d3.geoAlbersUsa()
        .translate([vis.width /2 - 100 , vis.height / 2])
        .scale(vis.width);
      
      // Initialize color scale as blue (for default of median household income)
      vis.colorScale = d3.scaleSequential(d3.interpolateBlues)
        .domain(d3.extent(vis.data.objects.counties.geometries, d => d.properties.pop));

      // Initialize gradient for legend
      vis.linearGradient = vis.svg.append('defs').append('linearGradient')
        .attr("id", "legend-gradient");

      // Append legend
      vis.legend = vis.svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);

      vis.legendRect = vis.legend.append('rect')
        .attr('width', vis.config.legendRectWidth)
        .attr('height', vis.config.legendRectHeight);

      vis.legendTitle = vis.legend.append('text')
        .attr('class', 'legend-title')
        .attr('dy', '.35em')
        .attr('y', -10)
        .text('Median household income (USD)');

      const popExtent = d3.extent(vis.data.objects.counties.geometries, d => d.properties.pop);

      vis.legendStops = [
        { color: '#cfe2f2', value: popExtent[0], offset: 0},
        { color: '#0d306b', value: popExtent[1], offset: 100},
      ];
  
      vis.path = d3.geoPath()
        .projection(vis.projection);
  
      vis.g = vis.svg.append("g")
        .attr('class', 'center-container center-items us-state')
        .attr('transform', 'translate('+vis.config.margin.left+','+vis.config.margin.top+')')
        .attr('width', vis.containerWidth)
        .attr('height', vis.containerHeight);

      vis.chart = vis.g.append("g");

      // Augment counties with state names
      const stateByFIPS = {};
      topojson.feature(vis.us, vis.us.objects.states).features.forEach(state => {
          stateByFIPS[state.id] = state.properties.name;  // Assuming states dataset has 'name' property
      });
  
      // Augment counties with state names
      vis.data.objects.counties.geometries.forEach(county => {
          county.properties.state = stateByFIPS[county.id.substring(0, 2)];  // Extract state FIPS from county FIPS
      });

      this.updateVis();
    }

    updateVis() {
      let vis = this;

      vis.g.selectAll('*').remove();

      console.log('Update Vis');

      console.log('Extent: ', vis.legendStops[0].value, vis.legendStops[1].value);
      
      this.renderVis();
    }

    renderVis() {
      let vis = this;
      console.log('Render Vis');

      vis.counties = vis.g.append("g")
        .attr("id", "counties")
        .selectAll("path")
        .data(topojson.feature(vis.us, vis.us.objects.counties).features)
        .enter().append("path")
        .attr("d", vis.path)
        // .attr("class", "county-boundary")
        .attr('fill', d => {
          if (d.properties.pop) {
            return vis.colorScale(d.properties.pop);
          } else {
            return 'url(#lightstripe)';
          }
        })
        .attr('stroke', '#333')
        .attr('stroke-width', 0.2);
      
      // Tooltip event listeners
      if (vis.selectedAttribute === 'median_household_income') {
        vis.counties
          .on('mousemove', (event, d) => {
            const countyName = d.properties.name || 'Unknown County';
            const stateName = d.properties.state || 'Unknown State';
            const pop = d.properties.pop ? `<strong>$${d.properties.pop}</strong> median household income` : 'No data available'; 
            d3.select('#choroplethTooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">${countyName}, ${stateName}</div>
                <div>${pop}</div>
              `);
          })
          .on('mouseleave', () => {
            d3.select('#choroplethTooltip').style('display', 'none');
          });
      }
      else if (vis.selectedAttribute === 'percent_high_blood_pressure') {
        vis.counties
          .on('mousemove', (event, d) => {
            const countyName = d.properties.name || 'Unknown County';
            const stateName = d.properties.state || 'Unknown State';
            const pop = d.properties.pop ? `<strong>${d.properties.pop}%</strong> high blood pressure` : 'No data available'; 
            d3.select('#choroplethTooltip')
              .style('display', 'block')
              .style('left', (event.pageX + vis.config.tooltipPadding) + 'px')   
              .style('top', (event.pageY + vis.config.tooltipPadding) + 'px')
              .html(`
                <div class="tooltip-title">${countyName}, ${stateName}</div>
                <div>${pop}</div>
              `);
          })
          .on('mouseleave', () => {
            d3.select('#choroplethTooltip').style('display', 'none');
          });
      }


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

      // Update gradient for legend
      vis.linearGradient.selectAll('stop')
        .data(vis.legendStops)
        .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

      vis.legendRect.attr('fill', 'url(#legend-gradient)');
    }
}