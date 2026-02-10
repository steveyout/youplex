import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from '@/components/iconify';

// ----------------------------------------------------------------------

const FAQS = [
  {
    id: 'faq-1',
    heading: 'Is this service free to use?',
    detail: 'Yes, our platform is completely free. We do not require any subscriptions or credit card information to stream your favorite movies and TV shows.',
  },
  {
    id: 'faq-2',
    heading: 'How often is new content added?',
    detail: 'Our library is updated daily. New movie releases and the latest TV episodes are typically available within a few hours of their official release.',
  },
  {
    id: 'faq-3',
    heading: 'What video quality is available?',
    detail: 'Most of our content is available in 720p and 1080p High Definition. Some older titles may be limited to standard definition depending on the source.',
  },
  {
    id: 'faq-4',
    heading: 'Can I watch on my mobile device or Smart TV?',
    detail: 'Absolutely! Our site is fully responsive and works on mobile browsers. Since we are a PWA, you can also "Install" the app on your Android or iOS home screen for a better experience.',
  },
  {
    id: 'faq-5',
    heading: 'Why is the video buffering?',
    detail: 'Buffering usually occurs due to a slow internet connection or high server load. You can try switching to a different "Server" using our provider list located below the player.',
  },
  {
    id: 'faq-6',
    heading: 'Are subtitles available?',
    detail: 'Yes, most of our servers support multi-language subtitles. You can enable them by clicking the "CC" or gear icon inside the video player.',
  },
];

// ----------------------------------------------------------------------

export function FaqsList() {
  return (
    <div>
      {FAQS.map((accordion) => (
        <Accordion
          key={accordion.id}
          sx={{
            '&:before': { display: 'none' }, // Removes the default MUI line
            mb: 1,
            borderRadius: 1,
            border: (theme) => `solid 1px ${theme.vars.palette.divider}`,
            '&.Mui-expanded': {
              boxShadow: (theme) => theme.customShadows.z8,
            }
          }}
        >
          <AccordionSummary
            expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
            sx={{ px: 2 }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 'fontWeightSemiBold' }}>
              {accordion.heading}
            </Typography>
          </AccordionSummary>

          <AccordionDetails sx={{ px: 2, pb: 2 }}>
            <Typography sx={{ color: 'text.secondary' }}>
              {accordion.detail}
            </Typography>
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
}
