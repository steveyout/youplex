import { CONFIG } from 'config-global';
import { getPosts } from 'actions/blog-ssr';

import { PostListHomeView } from '@/sections/movies/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Post list - ${CONFIG.site.name}` };

export default async function Page() {
  const { posts } = await getPosts();

  return <PostListHomeView posts={posts} />;
}
