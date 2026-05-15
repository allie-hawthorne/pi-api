// TODO: Make proper Tenor params type, or find library that does this
const fetchTenor = async (endpoint: string, params?: Record<string, string>) => {
  const entries = Object.entries(params ?? {}).map(([k, v]) => `${k}=${v}`);

  const paramsStr = entries.join('&');

  const url = `https://tenor.googleapis.com/v2/${endpoint}?key=${process.env.TENOR_API_KEY}&client_key=Gif_Canvas&${paramsStr}`;

  const data = await fetch(url);

  if (!data.ok) throw new Error('An error occurred while fetching gifs.');

  return data.json();
}

export const searchTenor = (q: string) => fetchTenor('search', {q});
export const featuredTenor = () => fetchTenor('featured');
