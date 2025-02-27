class DataFormatter {
    constructor() {}

    mergeData(data1, data2) {
        return data1
            .filter(d => data2.find(e => e.FIPS === d.FIPS))
            .map(d => ({
                ...d,
                ...data2.find(e => e.FIPS === d.FIPS)
            }));
    }

}