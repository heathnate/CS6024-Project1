class DataFormatter {
    constructor() {}

    async getMedianIncomeData2() {
        let data = await this.getMedianIncomeData();
        return data;
    }
    getMedianIncomeData() {
        return d3.csv('data/Rural_Atlas_Update24/Income.csv').then(incomeData => {
            let medianIncomeData = incomeData.filter(d => d.Attribute === 'MedHHInc');

            // Remove the USA data which is stored under a FIPS of 0
            medianIncomeData = medianIncomeData.filter(d => d.FIPS !== '0');
            // Convert median household income to integer
            medianIncomeData.forEach(d => d.Value = +d.Value);

            return medianIncomeData;
        })
    }

    getPovertyData() {
        return d3.csv('data/Rural_Atlas_Update24/Income.csv').then(incomeData => {
            let povertyData = incomeData.filter(d => d.Attribute === 'PCTPOVALL');

            // Remove the USA data which is stored under a FIPS of 0
            povertyData = povertyData.filter(d => d.FIPS !== '0');
            // Convert poverty percentage to integer
            povertyData.forEach(d => d.Value = +d.Value);
            console.log(povertyData);
            return povertyData;
        })
    }

    getHighBloodPressureData() {
        return d3.csv('data/national_health_data_2024.csv').then(healthData => {
            // Condense data to just include FIPS and high blood pressure percentage (converted to integer)
            let highBloodPressureData = healthData
                .filter(d => d.percent_high_blood_pressure)
                .map(d => ({
                    FIPS: d.cnty_fips,
                    Value: +d.percent_high_blood_pressure
                }));

        
            
            return highBloodPressureData;
        })
    }

    mergeData(data1, data2) {
        return data1
            .filter(d => data2.find(e => e.FIPS === d.FIPS))
            .map(d => ({
                ...d,
                ...data2.find(e => e.FIPS === d.FIPS)
            }));
    }

    
    

    
}