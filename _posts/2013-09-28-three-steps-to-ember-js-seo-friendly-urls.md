---
layout: post
title: "Ember JS &amp; SEO - How to easily implement SEO friendly URLs in 3 steps"
description: "Ember JS &amp; SEO - How to easily implement SEO friendly URLs in 3 steps"
category: Javascript
tags: [emberjs, javascript]
---
{% include JB/setup %}

This post is a follow up to my previous post about SEO and getting your App crawled. A very important topic of SEO are URLs, as they have a big impact on your ranking by the various search engines. Therefore you will want to create custom URLs in your app. In this blog post we will have a look at how to **implement custom URLs this with 3 easy steps**. **At the end i will show you a shortcut that allows you to skip the steps 2 and 3 and do it with 1 step!** I will provide JSBins for you to play around with both approaches.

This are the 3 steps towards your custom URLs:

1. Modify the mapping in your router and **add dynamic segments** to customize your URL.
2. Implement the `serialize` method to create an URL representation of your models.
3. Implement the `model` method to convert a URL into a model again. This is needed when a user enters your App via URL, e.g. a user hits refresh or someone shares a link to your page.

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


Now we adapted our URL to our needs and it looks fine now. But we also have to handle the case that a user enters our shop by entering via URL, because our awesome product was shared on a social network. The `model` hook is called when your app is entered via URL. In this method its your task to convert the params from the path into a model for your route. So it's the exact opposite direction of the `serialize` hook. The method takes one argument:

- **params:** This is an object with a property for each dynamic segment in your path. (So it's a different data structure than the params object of the serialize hook!)

So this single argument has the exact same structure like the return value of the serialize method! Since the id of the product is part of the URL, we can use it to retrieve the right product. The method *find* stands for the finder method for your Product models. It might differ in your case. **Note: You don't have to put the id of the model into your URL, but you have to make sure that you can convert the params in your URL into the right model.**

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

How does this work? **Ember allows you to use property names as dynamic segments.** It finds for instance *urlFriendlyName* and tries to find that property on the model of your route. Ember then does the work, you would have otherwise done manually in step 2. This Router feature plays very nicely with computed properties. 

So this was about the serialization part, but how does Ember know which model should be loaded in the model hook? Ember does two "magical" things here in the default implementation of model:

- It loops over all properties in the params object and looks for a key ending on \_id. (Please note: It is not sufficient to just place a segment "id" into your URL.)
- If it finds an id property it will invoke a finder method. Our route is called App.ProductRoute. Therefore Ember will try to invoke App.Product.find() with the found id.

So all we have to do is adding an alias to our product, so that Ember finds the id under the expected key.Have a look at the final implementation of this approach. We don't have to do any custom serialization and deserialization ourselves. Actually i could omit the whole ProductRoute from the code!

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

## Conclusion

I hoped you liked it and i could give you a good overview of how to implement SEO friendly URLs with EmberJS. **Are there any other topics you would like to see? Let me know! :-)** 

**Follow me on Twitter, if you are interested in my upcoming blog posts:-)**