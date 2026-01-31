import dynamic from 'next/dynamic';

import Box from '@mui/material/Box';

import { withLoadingProps } from 'src/utils/with-loading-props';

import { ChartLoading } from './chart-loading';

const ApexChart = withLoadingProps((props) =>
  dynamic(() => import('react-apexcharts').then((mod) => mod.default), {
    ssr: false,
    loading: () => {
      const { loading, type } = props();

      return loading?.disabled ? null : <ChartLoading type={type} sx={loading?.sx} />;
    },
  })
);

// ----------------------------------------------------------------------

export function Chart({
  sx,
  type,
  series,
  height,
  options,
  loadingProps,
  width = '100%',
  ...other
}) {
  return (
    <Box
      dir="ltr"
      sx={{
        width,
        height,
        flexShrink: 0,
        borderRadius: 1.5,
        position: 'relative',
        ...sx,
      }}
      {...other}
    >
      <ApexChart
        type={type}
        series={series}
        options={options}
        width="100%"
        height="100%"
        loading={loadingProps}
      />
    </Box>
  );
}
