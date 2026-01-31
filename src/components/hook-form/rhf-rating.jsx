import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import FormHelperText from '@mui/material/FormHelperText';

// ----------------------------------------------------------------------

export function RHFRating({ name, helperText, slotProps, ...other }) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Box sx={slotProps?.wrap}>
          <Rating
            {...field}
            onChange={(event, newValue) => {
              field.onChange(Number(newValue));
            }}
            {...other}
          />

          {(error?.message || helperText) && (
            <FormHelperText error={!!error} {...slotProps?.formHelperText}>
              {error?.message ?? helperText}
            </FormHelperText>
          )}
        </Box>
      )}
    />
  );
}
