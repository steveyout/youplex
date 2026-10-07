'use client';

import { useState, useMemo } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from '@/routes/paths';
import { toast } from '@/components/snackbar';
import { Iconify } from '@/components/iconify';
import { RouterLink } from '@/routes/components';
import { PostItem } from '@/sections/movies/post-item';
import { useBookmarks } from '@/hooks/use-bookmarks';

// ----------------------------------------------------------------------

export default function BookmarksPage() {
  const theme = useTheme();
  const { bookmarks, isLoaded, removeBookmark, clearBookmarks } = useBookmarks();

  const [activeTab, setActiveTab] = useState('all');
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  const filteredItems = useMemo(() => {
    if (activeTab === 'movies') {
      return bookmarks.filter((item) => (item.type || item.media_type) !== 'tv');
    }
    if (activeTab === 'tv') {
      return bookmarks.filter((item) => (item.type || item.media_type) === 'tv');
    }
    return bookmarks;
  }, [bookmarks, activeTab]);

  const moviesCount = useMemo(
    () => bookmarks.filter((i) => (i.type || i.media_type) !== 'tv').length,
    [bookmarks]
  );
  const tvCount = useMemo(
    () => bookmarks.filter((i) => (i.type || i.media_type) === 'tv').length,
    [bookmarks]
  );

  const handleRemove = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    removeBookmark(item.id, item.type);
    toast.info('Removed from Watchlist');
  };

  const handleConfirmClear = () => {
    clearBookmarks();
    setClearDialogOpen(false);
    toast.success('Watchlist cleared');
  };

  if (!isLoaded) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={40} sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ py: { xs: 3, md: 5 } }}>
      <Container maxWidth="xl">
        {/* Library Navigation Pill Switch */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
          <Button
            component={RouterLink}
            href={paths.bookmarks}
            variant="contained"
            color="primary"
            size="small"
            startIcon={<Iconify icon="solar:bookmark-bold" width={18} />}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Watchlist
          </Button>
          <Button
            component={RouterLink}
            href={paths.history}
            variant="outlined"
            size="small"
            startIcon={<Iconify icon="solar:history-bold" width={18} />}
            sx={{
              borderRadius: 2,
              fontWeight: 600,
              color: 'text.secondary',
              borderColor: alpha(theme.palette.grey[500], 0.24),
              '&:hover': { color: 'text.primary', borderColor: 'text.primary' },
            }}
          >
            Watch History
          </Button>
        </Stack>

        {/* Header Row */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  color: 'primary.main',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              >
                <Iconify icon="solar:bookmark-bold-duotone" width={24} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>
                My Watchlist
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your saved movies and television shows saved for later viewing.
            </Typography>
          </Stack>

          {bookmarks.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Iconify icon="solar:trash-bin-trash-bold" width={18} />}
              onClick={() => setClearDialogOpen(true)}
              sx={{
                borderRadius: 1.5,
                borderColor: alpha(theme.palette.error.main, 0.35),
                '&:hover': { borderColor: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.08) },
              }}
            >
              Clear Watchlist
            </Button>
          )}
        </Stack>

        {/* Tabs Filter */}
        {bookmarks.length > 0 && (
          <Box sx={{ mb: 4, borderBottom: `1px solid ${alpha('#ffffff', 0.1)}` }}>
            <Tabs
              value={activeTab}
              onChange={(_, val) => setActiveTab(val)}
              textColor="inherit"
              indicatorColor="primary"
              sx={{ '& .MuiTab-root': { fontWeight: 700, fontSize: '0.9rem', textTransform: 'none', px: 2 } }}
            >
              <Tab label={`All (${bookmarks.length})`} value="all" />
              <Tab label={`Movies (${moviesCount})`} value="movies" />
              <Tab label={`TV Shows (${tvCount})`} value="tv" />
            </Tabs>
          </Box>
        )}

        {/* Empty State */}
        {bookmarks.length === 0 ? (
          <Stack
            alignItems="center"
            justifyContent="center"
            spacing={2.5}
            sx={{
              py: 12,
              px: 3,
              textAlign: 'center',
              borderRadius: 3,
              bgcolor: alpha('#ffffff', 0.02),
              border: `1px dashed ${alpha('#ffffff', 0.15)}`,
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
              }}
            >
              <Iconify icon="solar:bookmark-linear" width={36} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Your watchlist is empty
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420 }}>
              Browse through our collection of movies and TV series and tap the bookmark button to save titles here.
            </Typography>
            <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
              <Button
                variant="contained"
                component={RouterLink}
                href={paths.movies}
                startIcon={<Iconify icon="solar:clapperboard-play-bold" width={18} />}
                sx={{ borderRadius: 1.5, px: 3 }}
              >
                Explore Movies
              </Button>
              <Button
                variant="outlined"
                component={RouterLink}
                href={paths.tv}
                startIcon={<Iconify icon="solar:tv-bold" width={18} />}
                sx={{ borderRadius: 1.5, px: 3, color: 'common.white', borderColor: alpha('#ffffff', 0.25) }}
              >
                Explore Shows
              </Button>
            </Stack>
          </Stack>
        ) : filteredItems.length === 0 ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary' }}>
              No {activeTab === 'movies' ? 'movies' : 'TV shows'} in your watchlist
            </Typography>
          </Stack>
        ) : (
          /* Cards Grid */
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 2, sm: 2.5, md: 3 },
              gridTemplateColumns: {
                xs: 'repeat(2, 1fr)',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(4, 1fr)',
                lg: 'repeat(5, 1fr)',
                xl: 'repeat(6, 1fr)',
              },
            }}
          >
            {filteredItems.map((item, idx) => (
              <Box key={item.key || `${item.type}-${item.id}`} sx={{ position: 'relative' }}>
                <PostItem post={item} index={idx} />
                {/* Remove button badge */}
                <IconButton
                  size="small"
                  onClick={(e) => handleRemove(e, item)}
                  title="Remove from watchlist"
                  sx={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    zIndex: 12,
                    bgcolor: alpha('#000000', 0.75),
                    backdropFilter: 'blur(6px)',
                    color: 'common.white',
                    width: 28,
                    height: 28,
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: 'common.white',
                    },
                  }}
                >
                  <Iconify icon="solar:trash-bin-trash-bold" width={15} />
                </IconButton>
              </Box>
            ))}
          </Box>
        )}
      </Container>

      {/* Confirmation Dialog */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0d1117',
              color: 'common.white',
              border: `1px solid ${alpha('#ffffff', 0.15)}`,
              borderRadius: 2.5,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Clear Entire Watchlist?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to remove all {bookmarks.length} titles from your watchlist? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setClearDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmClear}>
            Clear All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
