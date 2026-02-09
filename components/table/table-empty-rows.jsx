import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

// ----------------------------------------------------------------------

export function TableEmptyRows({ emptyRows, height }) {
  if (!emptyRows) {
    return null;
  }

  return (
    <TableRow sx={{ ...(height && { height: height * emptyRows }) }}>
      <TableCell colSpan={9} />
    </TableRow>
  );
}
