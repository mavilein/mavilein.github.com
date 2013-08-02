---
layout: post
title: "Ember JS - Implement an After Render Event Hook for your jQuery logic for all Views"
description: "Ember JS - Implement an After Render Event Hook for your jQuery logic for all Views"
category: Javascript
tags: [emberjs, javascript]
---
{% include JB/setup %}

Welcome to my first blog post ever. This post is about EmberJS and the best way integrate jQuery logic into your custom views. Every now and then, i see this question being asked on Stack Overflow. You will quite often have the requirement that you want to perform some jQuery logic on the elements of a View after it has been rendered, e.g. you do something simple like highlighting or animating something. The question is how to do that in Ember? We will start with an easy implementation and refine it in two steps.

#### The naive implementation

The answer you will find very quickly by Googling or reading the Docs for [Ember.View](http://emberjs.com/api/classes/Ember.View.html) is that you should use the event hook called *didInsertElement*.

{% highlight javascript %}
App.YourView = Ember.View.extend({
  didInsertElement : function(){
    this._super();
    // perform your jQuery logic here
  }
});
{% endhighlight %}

This hook will work fine most of the time! But there is one **Problem!** 

This hook is guaranteed to be executed when the **root element** of this view **has been inserted into the DOM**. This means that the root element of the view is in the DOM, but it is not guaranteed that the template has been fully rendered. Most of the times the above will work, because as far as i have seen, the template associated with your View will always be rendered at this point. But it **can lead to problems when you are trying to access an element of a child view** of your view. This will likely happen if your performing some jQuery logic on a list of elements, where the logic is performed by the parent view of all elements. If this happens, you will likely be very irritated, because it used to work for the simple cases, right?

#### The improved implementation

To alleviate the problems mentioned above you will very often find something like the following on StackOverflow. The advice is to use the *afterRender* Queue of the **Ember Run Loop**. With this implementation you code will be run, when your view has been fully rendered (including its child views).

{% highlight javascript %}
App.YourView = Ember.View.extend({
  didInsertElement : function(){
    this._super();
    Ember.run.scheduleOnce('afterRender', this, function(){
    	// perform your jQuery logic here
    });
  }
});
{% endhighlight %}


**Problem:** You will need this piece of code quite often and it is annoying to copy-paste it everytime. I can't remember the right sequence of the parameters :-).

#### The best solution from my point of View

Wouldn't it be great to have **a hook like didInsertElement**, which is guaranteed to be executed when all the rendering stuff has happened? Thanks to the great Embers Object Model it is really easy to add this hook yourself to all of your Ember Views. We are using the method *reopen to extend the definition of a class/object* and add the hook i named 'afterRenderEvent'.

{% highlight javascript %}
Ember.View.reopen({
  didInsertElement : function(){
    this._super();
    Ember.run.scheduleOnce('afterRender', this, this.afterRenderEvent);
  },
  afterRenderEvent : function(){
    // implement this hook in your own subclasses and run your jQuery logic there
  }
});
{% endhighlight %}

In each of your Views, you can now use the hook *afterRenderEvent* and you do not have to think about the problems mentioned above. Feel free to ask questions and give your opinions in the comments :-)
