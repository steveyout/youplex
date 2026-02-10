'use client';

import { paths } from '@/routes/paths';
import { varAlpha } from '@/theme/styles';
import { useRouter } from '@/routes/hooks';
import { Label } from '@/components/label';
import { searchMedia } from '@/actions/api';
import { Iconify } from '@/components/iconify';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';
import { useBoolean } from '@/hooks/use-boolean';
import { useDebounce } from '@/hooks/use-debounce';
import { Scrollbar } from '@/components/scrollbar';
import { useState, useEffect, useCallback } from 'react';
import { useEventListener } from '@/hooks/use-event-listener';
import { SearchNotFound } from '@/components/search-not-found';

import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog, { dialogClasses } from '@mui/material/Dialog';
import CircularProgress from '@mui/material/CircularProgress';

import Stack from "@mui/material/Stack";
import { ResultItem } from './result-item';

// ----------------------------------------------------------------------

export function Searchbar({ sx, ...other }) {
  const theme = useTheme();
  const router = useRouter();
  const search = useBoolean();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(searchQuery, 500);

  const handleClose = useCallback(() => {
    search.onFalse();
    setSearchQuery('');
    setSearchResults([]);
  }, [search]);

  // Fetch Live Data from TMDB
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await searchMedia(debouncedQuery);
        setSearchResults(data?.results || []);
      } catch (error) {
        console.error('Search Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  const handleKeyDown = (event) => {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      search.onToggle();
    }
  };

  useEventListener('keydown', handleKeyDown);

  const handleClickItem = useCallback(
    (item) => {
      const type = item.media_type || (item.first_air_date ? 'tv' : 'movie');
      const title = item.title || item.name;

      router.push(paths.watch.details(type, item.id, title));
      handleClose();
    },
    [handleClose, router]
  );

  const renderItems = () => (
    <Box component="ul">
      {searchResults.map((item) => {
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const year = releaseDate ? ` (${new Date(releaseDate).getFullYear()})` : '';

        return (
          <Box component="li" key={item.id} sx={{ display: 'flex' }}>
            <ResultItem
              title={parse(title, match(title, searchQuery))}
              // Show Media Type and Year as the "path" or secondary text
              path={parse(`${item.media_type || 'Media'} • ${year}`, [])}
              posterPath={item.poster_path}
              onClickItem={() => handleClickItem(item)}
            />
          </Box>
        );
      })}
    </Box>
  );

  const renderButton = (
    <Box
      display="flex"
      alignItems="center"
      onClick={search.onTrue}
      sx={{
        pr: { sm: 1 },
        pl: { xs: 1, sm: 0 },
        borderRadius: { sm: 1.5 },
        cursor: { sm: 'pointer' },
        bgcolor: { sm: varAlpha(theme.vars.palette.grey['500Channel'], 0.08) },
        ...sx,
      }}
      {...other}
    >
      <IconButton disableRipple>
        <Iconify icon="eva:search-fill" width={20} />
      </IconButton>

      <Label
        sx={{
          fontSize: 12,
          color: 'text.secondary',
          bgcolor: 'background.paper',
          border: `solid 1px ${theme.vars.palette.divider}`,
          display: { xs: 'none', sm: 'inline-flex' },
        }}
      >
        ⌘K
      </Label>
    </Box>
  );

  return (
    <>
      {renderButton}

      <Dialog
        fullWidth
        disableRestoreFocus
        maxWidth="sm"
        open={search.value}
        onClose={handleClose}
        transitionDuration={{
          enter: theme.transitions.duration.shortest,
          exit: 0,
        }}
        PaperProps={{ sx: { mt: 15, overflow: 'unset' } }}
        sx={{ [`& .${dialogClasses.container}`]: { alignItems: 'flex-start' } }}
      >
        <Box sx={{ p: 3, borderBottom: `solid 1px ${theme.vars.palette.divider}` }}>
          <InputBase
            fullWidth
            autoFocus
            placeholder="Search movies, series, actors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" width={24} sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            }
            endAdornment={
              <Stack direction="row" alignItems="center" spacing={1}>
                {loading && <CircularProgress size={18} color="inherit" />}
                <Label sx={{ letterSpacing: 1, color: 'text.secondary' }}>esc</Label>
              </Stack>
            }
            inputProps={{ sx: { typography: 'h6' } }}
          />
        </Box>

        {searchQuery && !loading && !searchResults.length ? (
          <SearchNotFound query={searchQuery} sx={{ py: 15 }} />
        ) : (
          <Scrollbar sx={{ px: 3, pb: 3, pt: 2, height: 400 }}>
            {renderItems()}
          </Scrollbar>
        )}
      </Dialog>
    </>
  );
}
