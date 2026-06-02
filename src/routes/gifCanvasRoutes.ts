import { app, getCanvasRepo } from "..";
import { getItemsInTheLastDay, getTimeToWait, getUserDataOrFail } from '../utils';
import { featuredTenor, searchTenor } from '../tenor';

export const createGifCanvasRoutes = () => {
  app.get("/api/canvas", async function (req, res) {
    const items = await getCanvasRepo().find();
    res.status(200).json(items);
  });

  app.post("/api/canvas", async function (req, res) {
    const data = getUserDataOrFail(req);
    if (!data) {
        console.log('ERROR:', req.query, req.headers.authorization)
        return res.status(403).json('Something went wrong :(');
    }
    const {userId, fingerprint} = data;
    const {position, item} = req.body;

    const [recentUserItems, recentUserItemCount] = await getItemsInTheLastDay(userId, fingerprint)

    if (recentUserItemCount) {
        const timeToWait = getTimeToWait(recentUserItems)
        return res.status(403).json(`You've already added a GIF today, please wait ${timeToWait}`);
    }

    const newItem = await getCanvasRepo().save({
        userId,
        url: item.url,
        updatedAt: new Date(),
        position,
        fingerprint,
        dimensions: item.dims
    });

    res.status(200).json(newItem);
  });

  app.get('/api/gifs/search', async function (req, res) {
    const q = req.query.q?.toString();

    if (!q) throw new Error('No search query')

    const data = await searchTenor(q);

    // TODO: Deal with any
    // @ts-ignore
    const gifs = data.results.map(g => g.media_formats.webm);

    return res.status(200).json(gifs)
  });

  app.get('/api/gifs/featured', async function (req, res) {
    const data = await featuredTenor();

    // TODO: Deal with any
    // @ts-ignore
    const gifs = data.results.map(g => g.media_formats.webm);

    return res.status(200).json(gifs)
  });
};