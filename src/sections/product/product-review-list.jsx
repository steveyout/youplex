import Pagination, { paginationClasses } from '@mui/material/Pagination';

import { ProductReviewItem } from './product-review-item';

// ----------------------------------------------------------------------

export function ProductReviewList({ reviews }) {
  return (
    <>
      {reviews.map((review) => (
        <ProductReviewItem key={review.id} review={review} />
      ))}

      <Pagination
        count={10}
        sx={{
          mx: 'auto',
          [`& .${paginationClasses.ul}`]: { my: 5, mx: 'auto', justifyContent: 'center' },
        }}
      />
    </>
  );
}
