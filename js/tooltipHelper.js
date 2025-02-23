class TooltipHelper {
    constructor() {}

    getScatterplotTooltipText(d, selectedXAttribute, selectedYAttribute) {
        let tooltipText = '';
        if (selectedXAttribute === 'Median Household Income (USD)' && selectedYAttribute === 'High Blood Pressure (%)') {
            tooltipText = `
                    <div class="tooltip-title">${d.County}, ${d.State}</div>
                    <div><i>Median Household Income: $${d.Value}</i></div>
                    <div><i>High Blood Pressure: ${d.percent_high_blood_pressure}%</i></div>
                    `
            // tooltipText = `Median Household Income: $${d.Value}<br>High Blood Pressure: ${d.percent_high_blood_pressure}%`;
        } else if (selectedXAttribute === 'Median Household Income (USD)' && selectedYAttribute === 'High Cholesterol (%)') {
            tooltipText = `
                    <div class="tooltip-title">${d.County}, ${d.State}</div>
                    <div><i>Median Household Income: $${d.Value}</i></div>
                    <div><i>High Cholesterol: ${d.percent_high_cholesterol}%</i></div>
                    `
            // tooltipText = `Median Household Income: $${d.Value}<br>High Cholesterol: ${d.percent_high_cholesterol}%`;
        } else if (selectedXAttribute === 'Poverty Rate (%)' && selectedYAttribute === 'High Blood Pressure (%)') {
            tooltipText = `
                    <div class="tooltip-title">${d.County}, ${d.State}</div>
                    <div><i>Poverty Rate: ${d.Value}%</i></div>
                    <div><i>High Blood Pressure: ${d.percent_high_blood_pressure}%</i></div>
                    `
            // tooltipText = `Poverty Rate: ${d.Value}%<br>High Blood Pressure: ${d.percent_high_blood_pressure}%`;
        } else if (selectedXAttribute === 'Poverty Rate (%)' && selectedYAttribute === 'High Cholesterol (%)') {
            tooltipText = `
                    <div class="tooltip-title">${d.County}, ${d.State}</div>
                    <div><i>Poverty Rate: ${d.Value}%</i></div>
                    <div><i>High Cholesterol: ${d.percent_high_cholesterol}%</i></div>
                    `
        }
        return tooltipText;
    }

    getChoroplethTooltipText(d, selectedAttribute) {
        if (selectedAttribute === 'median_household_income') {
            return d.properties.pop ? `<strong>$${d.properties.pop}</strong> median household income` : 'No data available'; 
        } else if (selectedAttribute === 'percent_high_blood_pressure') {
            return d.properties.pop ? `<strong>${d.properties.pop}%</strong> high blood pressure` : 'No data available';
        }
    }
}