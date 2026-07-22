const series = [
  { region: 'north', channel: 'online', business: 'consumer', metric: 'revenue', values: [52, 61, 66, 74] },
  { region: 'north', channel: 'store', business: 'consumer', metric: 'revenue', values: [44, 49, 53, 59] },
  { region: 'south', channel: 'online', business: 'consumer', metric: 'revenue', values: [38, 46, 57, 64] },
  { region: 'south', channel: 'store', business: 'consumer', metric: 'revenue', values: [31, 36, 42, 48] },
  { region: 'north', channel: 'online', business: 'consumer', metric: 'profit', values: [22, 28, 31, 35] },
  { region: 'north', channel: 'store', business: 'consumer', metric: 'profit', values: [18, 21, 23, 27] },
  { region: 'south', channel: 'online', business: 'consumer', metric: 'profit', values: [14, 18, 24, 29] },
  { region: 'south', channel: 'store', business: 'consumer', metric: 'profit', values: [11, 13, 17, 21] },
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
