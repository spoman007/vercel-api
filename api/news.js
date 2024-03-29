import 'dotenv/config';
import scrapeIt from 'scrape-it';
import fetch from 'node-fetch';

const express = require('express');
const router = express.Router();

router.get('/repositories/:language?', async (req, res) =>
  res.send(await getRepositories(req.params))
);

router.get('/articles/:language?', async (req, res) => res.json(await getArticles(req.params)));

router.get('/discussions/:language?', async (req, res) =>
  res.json(await getDiscussions(req.params))
);

async function getArticles({ language = 'javascript' } = {}) {
  const api_res = await fetch(
    `https://dev.to/search/feed_content?per_page=30&page=0&tag=${language.toLowerCase()}&sort_by=hotness_score&sort_direction=desc&tag_names%5B%5D=${language.toLowerCase()}&approved=&class_name=Article`
  );
  const { result } = await api_res.json();
  return result.map(({ path, tag_list: tags, title, main_image, image_url }) => ({
    title,
    link: 'https://dev.to' + path,
    tags,
    image: main_image !== null ? main_image : image_url,
  }));
}

async function getRepositories({ language = '' }) {
  const repoStructure = {
    repositories: {
      listItem: 'article',
      data: {
        title: {
          selector: 'h2',
          convert: (x) => x.split('\n').join('').replace(/\s/g, ''),
        },
        link: {
          selector: '.lh-condensed a',
          attr: 'href',
          convert: (x) => 'https://github.com' + x,
        },
        language: {
          selector: '.mt-2',
          convert: (x) => x.split('\n')[0],
        },
        stars: {
          selector: '.mt-2 a',
          convert: (x) => x.split('\n').join('').split(' ')[0],
        },
        colour: {
          selector: '.mt-2 span .repo-language-color',
          attr: 'style',
          convert: (x) => x.split('background-color: ')[1],
        },
        today: {
          selector: '.float-sm-right',
          convert: (x) => parseInt(x.split('')[0]),
        },
        description: 'p.pr-4',
      },
    },
  };
  const obj =
      language === 'javascript'
        ? [
            scrapeIt(
              'https://github.com/trending/typescript?spoken_language_code=en',
              repoStructure
            ),
            scrapeIt(
              'https://github.com/trending/javascript?spoken_language_code=en',
              repoStructure
            ),
          ]
        : [scrapeIt(`https://github.com/trending/${language}`, repoStructure)],
    [
      {
        data: { repositories: tsRepos },
      },
      { data: { repositories: jsRepos = [] } = {} } = {},
    ] = await Promise.all(obj);

  return [...jsRepos, ...tsRepos].sort((a, b) => b.today - a.today);
}

async function getDiscussions({ language = 'javascript' } = {}) {
  const obj =
      language === 'javascript'
        ? [
            fetch('https://www.reddit.com/r/reactjs/.json').then((value) => value.json()),
            fetch('https://www.reddit.com/r/javascript/.json').then((data) => data.json()),
          ]
        : [fetch(`https://www.reddit.com/r/${language}/.json`).then((value) => value.json())],
    [
      {
        data: { children: reactThreads },
      },
      { data: { children: jsThreads = [] } = {} } = {},
    ] = await Promise.all(obj);

  return [...reactThreads, ...jsThreads].map(({ data: { title, permalink, url, thumbnail } }) => ({
    title: title,
    link: 'https://www.reddit.com' + permalink,
    url: url,
    image: thumbnail !== '' && thumbnail !== 'self' && thumbnail !== 'default' ? thumbnail : null,
  }));
}

export default router;
