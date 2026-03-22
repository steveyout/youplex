// ----------------------------------------------------------------------

const MuiCard = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      position: 'relative',
      boxShadow: theme.customShadows.card,
      borderRadius: theme.shape.borderRadius * 2,
      zIndex: 0, // Fix Safari overflow: hidden with border radius
      [theme.getColorSchemeSelector('dark')]: {
        backgroundColor: 'rgba(20, 20, 25, 0.4)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
      },
    }),
  },
};

// ----------------------------------------------------------------------

const MuiCardHeader = {
  /** **************************************
   * DEFAULT PROPS
   *************************************** */
  defaultProps: {
    titleTypographyProps: { variant: 'h6' },
    subheaderTypographyProps: { variant: 'body2', marginTop: '4px' },
  },

  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3, 3, 0),
    }),
  },
};

// ----------------------------------------------------------------------

const MuiCardContent = {
  /** **************************************
   * STYLE
   *************************************** */
  styleOverrides: { root: ({ theme }) => ({ padding: theme.spacing(3) }) },
};

// ----------------------------------------------------------------------

export const card = { MuiCard, MuiCardHeader, MuiCardContent };
