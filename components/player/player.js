import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';

// ----------------------------------------------------------------------

export default function Player({ src, servers }) {
  const [open, setOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleServerSelect = (server) => {
    setSelectedServer(server);
    handleClose();
  };

  return (
    <Box>
      <Box
        component="iframe"
        src={selectedServer ? selectedServer.url : src}
        width="100%"
        height="500px"
        frameBorder="0"
        allowFullScreen
        sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
      />
      <Button variant="contained" onClick={handleOpen} sx={{ mt: 2 }}>
        Change Server
      </Button>
      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" component="div" gutterBottom>
            Select Server
          </Typography>
          <Stack spacing={2}>
            {servers.map((server) => (
              <Button
                key={server.id}
                variant="outlined"
                onClick={() => handleServerSelect(server)}
              >
                {server.name}
              </Button>
            ))}
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}
