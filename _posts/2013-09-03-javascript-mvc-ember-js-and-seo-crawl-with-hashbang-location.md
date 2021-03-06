---
layout: post
title: "Ember JS &amp; SEO - Make your App crawlable with the Hashbang Location"
description: "Ember JS &amp; SEO - Make your App crawlable with the Hashbang Location"
category: Javascript
tags: [emberjs, javascript]
---
{% include JB/setup %}

The topic of **Search Engine Optimization (SEO) pops up quite often, when disadvantages of Javascript MVC frameworks are discussed**. Naturally webapps written entirely in Javascript **are not crawable without any actions taken by you**. In this article i will discuss the fundamental problems of javascript mvc apps in this topic and then i will present a solution for EmberJS Apps.

All crawling approaches basically need to solve two problems:
- **Search Engines** must be able to **discover URLs**, which should be crawled.
- **Your server must be able to respond to these URLs**, when the Search Engine crawler asks for it.

Let's first discuss these two problems and possible solutions. Afterwards i will discuss two common approaches adressing both problems.

## 1. Search Engines must be able to discover URLs
On traditional websites using classic server side generated HTML, you do not need to worry about this point. The crawlers of Search Engines will crawl your homepage and search all links that it contains. Those linked pages are then crawled too. Therefore no manual actions are required as long as the pages you want to be crawled are reachable by following links starting on your homepage. **But crawlers won't execute your Javascript Application and therefore can't find any links.**  I see two solutions to this problem:

### 1.1 Provide a fallback for users without javascript
If a client asks for a page, always include some fallback wrapped in noscript-tags. You can see this approach in action on [discuss.emberjs.com](http://discuss.emberjs.com/). Just disable Javascript and have a look yourself. This way **Search Engines can follow their traditional scheme** of following links on your site. But no one gets overly excited when hearing this solution, since it requires quite some work, right?

### 1.2 Provide a sitemap.xml
If the first solution seems too cumbersome for you (it was for me), you can also use a sitemap.xml ([Google Article on sitemaps](https://support.google.com/webmasters/answer/156184?hl=en)). Put simply this is a list of URLs, that shall be crawled by a Search Engine. Following is one quote from the linked Google Article. Sounds like a good fit for an Ember App, right?

> Sitemaps are particularly helpful if: <br/>
> Your site has pages that aren't easily discovered by Googlebot during the crawl process—for example, pages featuring rich AJAX or images.

Now we will have a look at how we can serve content to a crawler.

## 2. Your server must be able to respond to these URLs asked by a crawler
Per default URLs in an Ember App look like *http://mydomain.com/#/posts/1*. So the path of the current route is stored after the hash sign. **This part of your URLs is never transmitted to the server**, because it was originally intended to enable browsers jumping directly to anchors on a given page. This may seem like a hack, but it was required, because until HTML5 it was not possible to manipulate the URL without causing a reload of the page. **So we need to find a way to enable crawlers to send the complete route path to your server.** Again there are 2 solutions:


### 2.1 Use the HTML5 History API
You switch to Embers Location Implementation, that uses the **HTML 5 History Location API**. This removes the hash from the URLs of your apps. This HTML5 API makes it possible to manipulate the URL in the browser without causing a reload. Enable it with these few lines:

{% highlight javascript %}
App.Router.reopen({
  location: 'history'
});
{% endhighlight %} 

Now your URLs look like *http://mydomain.com/posts/1*. If a crawler finds such a URL, **the route path information now gets transmitted to your server**, as this is a standard URL now. **In this scenario crawlers and regular users use the same URLs to interact with your site.** Therefore you have to simultaneously serve crawlers and users, which means a response must contain the HTML Content for the crawler and the assets to get your Ember App up and running (== provide a javascript fallback). Alternatively your Controller that creates the response, reacts on the transmitted User-Agent and serves 2 different responses (one for crawlers and one for users). There is an additional a caveat, as you must setup your server in a way, that **all possible URLs (/, /posts/1, /foo/whatever..) generated by your JS App must deliver the right content**. This could be a dealbreaker in certain environments where you have to integrate into grown environments and you may not be able to implement such drastic changes to the URLs schemes of the site.

### 2.2 Adhdere to the AJAX Crawling Scheme
Alternatively you can adhere to the [AJAX Crawling Scheme](https://developers.google.com/webmasters/ajax-crawling/docs/getting-started), which was defined by major search engines. This Crawling scheme defines the following rules:
- Opt into this scheme by appending an ! after the # in your URLs, e.g. *http://mydomain.com/#!/posts/1* (This #! is commonly called Hashbang).
- If a crawler finds one of these URLs (likely in a sitemap), it sends a modified request to your server, which now looks like: *http://mydomain.com?_escaped_fragment_=posts/1*. 

**The route path information is moved to an URL parameter and is therefore transferred to your server.** Your server can now react on this special parameter *escaped_fragment*. If it is present in the request, you can serve the HTML for crawlers. **In this scenario crawlers and regular users use different URLs to access your site.** If you use this approach you have to serve a collection of those modified URLs via sitemap to search engines. Then search engines will send those modified requests with special parameter if your server. If a user clicks on a search result, the user will enter your App with one of those Hashbang URLs. So your app must now work with those URLs.


## 3 Combining alternatives into a cohesive solution

After we had a look at those fundamental problems, i will present two approaches solving these problems. The second approach is the one, we took in my recent project.

### 3.1 A solution based on HTML5 History API

Leveraging the HTML5 History API solves the problem of transmitting route information to your server quite nice without work on your side. The only major drawback is the [browser support](http://caniuse.com/#search=history). Many browsers support it, but some still lack support (most notably IE < 10 and Android 4.1). Judge for yourself if you are fine with it. The challenge in this case is to serve the HTML, when an URL is requested. There are 2 possible approaches:
1. Have a fully functional fallback for non javascript users. I think this is a quite tough challenge as its solution largely depends on your application stack.
2. Crawl your own app with the help of a headless browser, which can execute javascript and serve the results to search engines (when you detect them based on the User Agent). This approach is for example taken by the [SEO JS project](https://github.com/alexferreira/seojs) or [Brombone, a JS SEO service provider](http://www.brombone.com/). It could be that you crawl your App once a day and generate static HTML files or you may have to do that dynamically on each request, which could become quite resource intensive.

No one of these solutions really satisfied me. In my current project incorporating a service provider was no option. Providing a fully functional fallback was too cumbersome, because you will have to duplicate functionality and templates (unless you can use Handlebars easily in your stack). An approach like the **SEO JS project appealed to me at first glance**, but **what about a page of your App, where SEO critical information is just displayed after a click?** This would mean you would have to perform clicks programmatically, before the final HTML result is ready. As far i have understand the SEO JS project could not handle this case. And even if this could have been done, this approach felt a little bit old fashioned too me, because you would have to think in traditional client server fashion again.

Therefore we decided to **base our solution on the AJAX Crawling scheme**.

### 3.2 A solution based on the AJAX Crawling scheme

At first we had to solve the problem that Ember does not provide an easy way to enable a Hashbang Location in your App. You will have to write an own implementation which adds the ! after the # in all your urls. **We wrote an implementation of the HashbangLocation by subclassing Ember.HashLocation**, which is provided by the framework. Please note that i found a few implementations on the web and Stackoverflow, that look quite similar to the one below. But each one i had a look at, had at least one problem involved.

{% highlight javascript %}
(function() {

var get = Ember.get, set = Ember.set;

Ember.Location.registerImplementation('hashbang', Ember.HashLocation.extend({   

  getURL: function() {
    return get(this, 'location').hash.substr(2);
  },

  setURL: function(path) {
    get(this, 'location').hash = "!"+path;
    set(this, 'lastSetURL', path);
  },

  onUpdateURL: function(callback) {
    var self = this;
    var guid = Ember.guidFor(this);

    Ember.$(window).bind('hashchange.ember-location-'+guid, function() {
      Ember.run(function() {
        var path = location.hash.substr(2);
        if (get(self, 'lastSetURL') === path) { return; }

        set(self, 'lastSetURL', null);

        callback(path);
      });
    });
  },

  formatURL: function(url) {
    return '#!'+url;
  }

  })
);

})();
{% endhighlight %}

In order to enable this location implementation in your App, just use this snippet:

{% highlight javascript %}
App.Router.reopen({
  location: 'hashbang'
});
{% endhighlight %} 

Now our app could respond to Hashbang URLs. Next we generated a sitemap containing URLs that contained those Hashbangs. Now the crawlers would ask our server for URLs like *http://mydomain.com?_escaped_fragment_=posts/1*. We wrote our controller this way that it served special HTML, when this parameter (_escaped_fragment_) was present in the request. This way we could serve exactly the content we wanted to get indexed. We mitigated the problem of the first solution, where we would had to perform clicks programmatic to create the DOM we wanted to get indexed. **A nice additional benifit was that we now have completely separate HTML for crawlers and our app.** Thereby the resulting HTML for the crawlers was much simpler as we did not have to bother with the look of the result. We used this additional freedom to incorporate [rich snippet microdata](https://support.google.com/webmasters/answer/176035?hl=en), which provides metadata to search engines to understand your content better. This way we were able to keep the templates of our Ember App free of this additional semantic HTML structures, which are there for SEO only. 

**For me this approach felt really nice, as this should be probably the way how the interaction with crawlers should work (in my opinion):** Crawlers interact with a specialized API endpoint on your server that serves structured data. Currently this data is served as HTML (sprinkled with rich snippets), but one could also imagine XML or JSON as a format.


## Conclusion

I hoped you liked it and i could give you a good overview of the SEO Topic in the context of JS Apps. It is not really difficult, but it irritated me a few times before i finally grasped it. I hope i saved you some time understanding it :-)

**PS: Soon i will publish an additional post on the SEO topic to show you how you can create SEO friendly URLs.** So follow me on Twitter, if you are interested :-)