import { Route } from '@/types';
import cache from '@/utils/cache';
import got from '@/utils/got';
import { load } from 'cheerio';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

export const route: Route = {
    path: '/article/:uid',
    categories: ['shopping'],
    example: '/smzdm/article/6902738986',
    parameters: { uid: '用户 id，网址上直接可以看到' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['zhiyou.smzdm.com/member/:uid/article'],
        },
    ],
    name: '用户文章',
    maintainers: ['xfangbao'],
    handler,
};

async function handler(ctx) {
    const link = `https://zhiyou.smzdm.com/member/${ctx.req.param('uid')}/article/`;

    const response = await got(link);
    const $ = load(response.data);
    const title = $('.info-stuff-nickname a').text();

    const list = $('.pandect-content-stuff')
        .toArray()
        .map((item) => {
            item = $(item);
            return {
                title: item.find('.pandect-content-title a').text(),
                link: item.find('.pandect-content-title a').attr('href'),
                pubDate: timezone(parseDate(item.find('.pandect-content-time').text(), ['YYYY-MM-DD', 'MM-DD HH:mm']), +8),
            };
        });

    const out = await Promise.all(
        list.map((item) =>
            cache.tryGet(item.link, async () => {
                const response = await got(item.link);
                const $ = load(response.data);
                item.description = $('.m-contant article').html();
                item.pubDate = timezone(parseDate($('meta[property="og:release_date"]').attr('content'), 'YYYY-MM-DD HH:mm:ss'), 8);
                item.author = $('meta[property="og:author"]').attr('content');

                return item;
            })
        )
    );

    return {
        title: `${title}-什么值得买`,
        link,
        item: out,
    };
}
