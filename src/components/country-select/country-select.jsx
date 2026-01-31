import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import { filledInputClasses } from '@mui/material/FilledInput';

import { countries } from 'src/assets/data';

import { FlagIcon, iconifyClasses } from 'src/components/iconify';

import { getCountry, displayValueByCountryCode } from './utils';

// ----------------------------------------------------------------------

export function CountrySelect({
  id,
  label,
  error,
  multiple,
  helperText,
  hiddenLabel,
  placeholder,
  getValue = 'label',
  ...other
}) {
  const options = countries.map((country) => (getValue === 'label' ? country.label : country.code));

  const renderOption = (props, option) => {
    const country = getCountry(option);

    if (!country.label) {
      return null;
    }

    return (
      <li {...props} key={country.label}>
        <FlagIcon
          key={country.label}
          code={country.code}
          sx={{ mr: 1, width: 22, height: 22, borderRadius: '50%' }}
        />
        {country.label} ({country.code}) +{country.phone}
      </li>
    );
  };

  const renderInput = (params) => {
    const country = getCountry(params.inputProps.value);

    const baseField = {
      ...params,
      label,
      placeholder,
      helperText,
      hiddenLabel,
      error: !!error,
      inputProps: {
        ...params.inputProps,
        autoComplete: 'new-password',
      },
    };

    if (multiple) {
      return <TextField {...baseField} />;
    }

    return (
      <TextField
        {...baseField}
        InputProps={{
          ...params.InputProps,
          startAdornment: (
            <InputAdornment position="start" sx={{ ...(!country.code && { display: 'none' }) }}>
              <FlagIcon
                key={country.label}
                code={country.code}
                sx={{
                  ml: 0.5,
                  mr: -0.5,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          ...(!hiddenLabel && {
            [`& .${filledInputClasses.root}`]: {
              [`& .${iconifyClasses.root}`]: { mt: -2 },
            },
          }),
        }}
      />
    );
  };

  const renderTags = (selected, getTagProps) =>
    selected.map((option, index) => {
      const country = getCountry(option);

      return (
        <Chip
          {...getTagProps({ index })}
          key={country.label}
          label={country.label}
          size="small"
          variant="soft"
          icon={
            <FlagIcon
              key={country.label}
              code={country.code}
              sx={{ width: 16, height: 16, borderRadius: '50%' }}
            />
          }
        />
      );
    });

  const getOptionLabel = (option) =>
    getValue === 'label' ? option : displayValueByCountryCode(option);

  return (
    <Autocomplete
      id={`country-select-${id}`}
      multiple={multiple}
      options={options}
      autoHighlight={!multiple}
      disableCloseOnSelect={multiple}
      renderOption={renderOption}
      renderInput={renderInput}
      renderTags={multiple ? renderTags : undefined}
      getOptionLabel={getOptionLabel}
      {...other}
    />
  );
}
