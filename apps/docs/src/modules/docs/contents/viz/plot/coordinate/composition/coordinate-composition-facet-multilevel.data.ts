const series = [
  { region: 'R1', channel: 'C1', business: 'B1', metric: 'M1', values: [52, 61, 66, 74] },
  { region: 'R1', channel: 'C2', business: 'B1', metric: 'M1', values: [44, 49, 53, 59] },
  { region: 'R2', channel: 'C1', business: 'B1', metric: 'M1', values: [38, 46, 57, 64] },
  { region: 'R2', channel: 'C2', business: 'B1', metric: 'M1', values: [31, 36, 42, 48] },
  { region: 'R1', channel: 'C1', business: 'B1', metric: 'M2', values: [22, 28, 31, 35] },
  { region: 'R1', channel: 'C2', business: 'B1', metric: 'M2', values: [18, 21, 23, 27] },
  { region: 'R2', channel: 'C1', business: 'B1', metric: 'M2', values: [14, 18, 24, 29] },
  { region: 'R2', channel: 'C2', business: 'B1', metric: 'M2', values: [11, 13, 17, 21] },
  { region: 'R1', channel: 'C1', business: 'B2', metric: 'M1', values: [68, 72, 79, 86] },
  { region: 'R1', channel: 'C2', business: 'B2', metric: 'M1', values: [57, 63, 69, 76] },
  { region: 'R2', channel: 'C1', business: 'B2', metric: 'M1', values: [49, 55, 62, 70] },
  { region: 'R2', channel: 'C2', business: 'B2', metric: 'M1', values: [41, 46, 51, 58] },
  { region: 'R1', channel: 'C1', business: 'B2', metric: 'M2', values: [34, 39, 45, 52] },
  { region: 'R1', channel: 'C2', business: 'B2', metric: 'M2', values: [28, 32, 37, 43] },
  { region: 'R2', channel: 'C1', business: 'B2', metric: 'M2', values: [23, 27, 32, 38] },
  { region: 'R2', channel: 'C2', business: 'B2', metric: 'M2', values: [17, 21, 25, 30] },
];

export const channelRows: Array<Record<string, string | number>> = series.flatMap(item =>
  item.values.map((value, index) => ({
    region: item.region,
    channel: item.channel,
    business: item.business,
    metric: item.metric,
    month: index + 1,
    value,
  })),
);
