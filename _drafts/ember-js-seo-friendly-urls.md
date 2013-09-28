---
layout: post
title: "Ember JS &amp; SEO - How to easily implement SEO friendly URLs in 3 steps??"
description: "Ember JS &amp; SEO - How to easily implement SEO friendly URLs in 3 steps??"
category: Javascript
tags: [emberjs, javascript]
---
{% include JB/setup %}

This post is a follow up to my previous post about SEO and getting your App crawled. A very important topic on SEO are URLs. Therefore you will want to create custom URLs in your app. Let's have a look at how to **do this with three easy steps**. At the end i will show you a shortcut that allows you to skip the steps 2 and 3! I will provide JSBins for you to play around for both approaches.

All you have to do is implement two methods in your Route:

- Modify the mapping in your router and **add dynamic segments** as you like to customize your URL.
- Implement the `serialize` method to create an URL representation for your models.
- Implement the `model` method to convert a URL into a model again. This is needed when a user enters your App via URL, e.g. a user hits refresh.

### An example scenario

A really simple example could be an online shop (more fancy: E-Commerece platform) for which you want to optimize the URL of the product page. Your model looks like this:

{% highlight javascript %}
App.Product = Ember.Object.extend({
	id : null,
	name : null,
	color : null
});
{% endhighlight %} 

### Step 1 - Add dynamic segments in your router mapping

Per default you don't have specify dynamic segments for your Routes. If you want to customize the URL of one of your Routes, all you have to do is adding a hash to your call to `resource` or `route` containing the desired URL structure in the property named 'path'. In the example below i added dynamic segments for the product name, color and id. Those dynamic segements act as placeholders that will be replaced by the actual values.


{% highlight javascript %}
App.Router.map(function() {
	this.resource('product', { path: '/products/:product_name/color/:product_color/id/:product_id' });
});
{% endhighlight %} 


### Step 2 - Implement the serialize hook

The `serialize` method is called after your app has transitioned into a new state. It is used to convert the model of your Route into an URL representation. The method takes two arguments:

- **model:** The current model for your Route.
- **params:** This an array containing the segment names you defined in your Router mapping. We won't need it in our example as it is just useful for some generic programming.

The method must return a hash with one property for each dyamic segment you added to the path of your Route in step 1. **In this case we have to return a hash with the keys *product_name*, *product_color* and *product_id*.** The values of these properties are then placed by Ember at the corresponding positions into the URL. Pretty easy, hm? This is a possible implementation of this method:


{% highlight javascript %}
App.ProductRoute = Ember.Route.extend({
  serialize : function(product, params){
    return {
      product_id : product.get("id"),
      product_name : product.get("name"),
      product_color : product.get("color")
    };
  }
});
{% endhighlight %}

For purposes of clarity i like to rename the model argument to a name, which shows me clearly upon which model type i am working. As you can see i am really just returning a hash with the keys from the paths and simple calls to the properties. **In reality you will likely have to do a little more work, since product names may contain spaces and you want a more readable *hyphen* instead of an ugly *%20* in your URLs.** I personally use computed properties on the model for these computations. Therefore i added an computed property named *urlFriendlyName* to the product class and the code now looks like this:

{% highlight javascript %}
App.Product = Ember.Object.extend({
	id : null,
	name : null,
	color : null,
	urlFriendlyName : function(){
		var ret = this.get("name").replace(/ /g,"-"); // replace spaces
		// do other replacements that make sense in your case, e.g.:
		ret = ret.replace(/&/g,"and");
		//... and so on and so forth
		// encode the remaining characters
		return encodeURIComponent(ret); 
	}.property("name"),
});
App.ProductRoute = Ember.Route.extend({
	serialize : function(product, params){
		return {
			product_id : product.get("id"),
			product_name : product.get("urlFriendlyName"),
			product_color : product.get("color")
		};
	}
});
{% endhighlight %} 

The easiest thing for you would be to just call `encodeURIComponent` on your String, but this will likely result in a not so human friendly form of your String. Therefore i added some replacements via regexes to replace some characters with a nice readable representation. In the example i replaced for instance an *&* with a more readable *and*.


### Step 3 - Implement the model hook


Now we adapted our URL to our needs and it looks fine now. But we also have to handle the case that a user enters our shop by entering via URL, because are awesome product was shared on social network. The `model` hook is called when your app is entered via URL. In this method its your task to convert the params from the path into a model for your route. So it's the exact opposite direction of the `serialize` hook. The method takes one argument:

- **params:** This is an object with a property for each dyanmic segment in your path. 

So this method has the exact same structure like the return value of the serialize method! Since the id of the product is part of the URL, we can use it to retrieve the right product. The method *find* stands for the finder method for your Product models. It might differ in your case. **Note: You don't have to put the id of the model into your URL, but you have to make sure that you can convert the params in your URL into the right model.**

{% highlight javascript %}
App.ProductRoute = Ember.Route.extend({
  ...
  model : function(params){
  	return App.Product.find(params.product_id);
  }
});
{% endhighlight %} 

Have a look at the final result in the following JSBin. I added a little JS snippet so that you see the current URL of your app, because you would normally not see it in a JSBin. Feel free to play around with it and try your own ideas or requirements!

<a class="jsbin-embed" href="http://jsbin.com/IruYoZej/2/embed?js,output">Ember Starter Kit</a>
<script src="http://static.jsbin.com/js/embed.js">

</script>



### An alternative for the lazy ones - Leveraging the Magic of Ember to cut step 2 and 3

This was pretty easy so far and not much work. But thanks to the great Ember guys, this can be achieved even easier. **You can omit the implementations for serialize and model!** All you have to do is this:

{% highlight javascript %}
App.Router.map(function() {
	this.resource('products');
	this.resource('product', { path: '/product/:urlFriendlyName/color/:color/id/:product_id' });
});
{% endhighlight %} 

How does this work? **Ember allows you to use property names as dynamic segments.** It finds for instance *urlFriendlyName* and tries to find that property on the model of your route. Ember then does the work, you would have otherwise done manually in step 2. Ember just does a call to `Ember.getProperties(model, params)`, so it would not find anything with product\_id. This Router feature is a nice benefit of using computed properties for this task. 

So this was about the serialization part, but how does Ember know which model should be loaded in the model hook? Ember does two "magical" things here in the default implementation of model:

- It loops over all properties in the params object and looks for a key ending on \_id.
- If it finds an id it will inboke a finder method. Our route is called App.ProductRoute. Therefore Ember will try to invoke App.Product.find() with the found id.

So all we have to do is adding an alias to our product, so that Ember finds the id under the expected key.Have a look at the final implementation of this approach. We don't have to do any custom serialization and deserilization ourselves. Actually i could omit the whole ProductRoute from the code!

{% highlight javascript %}
App.Product = Ember.Object.extend({
	id : null,
	...
	"product_id" : Ember.computed.oneWay("id")
});
{% endhighlight %} 

<a class="jsbin-embed" href="http://jsbin.com/EKEquTU/2/embed?js,output">Ember Starter Kit</a>
<script src="http://static.jsbin.com/js/embed.js">

</script>





Direkt auf properties zugreifen

**Notizen:**


- hooks serialize und model erklären (erstmal deren Schnittstelle erklären)
- Default-Implementation erklären
- Beispiel SEO-URLs impementieren
- alles mit JSBins zu Demonstrationszwecken?
- Default-Implementationen am Ende?

## Default Implementation

{% highlight javascript %}
// https://github.com/emberjs/ember.js/blob/v1.0.0/packages/ember-routing/lib/system/route.js#L665
serialize: function(model, params) {
	if (params.length < 1) { return; }

	var name = params[0], object = {};

	if (/_id$/.test(name) && params.length === 1) {
		object[name] = get(model, "id");
	} else {
		object = getProperties(model, params);
	}

	return object;
},
// https://github.com/emberjs/ember.js/blob/v1.0.0/packages/ember-routing/lib/system/route.js#L559
model: function(params, transition) {
	var match, name, sawParams, value;

	for (var prop in params) {
		if (match = prop.match(/^(.*)_id$/)) {
			name = match[1];
			value = params[prop];
		}
		sawParams = true;
	}

	if (!name && sawParams) { return params; }
	else if (!name) { return; }

	return this.findModel(name, value);
}
{% endhighlight %} 

**Pseudo code of serialize:**

**Interface:** 

- The path must contain at least 1 dynamic part (other wise there is no need to serialize something :-)
- If the contains exactly one dynamic part whose name ends on **\_id**, e.g. **product_id** , the property **id** of the model is returned.
- Otherwise Ember will try to get all properties from the underlying model, by using the names of all parts of the routes path and return it as a simple hash.

Doc: The default serialize method will insert the model's id into the route's dynamic segment (in this case, :post_id) if the segment contains 'id'. If the route has multiple dynamic segments or does not contain 'id', serialize will return Ember.getProperties(model, params)

**Pseudo code of model:**

- By default, if your route has a dynamic segment ending in \_id:

The model class is determined from the segment (post_id's class is App.Post)
The find method is called on the model class with the value of the dynamic segment.

- 


## Simple Customization

## Advanced Customization - Multiple dynamic segments

{% highlight javascript %}
App.Router.map(function() {
  this.route('calendar_month', { path: 'calendar/:year/:month'});
});
{% endhighlight %} 

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



## Conclusion

I hoped you liked it and i could give you a good overview of the SEO Topic in the context of JS Apps. It is not really difficult, but it irritated me a few times before i finally grasped it. I hope i saved you some time understanding it :-)

**PS: Soon i will publish an additional post on the SEO topic to show you how you can create SEO friendly URLs.** So follow me on Twitter, if you are interested :-)