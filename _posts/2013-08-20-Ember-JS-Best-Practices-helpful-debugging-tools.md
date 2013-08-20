---
layout: post
title: "Ember JS Best Practices - Helpful debugging tools"
description: "Ember JS Best Practices - A List of helpful debugging tools"
category: Javascript
tags: [emberjs, javascript]
---
{% include JB/setup %}

This is a short post **collecting some helpful debugging tools** built into Ember or how you could easily implement some yourself.

### The Basics - What debugging tools are built into Ember?
There is already a really helpful list in the [Ember Docs about Debugging](http://emberjs.com/guides/understanding-ember/debugging/).


On top of this i would like to add a snippet, that has become very important with the introduction of heavy usage of promises in the recent Ember releases. Note that you need the most recent version of Ember at the point of this writing (== RC7). You should **include these few lines of code in every Ember App**. I learned about those lines in the Blog of [Ian Petzer](http://ianpetzer.wordpress.com/2013/07/24/dont-let-ember-js-swallow-errors-in-your-promises/). This snippet logs all exceptions that are thrown when resolving or rejecting promises. **If you do not include this snippet, all exceptions will be swallowed silently** and may leave you very irritated.

{% highlight javascript %}
Ember.RSVP.configure('onerror', function(e) {
  console.log(e.message); 
  console.log(e.stack);
});
{% endhighlight %}

### Beyond the basics - A typical debugging process

It is quite often that you will start your app and see no exceptions in the console, but you won't see the desired result in the browser also. How to go about this? There may be a minor error in your template or the connected controller does not carry the right data. How to analyze this kind of error? As the Ember Contributors deeply care about usability, they are developing an [extension for Chrome](https://github.com/tildeio/ember-extension.git), which facilitates this kind of debugging. With this extension you can inspect DOM elements with one click and see the associated View and Controller. You can already install this extension, but it is not officially released yet. Alternatively **you can mirror this functionality manually in the browser console**. How to do that?

First things first, you likely already noticed how Ember is rendering Views. It is inserting views with prefixed ids into your DOM:

{% highlight html %}
<div id="ember479" class="ember-view">
  ...
</div>
{% endhighlight %}

Following the aforementioned [Debugging Docs](http://emberjs.com/guides/understanding-ember/debugging/), you can get the View object associated with the DOM element shown above by calling the following in your console:
{% highlight javascript %}
Ember.View.views['ember479']
{% endhighlight %}

You can get the controller backing this view by getting the controller property of your view:

{% highlight javascript %}
Ember.View.views['ember479'].get('controller')
{% endhighlight %}

This is quite handy already but is relatively cumbersome, when you are refreshing your browser very often and need to repeat these lines quite often. So it is a good idea to encapsulate this functionality in a helper function. I am using the following two debugging functions in my projects:

{% highlight javascript %}
function ev(emberId){
  return Ember.View.views['ember' + emberId];
}
function ec(emberId){
  return ev(emberId).get('controller');
}
{% endhighlight %}

This way you get the view or controller linked to the element above by **calling simply ev(479) or ec(479)**.


#### Adding custom logging and debugging functions to arbitrary Ember Classes

So far you can now get controllers and views associated with a DOM element with one line of code. Now you can call methods of your objects to trigger something manually and see what happens, e.g. inspect the content of a controller. But this might be very cumbersome again. A really useful feature in Ember is that you can easily extend the existing classes by using the method *reopen*. The following snippet is one that i am using often. This snippet extends the existing Controllers and adds a method which logs its content in the console.

{% highlight javascript %}
Ember.ArrayController.reopen({
  logContent : function(){
    this.forEach(function(item, index){
      console.log(index + ": " + item.toString());
    });
  }
});
Ember.ObjectController.reopen({
  logContent : function(){
    console.log(this.get("content")).toString());
  }
});
{% endhighlight %}
 
With this snippet you can easily log the content of a controller: 

{% highlight javascript %}
var ac = Ember.ArrayController.create();
ac.addObject(Ember.Object.create());
ac.addObject({});
ac.logContent();
// will print something like
// 0: <Ember.Object:ember893>
// 1: [object Object]
{% endhighlight %}

As you can see this works with plain Javascript Objects or full blown Ember Objects. If you want more informative logging, all you need to do is overriding the *toString* method in your Ember Models (i personally build a String consisting of the id and up to 3 important attributes).

#### Conclusion
With the snippets provided above you can inspect the controller backing one of your DOM elements with 1 line of code now:
{% highlight javascript %}
ec(479).logContent();
{% endhighlight %}

I hope you liked it and debugging got a little bit easier for you. Do you miss any important informations or links i should mention here? I would be happy to add them here.