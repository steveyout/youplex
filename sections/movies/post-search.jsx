import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import Autocomplete, { autocompleteClasses } from '@mui/material/Autocomplete';

import { useRouter } from '@/routes/hooks';
import { Iconify } from '@/components/iconify';
import { SearchNotFound } from '@/components/search-not-found';
import Box from "@mui/material/Box";

// ----------------------------------------------------------------------

export function PostSearch({ query, results, onSearch, hrefItem, loading }) {
  const router = useRouter();

  // Unified navigation function
  const onNavigate = (item) => {
    if (item) {
      router.push(hrefItem(item));
    }
  };

  const handleKeyUp = (event) => {
    if (query && event.key === 'Enter' && results.length > 0) {
      onNavigate(results[0]);
    }
  };

  return (
    <Autocomplete
      sx={{ width: { xs: 1, sm: 260 } }}
      loading={loading}
      autoHighlight
      popupIcon={null}
      options={results}
      // This is the clean way to handle clicks/selection
      onChange={(event, newValue) => onNavigate(newValue)}
      onInputChange={(event, newValue) => onSearch(newValue)}
      getOptionLabel={(option) => option.title || option.name || ''}
      noOptionsText={<SearchNotFound query={query} />}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      slotProps={{
        popper: { placement: 'bottom-start', sx: { minWidth: 320 } },
        paper: { sx: { [` .${autocompleteClasses.option}`]: { pl: 0.75 } } },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Search movies & series..."
          onKeyUp={handleKeyUp}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ ml: 1, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <Iconify icon="svg-spinners:8-dots-rotate" sx={{ mr: -3 }} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, item, { inputValue }) => {
        const displayTitle = item.title || item.name || '';
        const matches = match(displayTitle, inputValue);
        const parts = parse(displayTitle, matches);

        const posterUrl = item.poster_path
          ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
          : '';

        const year = new Date(item.release_date || item.first_air_date).getFullYear();

        return (
          <li {...props} key={item.id}>
            <Avatar
              alt={displayTitle}
              src={posterUrl}
              variant="rounded"
              sx={{
                width: 40,
                height: 56,
                flexShrink: 0,
                mr: 1.5,
                borderRadius: 0.5,
                bgcolor: 'background.neutral',
              }}
            >
              <Iconify icon="solar:videocamera-record-bold" sx={{ color: 'text.disabled' }} />
            </Avatar>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <Typography
                component="span"
                variant="body2"
                noWrap
                sx={{ fontWeight: 'fontWeightMedium' }}
              >
                {parts.map((part, index) => (
                  <Box
                    key={index}
                    component="span"
                    sx={{
                      color: part.highlight ? 'primary.main' : 'text.primary',
                      fontWeight: part.highlight ? 'fontWeightSemiBold' : 'fontWeightMedium',
                    }}
                  >
                    {part.text}
                  </Box>
                ))}
              </Typography>

              <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'capitalize' }}>
                {item.media_type || (item.first_air_date ? 'tv' : 'movie')} • {year || 'N/A'}
              </Typography>
            </div>
          </li>
        );
      }}
    />
  );
}
