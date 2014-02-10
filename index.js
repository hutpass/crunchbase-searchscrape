var request = require('request');
var queue = require('queue-async');
var cheerio = require('cheerio');
var fs = require('fs');

var searchId = process.argv[2];
var entityType = 'companies';
var linkStrip = '/company/';
var searchBase = 'http://www.crunchbase.com/search/advanced/';

var searchPath = searchBase + entityType + '/' + searchId;

var resultsPerPage = 7;

var resultList = [];

function pageGather(page) {
  return function(i, a){
    resultList[page*resultsPerPage+i] = {
      permalink: a.attribs.href.slice(linkStrip.length),
      crunchbase_url: 'http://www.crunchbase.com' + a.attribs.href,
      name: a.attribs.title
    };
  };
}

function searchGet(page, cb) {
  return request(searchPath + (page ? '?page=' + (page+1) : ''),
    function(err, res, body) {
    console.log('Scraping page '+(page+1));
      if(err) return cb(err);
      cheerio.load(body)('.search_result_name > a').each(pageGather(page));
      return cb();
    }
  );
}

console.log(searchPath);

request(searchPath, function(err, res, body) {
  if(err) { throw err};

  var $ = cheerio.load(body);

  console.log('Scraping page 1');

  $('.search_result_name > a').each(pageGather(0));

  // This was ('.pagination:nth-last-child(2)') but that wasn't working
  var pages = parseInt($('.pagination').children().last().prev().text(),10);
  var q = queue();

  for(var i = 1; i < pages; i++) q.defer(searchGet,i);

  q.awaitAll(function(err){
    if (err) throw err;

    fs.writeFileSync(searchId+'.result.json', JSON.stringify(resultList,null,2));
  });
});


