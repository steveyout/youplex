import { useTheme } from '@mui/material/styles';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function ChartArea({ chart }) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.main, theme.palette.warning.main];

  const chartOptions = useChart({
    colors: chartColors,
    legend: { show: true },
    xaxis: {
      type: 'datetime',
      categories: chart.categories,
    },
    tooltip: { x: { format: 'dd/MM/yy HH:mm' } },
  });

  return <Chart type="area" series={chart.series} options={chartOptions} height={320} />;
}
